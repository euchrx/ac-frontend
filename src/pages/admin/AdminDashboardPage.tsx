import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import {
  getAdminDashboard,
  getAdminMe,
  type AdminDashboard,
  type AdminUser,
} from "../../services/admin";

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const [, setAdmin] = useState<AdminUser | null>(null);
  const [dashboard, setDashboard] =
    useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [adminData, dashboardData] = await Promise.all([
          getAdminMe(),
          getAdminDashboard(),
        ]);

        setAdmin(adminData);
        setDashboard(dashboardData);
      } catch (err: unknown) {
        if (
          axios.isAxiosError(err) &&
          err.response?.status === 401
        ) {
          localStorage.removeItem("admin_token");
          navigate("/admin/login", { replace: true });
          return;
        }

        setError("Não foi possível carregar o painel.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [navigate]);

  if (loading) {
    return <div className="loading-state">Carregando painel...</div>;
  }

  if (error || !dashboard) {
    return <div className="form-error">{error}</div>;
  }

  const answeredGuests = dashboard.guests.total - dashboard.guests.pending;
  const responseRate = dashboard.guests.total
    ? Math.round((answeredGuests / dashboard.guests.total) * 100)
    : 0;

  return (
    <section className="dashboard-overview">
      <header className="dashboard-overview-header">
        <div>
          <span className="page-eyebrow">Painel administrativo</span>
          <h1 className="admin-title">Visão geral</h1>
        </div>
        <span className="dashboard-event-mark" aria-hidden="true">AC · 15</span>
      </header>

      <div className="dashboard-summary">
        <article className="dashboard-primary-stat">
          <span className="premium-kicker">Presenças confirmadas</span>
          <strong>{dashboard.people.confirmed}</strong>
          <p>pessoas confirmadas, incluindo acompanhantes.</p>
          <Link to="/admin/convidados">Ver convidados <span>→</span></Link>
        </article>

        <div className="dashboard-essential-stats">
          <article>
            <small>Lista de convidados</small>
            <strong>{dashboard.guests.total}</strong>
            <span>cadastros</span>
          </article>
          <article>
            <small>Aguardando resposta</small>
            <strong>{dashboard.guests.pending}</strong>
            <span>{responseRate}% já responderam</span>
          </article>
        </div>
      </div>
    </section>
  );
}
