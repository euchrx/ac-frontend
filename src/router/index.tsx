import { createBrowserRouter } from "react-router-dom";

import { AdminProtectedRoute } from "../components/AdminProtectedRoute";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminGiftsPage } from "../pages/admin/AdminGiftsPage";
import { AdminGuestsPage } from "../pages/admin/AdminGuestsPage";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { GuestPage } from "../pages/guest/GuestPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { InvitePage } from "../pages/public/InvitePage";
import { GalleryPage } from "../pages/public/GalleryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <InvitePage />,
  },
  {
    path: "/convidado/*",
    element: <GuestPage />,
  },
  {
    path: "/galeria",
    element: <GalleryPage />,
  },
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },
  {
    element: <AdminProtectedRoute />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: "convidados",
            element: <AdminGuestsPage />,
          },
          {
            path: "presentes",
            element: <AdminGiftsPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
