import { NavLink, Outlet, useNavigate } from "react-router-dom";

export function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("admin_token");
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-layout premium-admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-monogram" aria-hidden="true">AC</span>
          <div>
            <span className="admin-eyebrow">15 anos</span>
            <h1>Ana Clara</h1>
          </div>
        </div>

        <nav className="admin-navigation">
          <span className="admin-navigation-label">Administração</span>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              isActive ? "admin-link active" : "admin-link"
            }
          >
            Visão geral
          </NavLink>

          <NavLink
            to="/admin/convidados"
            className={({ isActive }) =>
              isActive ? "admin-link active" : "admin-link"
            }
          >
            Convidados
          </NavLink>

          <NavLink
            to="/admin/presentes"
            className={({ isActive }) =>
              isActive ? "admin-link active" : "admin-link"
            }
          >
            Presentes
          </NavLink>
        </nav>

        <button className="admin-logout" onClick={handleLogout}>
          <span>Sair da conta</span>
          <span aria-hidden="true">→</span>
        </button>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
