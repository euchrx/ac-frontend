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
      await api.post("/gallery", form);
      localStorage.setItem("gallery_author", authorName.trim());
      setSelectedFile(null);
      setCaption("");
      if (fileInput.current) fileInput.current.value = "";
      setSuccess("Sua foto entrou no mural ✦");
      await loadPhotos(true);
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      setError(Array.isArray(message) ? message[0] : message || "Não foi possível publicar a foto.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="gallery-page">
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
        <div className="gallery-wall-heading">
          <div><span>Mural ao vivo</span><h2>Momentos da noite</h2></div>
          <p><i /> {photos.length} {photos.length === 1 ? "registro" : "registros"}</p>
        </div>

        {loading ? <div className="gallery-status">Revelando momentos…</div> : photos.length === 0 ? (
          <div className="gallery-empty"><span>✦</span><h3>O primeiro registro pode ser seu.</h3><p>As fotos publicadas durante a festa aparecerão aqui.</p></div>
        ) : (
          <div className="gallery-grid">
            {photos.map((photo, index) => (
              <button className="gallery-photo" key={photo.id} onClick={() => setViewer(photo)} style={{ "--delay": `${Math.min(index, 12) * 45}ms` } as React.CSSProperties}>
                <img src={photoUrl(photo.id)} alt={photo.caption || `Foto publicada por ${photo.authorName}`} loading="lazy" />
                <span className="gallery-photo-info"><strong>{photo.authorName}</strong>{photo.caption && <small>{photo.caption}</small>}<time>{formatDate(photo.createdAt)}</time></span>
              </button>
            ))}
          </div>
        )}
      </section>

      {viewer && <div className="gallery-lightbox" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
        <button className="gallery-lightbox-close" onClick={() => setViewer(null)} aria-label="Fechar">×</button>
        <div onClick={(e) => e.stopPropagation()}>
          <img src={photoUrl(viewer.id)} alt={viewer.caption || `Foto de ${viewer.authorName}`} />
          <footer><strong>{viewer.authorName}</strong>{viewer.caption && <p>{viewer.caption}</p>}<time>{formatDate(viewer.createdAt)}</time></footer>
        </div>
      </div>}
    </main>
  );
}
