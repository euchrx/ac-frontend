import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { GalleryImage, GalleryLoading } from "./GalleryLoading";

import { api } from "../../services/api";
import { Toast } from "../../components/Toast";
import "./gallery-controls.css";
import "./gallery-desktop.css";
import "./gallery-simple.css";
import { GalleryDownload } from './GalleryDownload';

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
  const [pendingImages, setPendingImages] = useState(0);
  const trackImageLoading = useCallback((busy: boolean) => {
    setPendingImages((count) => Math.max(0, count + (busy ? 1 : -1)));
  }, []);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [authorName, setAuthorName] = useState(() => localStorage.getItem("gallery_author") ?? "");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; kind: "success" | "error" } | null>(null);
  const toastId = useRef(0);
  const closeToast = useCallback(() => setToast(null), []);
  const setError = useCallback((message: string) => {
    if (message) setToast({ id: ++toastId.current, message, kind: "error" });
  }, []);
  const setSuccess = useCallback((message: string) => {
    if (message) setToast({ id: ++toastId.current, message, kind: "success" });
  }, []);
  const [viewer, setViewer] = useState<GalleryPhoto | null>(null);
  useEffect(() => {
    if (!viewer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewer(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [viewer]);
  const [mobileTab, setMobileTab] = useState<"wall" | "mine">("wall");
  const [myPhotos, setMyPhotos] = useState<GalleryPhoto[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function deleteSelected() {
    const ids = selectedIds.filter((id) => myPhotos.some((photo) => photo.id === id));
    if (!ids.length || !window.confirm(`Apagar permanentemente ${ids.length} foto(s) da galeria?`)) return;
    setDeleting(true);
    const deleted: string[] = [];
    const failed: string[] = [];
    try {
      const headers = ownerHeaders();
      for (const id of ids) {
        try {
          await api.delete(`/gallery/${id}`, { headers });
          deleted.push(id);
        } catch {
          failed.push(id);
        }
      }
      setPhotos((items) => items.filter((photo) => !deleted.includes(photo.id)));
      setMyPhotos((items) => items.filter((photo) => !deleted.includes(photo.id)));
      setSelectedIds(failed);
      if (!failed.length) setSelecting(false);
      if (failed.length) setError(`${deleted.length} foto(s) apagada(s). ${failed.length} não foram apagadas; tente novamente.`);
      else setSuccess(`${deleted.length} foto(s) apagada(s) da galeria.`);
    } catch {
      setError("Não foi possível apagar as fotos. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }
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
    if (!quiet) { setLoading(true); setLoadFailed(false); }
    try {
      const { data } = await api.get<GalleryPhoto[]>("/gallery", { timeout: 20000 });
      setPhotos(data);
      const mine = await api.get<GalleryPhoto[]>("/gallery/mine", { headers: ownerHeaders(), timeout: 20000 });
      setMyPhotos(mine.data);
      if (!quiet) setError("");
    } catch {
      if (!quiet) { setLoadFailed(true); setError("Não foi possível carregar as fotos agora."); }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [setError]);

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
    if (sending || !previewReady) return;
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
      await api.post("/gallery", form, { headers: ownerHeaders(), timeout: 60000 });
      localStorage.setItem("gallery_author", authorName.trim());
      setSelectedFile(null);
      setCaption("");
      if (fileInput.current) fileInput.current.value = "";
      setSuccess("Sua foto entrou na galeria ✦");
      setMobileTab("mine");
      setMinePage(1);
      await loadPhotos(true);
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      setError(Array.isArray(message) ? message[0] : message || "Não foi possível publicar a foto.");
    } finally {
      setSending(false);
    }
  }

  async function deletePhoto(photo: GalleryPhoto) {
    if (!window.confirm("Apagar esta foto permanentemente da galeria?")) return;
    setDeleting(true);
    try {
      if (isAdmin) await api.delete(`/admin/gallery/${photo.id}`, { timeout: 20000 });
      else await api.delete(`/gallery/${photo.id}`, { headers: ownerHeaders(), timeout: 20000 });
      setViewer(null);
      setPhotos((items) => items.filter((item) => item.id !== photo.id));
      setMyPhotos((items) => items.filter((item) => item.id !== photo.id));
      setSuccess("Foto apagada da galeria.");
    } catch {
      setError("Não foi possível apagar a foto. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  const composing = mobileTab === "mine" && selectedFile !== null;
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
    <main className={`gallery-page gallery-tab-${mobileTab}${isAdmin ? "" : " gallery-visitor"}`}
      onContextMenu={(event) => {
        if (!isAdmin && !(event.target instanceof Element && event.target.closest("input, textarea"))) event.preventDefault();
      }}
      onDragStart={(event) => { if (!isAdmin) event.preventDefault(); }}>

      {(loading || pendingImages > 0 || sending || deleting) && <div className="gallery-busy-screen" aria-busy="true"><span className="gallery-loading-monogram" aria-hidden="true">AC</span><GalleryLoading label={sending ? "Publicando foto…" : deleting ? "Apagando fotos…" : "Carregando galeria…"} /></div>}
      {toast && <Toast key={toast.id} message={toast.message} kind={toast.kind} onClose={closeToast} />}
      {isAdmin && <div className="gallery-admin-access">
        <span>Acesso administrativo</span>
        <button type="button" onClick={() => {
          localStorage.removeItem("admin_token");
          setIsAdmin(false);
          
        }}>Sair</button>
      </div>}
      <header className="gallery-hero">
        <span className="gallery-back" aria-hidden="true">AC</span>
        <div>
          <span className="gallery-kicker">15 anos da Ana Clara</span>
          <h1>Nossa noite,<br /><em>pelos seus olhos.</em></h1>
          <p>Registre um instante da festa e ajude a construir esta memória com a gente.</p>
        </div>
      </header>
      <input ref={fileInput} className="gallery-file-input" type="file"
        accept="image/jpeg,image/png,image/webp" capture="environment"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("Use uma foto JPG, PNG ou WebP."); return;
          }
          if (file.size > 8 * 1024 * 1024) {
            setError("A foto deve ter até 8 MB. Tente uma resolução menor."); return;
          }
          setPreviewReady(false);
          setSelectedFile(file);
          setMobileTab("mine");
          setSelecting(false);
          window.setTimeout(() => document.querySelector(".gallery-upload")?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
        }} />

      <section className="gallery-wall">
        <div className="gallery-wall-heading">
          <div><span>{mobileTab === "mine" ? "Seus registros" : "Galeria ao vivo · Ana Clara XV"}</span><h2>{mobileTab === "mine" ? "Minhas fotos" : "Galeria"}</h2><p className="gallery-editorial-copy">{mobileTab === "mine" ? "Suas fotos publicadas neste dispositivo." : "Os momentos da festa, pelos olhos de todos."}</p></div>
          {mobileTab === "wall" && <p className="gallery-record-count"><strong>{visiblePhotos.length}</strong><span>{visiblePhotos.length === 1 ? "registro" : "registros"}</span></p>}
        </div>

        {mobileTab === "mine" && !composing && <div className="gallery-add-action gallery-desktop-add">
          <button className="gallery-cta" disabled={sending} onClick={() => fileInput.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l2-2h4l2 2h4a1 1 0 011 1v14H3V6a1 1 0 011-1z" /><circle cx="12" cy="12" r="4" /></svg>
            Adicionar fotos
          </button>
          <p>Tire uma foto e depois adicione seu nome.</p>
        </div>}
        {mobileTab === "mine" && selectedFile && <section className="gallery-upload" aria-label="Publicar foto">
          <h3>Sua foto está pronta</h3>
          <p>Confira a foto e complete os detalhes para publicar.</p>
          <form onSubmit={publish} aria-busy={sending}>
            <GalleryImage onLoadingChange={trackImageLoading} className="gallery-capture-preview" src={preview} alt="Prévia da foto que será publicada" eager onReady={() => setPreviewReady(true)} />
            <div className="gallery-fields">
              <label>Seu nome<input required autoComplete="name" disabled={sending} value={authorName} maxLength={60} onChange={(e) => setAuthorName(e.target.value)} placeholder="Como você se chama?" /></label>
              <label>Legenda <span>opcional</span><input disabled={sending} value={caption} maxLength={180} onChange={(e) => setCaption(e.target.value)} placeholder="Escreva sobre esse momento" /></label>
              <div className="gallery-compose-actions">
                <button className="gallery-cancel" type="button" disabled={sending} onClick={() => { setSelectedFile(null); setCaption(""); }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg><span>Descartar</span>
                </button>
                <button className="gallery-cancel" type="button" disabled={sending} onClick={() => fileInput.current?.click()}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l2-2h4l2 2h4a1 1 0 011 1v14H3V6a1 1 0 011-1z" /><circle cx="12" cy="12" r="4" /></svg><span>Tirar outra foto</span>
                </button>
                <button type="submit" disabled={sending || !previewReady || !authorName.trim()}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg><span>{sending ? "Publicando…" : "Publicar"}</span>
                </button>
              </div>
            </div>
          </form>
        </section>}

        {!composing && mobileTab === "mine" && myPhotos.length > 0 && <div className="gallery-selection-toolbar">
          <button disabled={deleting} onClick={() => { setSelecting(!selecting); setSelectedIds([]); }}>{selecting ? "Cancelar seleção" : "Selecionar fotos"}</button>
          {selecting && <>
            <button disabled={deleting} onClick={() => {
              const ids = pagePhotos.map((photo) => photo.id);
              setSelectedIds((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
            }}>{pagePhotos.every((photo) => selectedIds.includes(photo.id)) ? "Desmarcar página" : "Selecionar página"}</button>
            <span role="status">{selectedIds.length} selecionada(s)</span>
            <button className="gallery-delete-selected" disabled={deleting || !selectedIds.length} onClick={() => void deleteSelected()}>{deleting ? "Apagando…" : `Apagar (${selectedIds.length})`}</button>
          </>}
        </div>}

        {!composing && (loading ? null : loadFailed ? <div className="gallery-status"><p>Não foi possível carregar as fotos.</p><button onClick={() => void loadPhotos()}>Tentar novamente</button></div> : visiblePhotos.length === 0 ? (
          <div className="gallery-empty"><p className="gallery-mobile-empty">Nenhuma foto publicada.</p><span>✦</span><h3>{mobileTab === "mine" ? "Você ainda não publicou fotos aqui." : "O primeiro registro pode ser seu."}</h3><p>{mobileTab === "mine" ? "Toque em Adicionar fotos para registrar seu primeiro momento." : "As fotos publicadas durante a festa aparecerão aqui."}</p></div>
        ) : (
          <div className="gallery-grid">
            {pagePhotos.map((photo, index) => (
              <button className={`gallery-photo${mobileTab === "wall" && index === 0 ? " gallery-photo-featured" : ""}${mobileTab === "mine" && selecting && selectedIds.includes(photo.id) ? " gallery-photo-selected" : ""}`} key={photo.id} disabled={deleting} aria-pressed={mobileTab === "mine" && selecting ? selectedIds.includes(photo.id) : undefined} aria-label={mobileTab === "mine" && selecting ? `${selectedIds.includes(photo.id) ? "Desmarcar" : "Selecionar"} foto de ${photo.authorName}${photo.caption ? `: ${photo.caption}` : ""}` : undefined} onClick={() => {
                if (mobileTab === "mine" && selecting) setSelectedIds((ids) => ids.includes(photo.id) ? ids.filter((id) => id !== photo.id) : [...ids, photo.id]);
                else setViewer(photo);
              }} style={{ "--delay": `${Math.min(index, 12) * 45}ms` } as React.CSSProperties}>
                {mobileTab === "mine" && selecting && <span className="gallery-selection-check" aria-hidden="true">{selectedIds.includes(photo.id) ? "✓" : ""}</span>}
                {mobileTab === "wall" && index === 0 && <span className="gallery-featured-label">{currentPage === 1 ? "Último instante" : "Do nosso álbum"}</span>}
                <GalleryImage onLoadingChange={trackImageLoading} src={photoUrl(photo.id)} alt={photo.caption || `Foto publicada por ${photo.authorName}`} eager />
                <span className="gallery-photo-info"><strong>{photo.authorName}</strong>{photo.caption && <small>{photo.caption}</small>}<time>{formatDate(photo.createdAt)}</time></span>
              </button>
            ))}
          </div>
        ))}
      </section>

      {!composing && totalPages > 1 && <nav className="gallery-pagination" aria-label="Páginas de fotos">
        <button disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>← Anterior</button>
        <span aria-live="polite">Página {currentPage} de {totalPages}</span>
        <button disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}>Próxima →</button>
      </nav>}

      <nav className="gallery-app-nav" aria-label="Navegação da galeria">
        <button aria-current={mobileTab === "wall" ? "page" : undefined} onClick={() => {  setMobileTab("wall"); window.scrollTo({ top: 0 }); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg><span>Galeria</span>
        </button>
        <button className="gallery-nav-capture" type="button" disabled={sending || deleting} aria-label="Adicionar fotos" onClick={() => fileInput.current?.click()}>
          <span className="gallery-nav-capture-disc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l2-2h4l2 2h4a1 1 0 011 1v14H3V6a1 1 0 011-1z" /><circle cx="12" cy="12" r="4" /></svg></span>
          <span>Adicionar</span>
        </button>
        <button aria-current={mobileTab === "mine" ? "page" : undefined} onClick={() => {  setMobileTab("mine"); window.scrollTo({ top: 0 }); }}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0116 0v2" /></svg><span>Minhas fotos</span></button>

      </nav>

      {isAdmin && mobileTab === "wall" && <details className="gallery-admin-download">
        <summary>Baixar álbum · Administração</summary>
        <GalleryDownload count={photos.length} notify={(message, error) => error ? setError(message) : setSuccess(message)} />
      </details>}

      {viewer && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Detalhes da foto" onClick={() => setViewer(null)}>
        <button className="gallery-lightbox-close" onClick={() => setViewer(null)} aria-label="Fechar">×</button>
        <div onClick={(e) => e.stopPropagation()}>
          <GalleryImage onLoadingChange={trackImageLoading} src={photoUrl(viewer.id)} alt={viewer.caption || `Foto de ${viewer.authorName}`} eager />
          <footer><strong>{viewer.authorName}</strong>{viewer.caption && <p>{viewer.caption}</p>}<time>{formatDate(viewer.createdAt)}</time>{(isAdmin || myPhotos.some((photo) => photo.id === viewer.id)) && <button className="danger-button" disabled={deleting} onClick={() => void deletePhoto(viewer)}>{deleting ? "Apagando…" : "Apagar foto"}</button>}</footer>
        </div>
      </div>}
    </main>
  );
}
