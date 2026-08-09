import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  accessGuest,
  chooseCompanionGift,
  chooseGift,
  getCompanionMe,
  getGifts,
  getGuestMe,
  removeCompanionGiftChoice,
  removeGiftChoice,
  updateAttendance,
  updateCompanions,
  type AttendanceStatus,
  type CompanionSession,
  type Gift,
  type Guest,
} from "../../services/guest";

type AnsweredAttendance = Exclude<AttendanceStatus, "PENDING">;
type CompanionDraft = { name: string; phone: string };

const attendanceOptions: Array<{
  value: AnsweredAttendance;
  label: string;
  description: string;
}> = [
  { value: "CONFIRMED", label: "Sim, estarei presente", description: "Presença confirmada para a celebração." },
  { value: "MAYBE", label: "Ainda não tenho certeza", description: "Você poderá atualizar sua resposta depois." },
  { value: "NOT_GOING", label: "Não poderei comparecer", description: "Sentiremos sua falta nesta noite." },
];

const RSVP_DEADLINE = new Date("2026-10-08T23:59:59-03:00");
const isRsvpClosed = () => Date.now() > RSVP_DEADLINE.getTime();

export function GuestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [companion, setCompanion] = useState<CompanionSession | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companions, setCompanions] = useState<CompanionDraft[]>([]);
  const [newCompanion, setNewCompanion] = useState<CompanionDraft>({ name: "", phone: "" });
  const [companionModalOpen, setCompanionModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AnsweredAttendance | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const rsvpClosed = isRsvpClosed();

  const selectedGiftIds = useMemo(
    () => new Set(guest?.giftIds ?? companion?.giftIds ?? []),
    [guest, companion],
  );
  const orderedGifts = useMemo(
    () => [...gifts].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "pt-BR")),
    [gifts],
  );

  useEffect(() => {
    async function restoreSession() {
      try {
        setGifts(await getGifts());
        if (!localStorage.getItem("guest_token")) return;

        try {
          const data = await getGuestMe();
          setGuest(data);
          setSelectedAttendance(data.attendance === "PENDING" ? null : data.attendance);
          setCompanions(data.companions.map((item) => ({ name: item.name, phone: item.phone ?? "" })));
        } catch {
          const data = await getCompanionMe();
          setCompanion(data);
          if (!window.location.pathname.endsWith("/presentes")) navigate("/convidado/presentes", { replace: true });
        }
      } catch {
        localStorage.removeItem("guest_token");
      } finally {
        setInitialLoading(false);
      }
    }
    void restoreSession();
  }, [navigate]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function handleAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const response = await accessGuest(name, phone);
      localStorage.setItem("guest_token", response.accessToken);
      if (response.role === "companion" && response.companion) {
        setCompanion(response.companion);
        navigate("/convidado/presentes", { replace: true });
      } else if (response.guest) {
        setGuest(response.guest);
        setSelectedAttendance(response.guest.attendance === "PENDING" ? null : response.guest.attendance);
        setCompanions(response.guest.companions.map((item) => ({ name: item.name, phone: item.phone ?? "" })));
        navigate("/convidado/presenca", { replace: true });
      }
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.message : null;
      setError(Array.isArray(detail) ? detail.join(" ") : String(detail || "Não foi possível acessar sua área."));
    } finally {
      setLoading(false);
    }
  }

  async function saveAttendance() {
    if (!guest || !selectedAttendance) return;
    clearFeedback();
    try {
      const updated = await updateAttendance(selectedAttendance);
      setGuest(updated);
      setSelectedAttendance(updated.attendance === "PENDING" ? null : updated.attendance);
      setMessage("Resposta salva com sucesso.");
    } catch {
      setError("Não foi possível salvar sua resposta.");
    }
  }

  async function persistCompanions(next: CompanionDraft[]) {
    clearFeedback();
    try {
      const updated = await updateCompanions(next);
      const saved = updated.companions.map((item) => ({ name: item.name, phone: item.phone ?? "" }));
      setGuest(updated);
      setCompanions(saved);
      setMessage("Acompanhantes atualizados.");
      return true;
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.message : null;
      setError(Array.isArray(detail) ? detail.join(" ") : String(detail || "Não foi possível salvar os acompanhantes."));
      return false;
    }
  }

  async function addCompanion() {
    const firstName = newCompanion.name.trim().split(/\s+/)[0];
    const companionPhone = newCompanion.phone.trim();
    if (!firstName || !companionPhone) {
      setError("Informe o primeiro nome e o WhatsApp do acompanhante.");
      return;
    }
    const next = [...companions, { name: firstName, phone: companionPhone }];
    if (await persistCompanions(next)) {
      setNewCompanion({ name: "", phone: "" });
      setCompanionModalOpen(false);
    }
  }

  async function toggleGift(giftId: string) {
    clearFeedback();
    try {
      const selected = selectedGiftIds.has(giftId);
      if (companion) {
        if (selected) await removeCompanionGiftChoice(giftId); else await chooseCompanionGift(giftId);
        setCompanion({ ...companion, giftIds: selected ? companion.giftIds.filter((id) => id !== giftId) : [...companion.giftIds, giftId] });
      } else if (guest) {
        if (selected) await removeGiftChoice(giftId); else await chooseGift(giftId);
        setGuest({ ...guest, giftIds: selected ? guest.giftIds.filter((id) => id !== giftId) : [...guest.giftIds, giftId] });
      }
      setMessage("Escolhas atualizadas.");
    } catch {
      setError("Não foi possível atualizar este presente.");
    }
  }

  function logout() {
    localStorage.removeItem("guest_token");
    setGuest(null);
    setCompanion(null);
    setName("");
    setPhone("");
    setCompanions([]);
    setSelectedAttendance(null);
    clearFeedback();
    navigate("/convidado", { replace: true });
  }

  if (initialLoading) {
    return <main className="guest-v2-loading"><span /><p>Preparando sua experiência</p></main>;
  }

  if (!guest && !companion) {
    return (
      <main className="guest-v2-login">
        <section className="guest-v2-login-intro">
          <span className="guest-v2-kicker">Ana Clara · XV</span>
          <h1>Sua presença faz parte desta história.</h1>
          <p>Confirme sua presença, organize acompanhantes e conheça a lista de presentes.</p>
          <div className="guest-v2-date"><strong>23</strong><span>Outubro<br />2026</span></div>
        </section>
        <section className="guest-v2-login-card">
          <span className="guest-v2-card-index">01</span>
          <div><span className="guest-v2-kicker">Acesso reservado</span><h2>Bem-vindo</h2><p>Titulares usam nome completo. Acompanhantes usam primeiro nome.</p></div>
          <form onSubmit={handleAccess}>
            <label><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como está no convite" autoComplete="name" required /></label>
            <label><span>WhatsApp</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(41) 99999-9999" autoComplete="tel" required /></label>
            {error && <div className="guest-v2-alert error">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}<span>→</span></button>
          </form>
        </section>
      </main>
    );
  }

  const page = location.pathname.split("/").filter(Boolean).at(-1);
  const isCompanion = Boolean(companion);
  const accountName = companion?.name ?? guest?.name ?? "";

  return (
    <main className="guest-v2-shell">
      <header className="guest-v2-header">
        <div><span className="guest-v2-kicker">Ana Clara · 15 anos</span><h1>Olá, {accountName}</h1><p>{companion ? `Convidado(a) de ${companion.invitedBy.name}` : "Sua área do convite"}</p></div>
        <button onClick={logout}>Sair</button>
      </header>

      <nav className="guest-v2-nav" aria-label="Área do convidado">
        {!isCompanion && <NavLink to="/convidado/presenca"><span>01</span>Presença</NavLink>}
        {!isCompanion && <NavLink to="/convidado/acompanhantes"><span>02</span>Acompanhantes</NavLink>}
        <NavLink to="/convidado/presentes"><span>{isCompanion ? "01" : "03"}</span>Presentes</NavLink>
      </nav>

      {(error || message) && <div className={`guest-v2-alert ${error ? "error" : "success"}`}>{error || message}</div>}

      <div className="guest-v2-content">
        {!isCompanion && (page === "presenca" || page === "convidado") && guest && (
          <section className="guest-v2-page guest-v2-attendance">
            <div className="guest-v2-page-heading"><span>01</span><div><small>Confirmação</small><h2>Você estará presente?</h2><p>Selecione uma resposta e salve. Você poderá alterá-la até 8 de outubro.</p></div></div>
            {rsvpClosed && <div className="guest-v2-deadline">O prazo de confirmação foi encerrado.</div>}
            <div className="guest-v2-choice-grid">
              {attendanceOptions.map((option) => {
                const active = selectedAttendance === option.value;
                return <button key={option.value} className={active ? "active" : ""} aria-pressed={active} onClick={() => setSelectedAttendance(option.value)} disabled={rsvpClosed}><i /><strong>{option.label}</strong><small>{option.description}</small></button>;
              })}
            </div>
            <div className="guest-v2-action"><button onClick={() => void saveAttendance()} disabled={rsvpClosed || !selectedAttendance || selectedAttendance === guest.attendance}>Salvar resposta</button></div>
          </section>
        )}

        {!isCompanion && page === "acompanhantes" && (
          <section className="guest-v2-page guest-v2-companions-page">
            <div className="guest-v2-page-heading guest-v2-companions-heading"><span>02</span><div><small>Seus convidados</small><h2>Acompanhantes</h2><p>Cadastre primeiro nome e WhatsApp para criar o acesso individual.</p></div><button onClick={() => setCompanionModalOpen(true)} disabled={rsvpClosed}>Adicionar <span>+</span></button></div>
            <div className="guest-v2-companion-layout">
              <div className="guest-v2-roster">
                <div className="guest-v2-companion-list">
              {companions.length === 0 && <div className="guest-v2-empty">Nenhum acompanhante cadastrado.</div>}
              {companions.map((item, index) => <article key={`${item.phone}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.name}</strong>{item.phone ? <small>{item.phone}</small> : <input type="tel" value={item.phone} placeholder="Informe o WhatsApp" onChange={(event) => setCompanions((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, phone: event.target.value } : entry))} />}</div><button onClick={() => void persistCompanions(companions.filter((_, itemIndex) => itemIndex !== index))}>Remover</button></article>)}
                </div>
              </div>
            </div>
            {companionModalOpen && createPortal(
              <div className="guest-v2-modal-backdrop" onMouseDown={() => setCompanionModalOpen(false)}>
                <div className="guest-v2-modal" role="dialog" aria-modal="true" aria-labelledby="companion-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="guest-v2-modal-header"><div><small>Novo acesso</small><h3 id="companion-modal-title">Adicionar acompanhante</h3><p>Ele poderá entrar com o primeiro nome e WhatsApp.</p></div><button aria-label="Fechar" onClick={() => setCompanionModalOpen(false)}>×</button></div>
                  <div className="guest-v2-companion-form"><label><span>Primeiro nome</span><input autoFocus value={newCompanion.name} onChange={(event) => setNewCompanion({ ...newCompanion, name: event.target.value })} placeholder="Ex.: Maria" /></label><label><span>WhatsApp</span><input type="tel" value={newCompanion.phone} onChange={(event) => setNewCompanion({ ...newCompanion, phone: event.target.value })} placeholder="(41) 99999-9999" /></label><button onClick={() => void addCompanion()}>Salvar acompanhantes <span>→</span></button></div>
                </div>
              </div>,
              document.body,
            )}
          </section>
        )}

        {page === "presentes" && (
          <section className="guest-v2-page guest-v2-gifts-page">
            <div className="guest-v2-gifts-heading"><div><small>Lista de desejos · {orderedGifts.length} sugestões</small><h2>Escolha com carinho.</h2><p>Marque suas intenções. Nada fica bloqueado para os outros convidados.</p></div><div className="guest-v2-selection-count"><strong>{String(selectedGiftIds.size).padStart(2, "0")}</strong><span>selecionados</span></div></div>
            {companion && <div className="guest-v2-hierarchy"><span>Acesso de acompanhante</span><strong>Você foi convidado(a) por {companion.invitedBy.name}</strong><small>Nesta área, você pode apenas escolher presentes.</small></div>}
            <div className="guest-v2-gifts">
              {orderedGifts.map((gift, index) => { const selected = selectedGiftIds.has(gift.id); return <article key={gift.id} className={selected ? "selected" : ""}><div className="guest-v2-gift-number">{String(index + 1).padStart(2, "0")}</div><div className="guest-v2-gift-copy"><small>{gift.type === "MONEY" ? "Contribuição" : "Presente físico"}</small><h3>{gift.title}</h3>{gift.description && <p>{gift.description}</p>}<div>{gift.suggestedAmount !== null && <strong>{gift.suggestedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>}{gift.externalUrl && <a href={gift.externalUrl} target="_blank" rel="noreferrer">Referência ↗</a>}</div></div><button aria-label={`${selected ? "Remover" : "Selecionar"} ${gift.title}`} onClick={() => void toggleGift(gift.id)}><i />{selected ? "Escolhido" : "Escolher"}</button></article>; })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
