import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="page-container">
      <section className="page-card">
        <span className="page-eyebrow">Erro 404</span>
        <h1>Página não encontrada</h1>
        <p>O endereço informado não existe.</p>

        <Link className="button-link" to="/convidado">
          Voltar
        </Link>
      </section>
    </main>
  );
}
