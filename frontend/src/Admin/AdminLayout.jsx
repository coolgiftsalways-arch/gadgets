import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import "../Admincss/AdminLayout.css";

const AdminLayout = () => {
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
