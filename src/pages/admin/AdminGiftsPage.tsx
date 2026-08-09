import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";

import {
  createAdminGift,
  deleteAdminGift,
  getAdminGifts,
  updateAdminGift,
  type AdminGift,
} from "../../services/admin";


const DEFAULT_GIFTS = [
  {
    title: "Viagem dos sonhos",
    description: "Uma ajuda para transformar planos em uma experiência única e muito especial.",
    type: "MONEY",
    suggestedAmount: 200,
    externalUrl: null,
    sortOrder: 1,
  },
  {
    title: "Presente livre",
    description: "Escolha o valor que desejar. Toda contribuição será recebida com carinho e gratidão.",
    type: "MONEY",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 2,
  },
  {
    title: "Maquiagem",
    description: "Itens de maquiagem para criar produções especiais e realçar ainda mais a beleza.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 3,
  },
  {
    title: "Produtos de cabelo",
    description: "Produtos para cuidar, hidratar e finalizar os cabelos no dia a dia.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 4,
  },
  {
    title: "Acessórios",
    description: "Acessórios delicados e modernos para complementar diferentes looks.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 5,
  },
  {
    title: "Produtos de pele",
    description: "Produtos para cuidados com a pele e uma rotina de beleza completa.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 6,
  },
  {
    title: "Bota",
    description: "Uma opção versátil e estilosa para compor looks em diferentes ocasiões.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 7,
  },
  {
    title: "Tênis",
    description: "Um modelo confortável e moderno para usar no dia a dia.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 8,
  },
  {
    title: "Pijama",
    description: "Um pijama confortável e bonito para momentos de descanso.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 9,
  },
  {
    title: "Perfumes",
    description: "Fragrâncias delicadas e marcantes para diferentes momentos.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 10,
  },
  {
    title: "Joias",
    description: "Peças delicadas e especiais para guardar como lembrança.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 11,
  },
  {
    title: "Bolsas",
    description: "Bolsas modernas e versáteis para combinar com diferentes estilos.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 12,
  },
  {
    title: "Rasteirinha",
    description: "Uma opção leve, confortável e elegante para os dias mais quentes.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 13,
  },
  {
    title: "Moletom",
    description: "Uma peça confortável e estilosa para os dias mais frios.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 14,
  },
  {
    title: "Saia",
    description: "Uma peça moderna e versátil para criar diferentes combinações.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 15,
  },
  {
    title: "Shorts",
    description: "Uma opção confortável e prática para looks casuais.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 16,
  },
  {
    title: "Calça",
    description: "Uma peça versátil para usar em diferentes ocasiões.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 17,
  },
  {
    title: "Blusinha",
    description: "Blusinhas modernas e delicadas para completar o guarda-roupa.",
    type: "PHYSICAL",
    suggestedAmount: null,
    externalUrl: null,
    sortOrder: 18,
  },
] as const;

function normalizeGiftTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const emptyGift = {
  title: "",
  description: "",
  type: "PHYSICAL" as "MONEY" | "PHYSICAL",
  suggestedAmount: "",
  externalUrl: "",
  sortOrder: "0",
};

