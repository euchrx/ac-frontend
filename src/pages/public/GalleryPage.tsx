import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { api } from "../../services/api";

type GalleryPhoto = {
  id: string;
  authorName: string;
  caption: string | null;
  createdAt: string;
};

const apiBase = String(api.defaults.baseURL).replace(/\/$/, "");

function ownerHeaders() {
  let token = localStorage.getItem("gallery_owner");
  if (!token) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("gallery_owner", token);
  }
  return { "x-gallery-owner": token };
}

function photoUrl(id: string) {
  return `${apiBase}/gallery/${id}/image`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [authorName, setAuthorName] = useState(() => localStorage.getItem("gallery_author") ?? "");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewer, setViewer] = useState<GalleryPhoto | null>(null);
  const [mobileTab, setMobileTab] = useState<"wall" | "upload" | "mine">("wall");
  const [myPhotos, setMyPhotos] = useState<GalleryPhoto[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) return;
    let active = true;
    void api.get("/admin/gallery/access").then(() => {
      if (active) setIsAdmin(true);
    }).catch(() => { /* Galeria pública continua disponível. */ });
    return () => { active = false; };
  }, []);
  const [wallPage, setWallPage] = useState(1);
  const [minePage, setMinePage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : ""),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const loadPhotos = useCallback(async (quiet = false) => {
    try {
      const { data } = await api.get<GalleryPhoto[]>("/gallery");
      setPhotos(data);
      const mine = await api.get<GalleryPhoto[]>("/gallery/mine", { headers: ownerHeaders() });
      setMyPhotos(mine.data);
      if (!quiet) setError("");
    } catch {
      if (!quiet) setError("Não foi possível carregar as fotos agora.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadPhotos(), 0);
    const timer = window.setInterval(() => void loadPhotos(true), 5000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadPhotos]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile || !authorName.trim()) {
      setError("Escolha uma foto e informe seu nome.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");
    const form = new FormData();
    form.append("photo", selectedFile);
    form.append("authorName", authorName.trim());
    form.append("caption", caption.trim());

    try {
      await api.post("/gallery", form, { headers: ownerHeaders() });
      localStorage.setItem("gallery_author", authorName.trim());
      setSelectedFile(null);
      setCaption("");
      if (fileInput.current) fileInput.current.value = "";
      setSuccess("Sua foto entrou no mural ✦");
      setMobileTab("wall");
      setWallPage(1);
      await loadPhotos(true);
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      setError(Array.isArray(message) ? message[0] : message || "Não foi possível publicar a foto.");
    } finally {
      setSending(false);
    }
  }

  async function deletePhoto(photo: GalleryPhoto) {
    if (!window.confirm("Apagar esta foto permanentemente do mural?")) return;
    setDeleting(true);
    try {
      if (isAdmin) await api.delete(`/admin/gallery/${photo.id}`);
      else await api.delete(`/gallery/${photo.id}`, { headers: ownerHeaders() });
      setViewer(null);
      setPhotos((items) => items.filter((item) => item.id !== photo.id));
      setMyPhotos((items) => items.filter((item) => item.id !== photo.id));
      setSuccess("Foto apagada do mural.");
    } catch {
      window.alert("Não foi possível apagar a foto. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  const visiblePhotos = mobileTab === "mine" ? myPhotos : photos;
  const totalPages = Math.max(1, Math.ceil(visiblePhotos.length / 50));
  const currentPage = Math.min(mobileTab === "mine" ? minePage : wallPage, totalPages);
  const pagePhotos = visiblePhotos.slice((currentPage - 1) * 50, currentPage * 50);

  function changePage(page: number) {
    if (mobileTab === "mine") setMinePage(page);
    else setWallPage(page);
    document.querySelector(".gallery-wall")?.scrollIntoView({ block: "start" });
  }

  return (
    <main className={`gallery-page gallery-tab-${mobileTab}`}>
      <div className="gallery-admin-access">
        {isAdmin ? <><span>Administração · você pode apagar qualquer foto</span><button onClick={() => { localStorage.removeItem("admin_token"); setIsAdmin(false); }}>Sair</button></> : <a href="/admin/login?returnTo=/galeria">Acesso administrativo</a>}
      </div>
      <header className="gallery-app-header">
        <a href="/" aria-label="Voltar ao convite" className="gallery-app-mark">AC</a>
        <div><strong>Ana Clara</strong><span>Memórias dos 15</span></div>
        <span className="gallery-app-live"><i /> Ao vivo</span>
      </header>
      <header className="gallery-hero">
        <a href="/" className="gallery-back" aria-label="Voltar ao convite">AC</a>
        <div>
          <span className="gallery-kicker">15 anos da Ana Clara</span>
          <h1>Nossa noite,<br /><em>pelos seus olhos.</em></h1>
          <p>Registre um instante da festa e ajude a construir esta memória com a gente.</p>
        </div>
        <button className="gallery-cta" onClick={() => fileInput.current?.click()}>
          <span>＋</span> Adicionar foto
        </button>
      </header>

      <section className="gallery-upload" aria-label="Publicar foto">
        <div className="gallery-app-compose-heading"><span>UM INSTANTE, PARA SEMPRE</span><h2>Compartilhe sua noite</h2><p>Escolha sua foto favorita e faça parte dessa memória.</p></div>
        <form onSubmit={publish}>
          <button
            type="button"
            className={`gallery-picker${preview ? " has-preview" : ""}`}
            onClick={() => fileInput.current?.click()}
          >
            {preview ? <img src={preview} alt="Prévia da foto" /> : (
              <span><strong>Toque para escolher</strong><small>JPG, PNG ou WebP · até 8 MB</small></span>
            )}
          </button>
          <input
            ref={fileInput}
            className="gallery-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <div className="gallery-fields">
            <label>Seu nome<input value={authorName} maxLength={60} onChange={(e) => setAuthorName(e.target.value)} placeholder="Como quer aparecer?" /></label>
            <label>Legenda <span>opcional</span><input value={caption} maxLength={180} onChange={(e) => setCaption(e.target.value)} placeholder="Conte um pouco sobre esse momento" /></label>
            <button type="submit" disabled={sending || !selectedFile || !authorName.trim()}>{sending ? "Publicando…" : "Publicar no mural"}</button>
          </div>
        </form>
        {error && <p className="gallery-message error" role="alert">{error}</p>}
        {success && <p className="gallery-message success">{success}</p>}
      </section>

      <section className="gallery-wall">
        {success && <p className="gallery-app-notice" role="status">{success}</p>}
        {error && mobileTab === "wall" && <p className="gallery-app-notice" role="alert">{error}</p>}
        <div className="gallery-wall-heading">
          <div><span>{mobileTab === "mine" ? "Seus registros" : "Mural ao vivo"}</span><h2>{mobileTab === "mine" ? "Minhas fotos" : "Momentos da noite"}</h2></div>
          <p><i /> {visiblePhotos.length} {visiblePhotos.length === 1 ? "registro" : "registros"}</p>
        </div>

        {mobileTab === "mine" && <p className="gallery-owner-note">Fotos publicadas neste navegador. Toque em uma foto para abrir e apagar.</p>}
        {loading ? <div className="gallery-status">Revelando momentos…</div> : visiblePhotos.length === 0 ? (
          <div className="gallery-empty"><span>✦</span><h3>{mobileTab === "mine" ? "Você ainda não publicou fotos aqui." : "O primeiro registro pode ser seu."}</h3><p>As fotos publicadas durante a festa aparecerão aqui.</p></div>
        ) : (
          <div className="gallery-grid">
            {pagePhotos.map((photo, index) => (
              <button className="gallery-photo" key={photo.id} onClick={() => setViewer(photo)} style={{ "--delay": `${Math.min(index, 12) * 45}ms` } as React.CSSProperties}>
                <img src={photoUrl(photo.id)} alt={photo.caption || `Foto publicada por ${photo.authorName}`} loading="lazy" />
                <span className="gallery-photo-info"><strong>{photo.authorName}</strong>{photo.caption && <small>{photo.caption}</small>}<time>{formatDate(photo.createdAt)}</time></span>
              </button>
            ))}
          </div>
        )}
      </section>

      {mobileTab !== "upload" && totalPages > 1 && <nav className="gallery-pagination" aria-label="Páginas de fotos">
        <button disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>← Anterior</button>
        <span aria-live="polite">Página {currentPage} de {totalPages}</span>
        <button disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}>Próxima →</button>
      </nav>}

      <nav className="gallery-app-nav" aria-label="Navegação da galeria">
        <button aria-current={mobileTab === "wall" ? "page" : undefined} onClick={() => { setMobileTab("wall"); window.scrollTo({ top: 0 }); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg><span>Mural</span>
        </button>
        <button aria-current={mobileTab === "upload" ? "page" : undefined} onClick={() => { setMobileTab("upload"); window.scrollTo({ top: 0 }); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l2-2h4l2 2h4a1 1 0 011 1v14H3V6a1 1 0 011-1z" /><circle cx="12" cy="12" r="4" /></svg><span>Publicar foto</span>
        </button>
        <button aria-current={mobileTab === "mine" ? "page" : undefined} onClick={() => { setMobileTab("mine"); window.scrollTo({ top: 0 }); }}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0116 0v2" /></svg><span>Minhas fotos</span></button>
      </nav>

      {viewer && <div className="gallery-lightbox" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
        <button className="gallery-lightbox-close" onClick={() => setViewer(null)} aria-label="Fechar">×</button>
        <div onClick={(e) => e.stopPropagation()}>
          <img src={photoUrl(viewer.id)} alt={viewer.caption || `Foto de ${viewer.authorName}`} />
          <footer><strong>{viewer.authorName}</strong>{viewer.caption && <p>{viewer.caption}</p>}<time>{formatDate(viewer.createdAt)}</time>{(isAdmin || myPhotos.some((photo) => photo.id === viewer.id)) && <button className="danger-button" disabled={deleting} onClick={() => void deletePhoto(viewer)}>{deleting ? "Apagando…" : "Apagar foto"}</button>}</footer>
        </div>
      </div>}
    </main>
  );
}
