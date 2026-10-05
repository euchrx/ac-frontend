import { GalleryLoading } from "./GalleryLoading";
import { useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../../services/api';

export function GalleryDownload({ count, notify }: {
  count: number;
  notify: (message: string, error?: boolean) => void;
}) {
  const [preparing, setPreparing] = useState(false);
  const [requested, setRequested] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const ticketField = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  async function download() {
    if (busy.current) return;
    busy.current = true;
    setPreparing(true);
    try {
      const { data } = await api.post<{ ticket: string }>('/admin/gallery/export-ticket', undefined, { timeout: 20000 });
      if (!ticketField.current || !form.current) return;
      ticketField.current.value = data.ticket;
      form.current.submit();
      ticketField.current.value = '';
      setRequested(true);
      notify('Download solicitado. Acompanhe o ZIP nos downloads do navegador.');
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      notify(status === 401 ? 'Sua sessão expirou. Entre novamente pelo painel administrativo.' : status === 404 ? 'Não foi possível iniciar o download. Verifique se há fotos e se o backend está atualizado.' : 'Não foi possível iniciar o download. Tente novamente.', true);
    } finally {
      busy.current = false;
      setPreparing(false);
    }
  }

  return <section className="gallery-download-panel" aria-label="Baixar álbum">
    <span className="gallery-download-kicker">SEU ÁLBUM, PARA GUARDAR</span>
    <h2>Leve a noite<br /><em>com você.</em></h2>
    <p>Todos os olhares, todos os momentos. Baixe as fotos da galeria em um único arquivo ZIP.</p>
    <div className="gallery-download-card">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg>
      <div><strong>Álbum completo</strong><span>{count} {count === 1 ? 'foto disponível' : 'fotos disponíveis'} · arquivos originais</span></div>
    </div>
    <ul><li>Inclui todas as páginas da galeria.</li><li>Fotos organizadas por data, com o nome de quem publicou.</li><li>O download não apaga as fotos da galeria.</li></ul>
    <button type="button" disabled={preparing || count === 0} onClick={() => void download()}>{preparing ? <GalleryLoading label="Preparando download…" /> : 'Baixar todas as fotos em ZIP'}</button>
    <p className="gallery-download-note" role="status">{requested ? 'Confira o andamento no gerenciador de downloads do navegador. Se houver falha ou interrupção, solicite um novo ZIP.' : 'O álbum inclui as fotos disponíveis no início do download. Álbuns grandes podem levar alguns minutos.'}</p>
    <iframe name="gallery-zip-download" title="Download do álbum" hidden />
    <form ref={form} hidden method="POST" target="gallery-zip-download" action={`${String(api.defaults.baseURL).replace(/\/$/, '')}/gallery/export`}>
      <input ref={ticketField} type="hidden" name="ticket" />
    </form>
  </section>;
}
