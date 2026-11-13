import { Navigate, Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { getToken } from "./api";
import "../Admincss/AdminLayout.css";

const AdminLayout = () => {
  // Not signed in -> login page.
  if (!getToken()) return <Navigate to="/admin/login" replace />;

  return (
    <div className="gad-admin-shell">
      <AdminSidebar />
      <main className="gad-admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