export function AdminGiftsPage() {
  const [gifts, setGifts] = useState<AdminGift[]>([]);
  const [form, setForm] = useState(emptyGift);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGift, setEditingGift] =
    useState<AdminGift | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  async function loadGifts() {
    try {
      setGifts(await getAdminGifts());
    } catch {
      setError("Não foi possível carregar os presentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial remote data synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGifts();
  }, []);

  async function addDefaultGifts() {
    setError("");
    setMessage("");
    setSeedingDefaults(true);

    try {
      const currentTitles = new Set(
        gifts.map((gift) => normalizeGiftTitle(gift.title)),
      );

      const missingGifts = DEFAULT_GIFTS.filter(
        (gift) => !currentTitles.has(normalizeGiftTitle(gift.title)),
      );

      if (missingGifts.length === 0) {
        setMessage("Todos os presentes da página pública já estão cadastrados.");
        return;
      }

      for (const gift of missingGifts) {
        await createAdminGift({
          title: gift.title,
          description: gift.description,
          type: gift.type,
          suggestedAmount: gift.suggestedAmount,
          externalUrl: gift.externalUrl,
          sortOrder: gift.sortOrder,
        });
      }

      await loadGifts();
      setMessage(
        `${missingGifts.length} presente(s) da página pública foram adicionados.`,
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const backendMessage =
          err.response?.data?.message ||
          "Não foi possível adicionar a lista padrão de presentes.";

        setError(
          Array.isArray(backendMessage)
            ? backendMessage.join(" ")
            : String(backendMessage),
        );
      } else {
        setError("Não foi possível adicionar a lista padrão de presentes.");
      }
    } finally {
      setSeedingDefaults(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const gift = await createAdminGift({
        title: form.title,
        description: form.description || null,
        type: form.type,
        suggestedAmount:
          form.suggestedAmount === ""
            ? null
            : Number(form.suggestedAmount),
        externalUrl: form.externalUrl || null,
        sortOrder: Number(form.sortOrder),
      });

      setGifts((current) =>
        [
          ...current,
          {
            ...gift,
            _count: { guestChoices: 0 },
            guestChoices: [],
          },
        ].sort((a, b) => a.sortOrder - b.sortOrder),
      );

      setForm(emptyGift);
      setIsCreateOpen(false);
      setMessage("Presente criado com sucesso.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const backendMessage =
          err.response?.data?.message ||
          "Não foi possível criar o presente.";

        setError(
          Array.isArray(backendMessage)
            ? backendMessage.join(" ")
            : String(backendMessage),
        );
      } else {
        setError("Não foi possível criar o presente.");
      }
    }
  }

  async function saveEditingGift() {
    if (!editingGift) return;

    try {
      const updated = await updateAdminGift(editingGift.id, {
        title: editingGift.title,
        description: editingGift.description,
        type: editingGift.type,
        suggestedAmount: editingGift.suggestedAmount,
        externalUrl: editingGift.externalUrl,
        active: editingGift.active,
        sortOrder: editingGift.sortOrder,
      });

      setGifts((current) =>
        current.map((gift) =>
          gift.id === updated.id
            ? { ...editingGift, ...updated }
            : gift,
        ),
      );

      setEditingGift(null);
      setMessage("Presente atualizado.");
    } catch {
      setError("Não foi possível atualizar o presente.");
    }
  }

  async function removeGift(gift: AdminGift) {
    const confirmed = window.confirm(
      `Deseja remover o presente "${gift.title}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteAdminGift(gift.id);
      setGifts((current) =>
        current.filter((item) => item.id !== gift.id),
      );
      setMessage("Presente removido.");
    } catch {
      setError("Não foi possível remover o presente.");
    }
  }

  if (loading) {
    return <div className="loading-state">Carregando presentes...</div>;
  }

  return (
    <section>
      <div className="admin-page-header gifts-page-header">
        <div>
          <span className="page-eyebrow">Painel administrativo</span>
          <h1 className="admin-title">Presentes</h1>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setIsCreateOpen(true)}
        >
          Adicionar
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {message && <div className="form-success">{message}</div>}

      <div className="gifts-table-toolbar">
        <p>{gifts.length} presente(s) cadastrado(s)</p>
        <button
          type="button"
          onClick={() => void addDefaultGifts()}
          disabled={seedingDefaults}
        >
          {seedingDefaults ? "Sincronizando..." : "Sincronizar lista padrão"}
        </button>
      </div>

      <div className="admin-table-wrap gifts-table-wrap">
        <table className="admin-table gifts-table">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Presente</th>
              <th>Tipo</th>
              <th>Valor sugerido</th>
              <th>Escolhas</th>
              <th>Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {gifts.map((gift) => (
              <tr key={gift.id}>
                <td className="gift-order">{gift.sortOrder}</td>
                <td>
                  <strong className="gift-table-title">{gift.title}</strong>
                </td>
                <td>{gift.type === "MONEY" ? "Contribuição" : "Físico"}</td>
                <td>
                  {gift.suggestedAmount === null
                    ? "—"
                    : gift.suggestedAmount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </td>
                <td>{gift._count.guestChoices}</td>
                <td>
                  <span className={`gift-status ${gift.active ? "active" : "inactive"}`}>
                    {gift.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <div className="gift-table-actions">
                    <button onClick={() => setEditingGift(gift)}>Editar</button>
                    <button className="delete" onClick={() => removeGift(gift)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={handleCreate}>
            <div className="admin-modal-header">
              <div>
                <span className="page-eyebrow">Cadastro</span>
                <h2>Novo presente</h2>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)}>Fechar</button>
            </div>

            <div className="admin-form-grid">
              <label>
                Título
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </label>
              <label>
                Tipo
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as "MONEY" | "PHYSICAL" })}>
                  <option value="PHYSICAL">Presente físico</option>
                  <option value="MONEY">Contribuição</option>
                </select>
              </label>
              <label className="full-width">
                Descrição
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <label>
                Valor sugerido
                <input type="number" step="0.01" value={form.suggestedAmount} onChange={(event) => setForm({ ...form, suggestedAmount: event.target.value })} />
              </label>
              <label>
                Ordem
                <input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
              </label>
              <label className="full-width">
                Link externo
                <input type="url" value={form.externalUrl} onChange={(event) => setForm({ ...form, externalUrl: event.target.value })} placeholder="https://" />
              </label>
            </div>

            <div className="admin-modal-actions create-gift-actions">
              <button className="primary-button" type="submit">Criar presente</button>
            </div>
          </form>
        </div>
      )}

      {editingGift && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <span className="page-eyebrow">Editar presente</span>
                <h2>{editingGift.title}</h2>
              </div>

              <button onClick={() => setEditingGift(null)}>
                Fechar
              </button>
            </div>

            <div className="admin-form-grid">
              <label>
                Título
                <input
                  value={editingGift.title}
                  onChange={(event) =>
                    setEditingGift({
                      ...editingGift,
                      title: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Tipo
                <select
                  value={editingGift.type}
                  onChange={(event) =>
                    setEditingGift({
                      ...editingGift,
                      type: event.target.value as "MONEY" | "PHYSICAL",
                    })
                  }
                >
                  <option value="PHYSICAL">Presente físico</option>
                  <option value="MONEY">Contribuição</option>
                </select>
              </label>

              <label className="full-width">
                Descrição
                <textarea
                  value={editingGift.description ?? ""}
                  onChange={(event) =>
                    setEditingGift({
                      ...editingGift,
                      description: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Valor sugerido
                <input
                  type="number"
                  step="0.01"
                  value={editingGift.suggestedAmount ?? ""}
                  onChange={(event) =>
                    setEditingGift({
                      ...editingGift,
                      suggestedAmount:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                Ordem
                <input
                  type="number"
                  value={editingGift.sortOrder}
                  onChange={(event) =>
                    setEditingGift({
                      ...editingGift,
                      sortOrder: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label className="full-width">
                Link externo
                <input
                  value={editingGift.externalUrl ?? ""}
                  onChange={(event) =>
                    setEditingGift({
                      ...editingGift,
                      externalUrl: event.target.value,
                    })
                  }
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editingGift.active}
                  onChange={(event) =>
                    setEditingGift({
                      ...editingGift,
                      active: event.target.checked,
                    })
                  }
                />
                Presente ativo
              </label>
            </div>

            <div className="admin-modal-actions">
              <button
                className="primary-button"
                onClick={saveEditingGift}
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
