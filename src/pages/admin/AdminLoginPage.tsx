import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

import { loginAdmin } from "../../services/admin";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginAdmin(email, password);

      localStorage.setItem("admin_token", response.accessToken);
      navigate(searchParams.get("returnTo") === "/galeria" ? "/galeria" : "/admin", { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message || "Não foi possível entrar.";

        setError(
          Array.isArray(message)
            ? message.join(" ")
            : String(message),
        );
      } else {
        setError("Não foi possível entrar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-container">
      <section className="page-card">
        <span className="page-eyebrow">Administração</span>

        <h1>Acessar painel</h1>

        <p>
          Área reservada para os familiares responsáveis pela organização.
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="familia@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
