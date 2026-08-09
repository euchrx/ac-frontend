import { Fragment, useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  deleteAdminGuest,
  getAdminGuests,
  removeAdminGuestGift,
  updateAdminGuest,
  updateAdminGuestCompanions,
  type AdminGuest,
  type AttendanceStatus,
} from "../../services/admin";

const statusLabels: Record<AttendanceStatus, string> = {
  PENDING: "Aguardando resposta",
  CONFIRMED: "Confirmado",
  MAYBE: "Talvez",
  NOT_GOING: "Não irá",
};

type GuestSortKey = "name" | "status" | "companions" | "gifts";
type SortDirection = "asc" | "desc";

export function AdminGuestsPage() {
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGuest, setSelectedGuest] =
    useState<AdminGuest | null>(null);
  const [companionText, setCompanionText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<GuestSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  async function loadGuests() {
    try {
      setLoading(true);
      setGuests(await getAdminGuests());
    } catch {
      setError("Não foi possível carregar os convidados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial remote data synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGuests();
  }, []);

  useEffect(() => {
    // Keep the editable textarea synchronized with the selected table row.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompanionText(
      selectedGuest?.companions.map((item) => item.name).join("\n") ?? "",
    );
  }, [selectedGuest]);

  const filteredGuests = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchingGuests = term ? guests.filter(
      (guest) =>
        guest.name.toLowerCase().includes(term) ||
        guest.phone.includes(term),
    ) : guests;

    return [...matchingGuests].sort((first, second) => {
      let comparison: number;

      if (sortKey === "name") {
        comparison = first.name.localeCompare(second.name, "pt-BR", {
          sensitivity: "base",
        });
      } else if (sortKey === "status") {
        comparison = statusLabels[first.attendance].localeCompare(
          statusLabels[second.attendance],
          "pt-BR",
        );
      } else if (sortKey === "companions") {
        comparison = first.companions.length - second.companions.length;
      } else {
        comparison = first.giftChoices.length - second.giftChoices.length;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [guests, search, sortDirection, sortKey]);

  function changeSorting(key: GuestSortKey) {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function sortableHeader(label: string, key: GuestSortKey) {
    const isActive = sortKey === key;

    return (
      <button
        type="button"
        className={isActive ? "table-sort active" : "table-sort"}
        onClick={() => changeSorting(key)}
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <span className="table-sort-indicator" aria-hidden="true">
          {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  }

  async function saveGuest() {
    if (!selectedGuest) return;

    setError("");
    setMessage("");

    try {
      await updateAdminGuest(selectedGuest.id, {
        name: selectedGuest.name,
        phone: selectedGuest.phone,
        attendance: selectedGuest.attendance,
        notes: selectedGuest.notes,
      });

      const companions = companionText
        .split("\n")
        .map((name) => name.trim())
        .filter(Boolean);

      const updated = await updateAdminGuestCompanions(
        selectedGuest.id,
        companions,
      );

      setSelectedGuest(updated);
      setGuests((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
      setMessage("Convidado atualizado com sucesso.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const backendMessage =
          err.response?.data?.message ||
          "Não foi possível atualizar o convidado.";

        setError(
          Array.isArray(backendMessage)
            ? backendMessage.join(" ")
            : String(backendMessage),
        );
      } else {
        setError("Não foi possível atualizar o convidado.");
      }
    }
  }

  async function removeGuest() {
    if (!selectedGuest) return;

    const confirmed = window.confirm(
      `Deseja realmente remover ${selectedGuest.name}?`,
    );

    if (!confirmed) return;

    try {
      await deleteAdminGuest(selectedGuest.id);
      setGuests((current) =>
        current.filter((item) => item.id !== selectedGuest.id),
      );
      setSelectedGuest(null);
      setMessage("Convidado removido.");
    } catch {
      setError("Não foi possível remover o convidado.");
    }
  }

  async function removeGift(giftId: string) {
    if (!selectedGuest) return;

    try {
      await removeAdminGuestGift(selectedGuest.id, giftId);

      const updatedGuest = {
        ...selectedGuest,
        giftChoices: selectedGuest.giftChoices.filter(
          (choice) => choice.giftId !== giftId,
        ),
      };

      setSelectedGuest(updatedGuest);
      setGuests((current) =>
        current.map((guest) =>
          guest.id === updatedGuest.id ? updatedGuest : guest,
        ),
      );
    } catch {
      setError("Não foi possível remover a escolha.");
    }
  }

  if (loading) {
    return <div className="loading-state">Carregando convidados...</div>;
  }

  return (
    <section>
      <div className="admin-page-header">
        <div>
          <span className="page-eyebrow">Painel administrativo</span>
          <h1 className="admin-title">Convidados</h1>
        </div>

      </div>

      {error && <div className="form-error">{error}</div>}
      {message && <div className="form-success">{message}</div>}

      <div className="admin-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou WhatsApp"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{sortableHeader("Nome", "name")}</th>
              <th>WhatsApp</th>
              <th>{sortableHeader("Status", "status")}</th>
              <th>{sortableHeader("Acompanhantes", "companions")}</th>
              <th>{sortableHeader("Presentes", "gifts")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuests.map((guest) => {
              const hasCompanions = guest.companions.length > 0;
              const isExpanded = expandedGuestId === guest.id;

              return (
                <Fragment key={guest.id}>
                  <tr onClick={() => setSelectedGuest(guest)}>
                    <td>{guest.name}</td>
                    <td>{guest.phone}</td>
                    <td>
                      <span className={`status-badge ${guest.attendance}`}>
                        {statusLabels[guest.attendance]}
                      </span>
                    </td>
                    <td>
                      {hasCompanions ? (
                        <button
                          type="button"
                          className="companions-toggle"
                          aria-expanded={isExpanded}
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedGuestId(isExpanded ? null : guest.id);
                          }}
                        >
                          <span>{guest.companions.length} {guest.companions.length === 1 ? "acompanhante" : "acompanhantes"}</span>
                          <span className="companions-chevron" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="no-companions">—</span>
                      )}
                    </td>
                    <td>{guest.giftChoices.length}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="companions-detail-row">
                      <td colSpan={5}>
                        <div className="companions-detail">
                          <small>Acompanhantes de {guest.name}</small>
                          <div>
                            {guest.companions.map((companion) => (
                              <span key={companion.id}>{companion.name}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedGuest && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <span className="page-eyebrow">Editar convidado</span>
                <h2>{selectedGuest.name}</h2>
              </div>

              <button onClick={() => setSelectedGuest(null)}>Fechar</button>
            </div>

            <div className="admin-form-grid">
              <label>
                Nome
                <input
                  value={selectedGuest.name}
                  onChange={(event) =>
                    setSelectedGuest({
                      ...selectedGuest,
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                WhatsApp
                <input
                  value={selectedGuest.phone}
                  onChange={(event) =>
                    setSelectedGuest({
                      ...selectedGuest,
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Status
                <select
                  value={selectedGuest.attendance}
                  onChange={(event) =>
                    setSelectedGuest({
                      ...selectedGuest,
                      attendance:
                        event.target.value as AttendanceStatus,
                    })
                  }
                >
                  <option value="PENDING">Aguardando resposta</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="MAYBE">Talvez</option>
                  <option value="NOT_GOING">Não irá</option>
                </select>
              </label>

              <label>
                Observações
                <textarea
                  value={selectedGuest.notes ?? ""}
                  onChange={(event) =>
                    setSelectedGuest({
                      ...selectedGuest,
                      notes: event.target.value,
                    })
                  }
                />
              </label>

              <label className="full-width">
                Acompanhantes — um nome por linha
                <textarea
                  rows={6}
                  value={companionText}
                  onChange={(event) =>
                    setCompanionText(event.target.value)
                  }
                />
              </label>
            </div>

            <div className="admin-choice-list">
              <h3>Presentes escolhidos</h3>

              {selectedGuest.giftChoices.length === 0 && (
                <p className="empty-state">
                  Nenhum presente escolhido.
                </p>
              )}

              {selectedGuest.giftChoices.map((choice) => (
                <div className="admin-choice-item" key={choice.id}>
                  <span>{choice.gift.title}</span>
                  <button onClick={() => removeGift(choice.giftId)}>
                    Remover
                  </button>
                </div>
              ))}
            </div>

            <div className="admin-modal-actions">
              <button className="danger-button" onClick={removeGuest}>
                Excluir convidado
              </button>

              <button className="primary-button" onClick={saveGuest}>
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
