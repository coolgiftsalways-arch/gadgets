import  { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import "../Admincss/AdminSidebar.css";

const AdminSidebar = () => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("gadgete-admin-theme") === "dark";
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  // APPLY THEME
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-admin-theme",
      darkMode ? "dark" : "light",
    );

    localStorage.setItem("gadgete-admin-theme", darkMode ? "dark" : "light");

    window.dispatchEvent(
      new CustomEvent("gadgete-admin-theme-change", {
        detail: darkMode ? "dark" : "light",
      }),
    );
  }, [darkMode]);

  const navigation = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      end: true,
    },
    {
      name: "Customers",
      path: "/admin/customers",
      icon: Users,
    },
    {
      name: "Orders",
      path: "/admin/orders",
      icon: ShoppingCart,
    },
    {
      name: "Products",
      path: "/admin/products",
      icon: Package,
    },
  ];

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE MENU BUTTON */}

      <button
        className="gad-admin-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle admin sidebar"
      >
        {mobileOpen ? <X /> : <Menu />}
      </button>

      {/* MOBILE OVERLAY */}

      {mobileOpen && (
        <div className="gad-admin-overlay" onClick={closeMobileMenu} />
      )}

      {/* SIDEBAR */}

      <aside
        className={`gad-admin-sidebar ${mobileOpen ? "gad-sidebar-open" : ""}`}
      >
        {/* BRAND */}

        <div className="gad-admin-brand">
          <div className="gad-admin-logo">
            GADGET<span>É</span>
            <sup>®</sup>
          </div>

          <p>ADMIN PANEL</p>
        </div>

        {/* NAVIGATION */}

        <nav className="gad-admin-navigation">
          <div className="gad-admin-nav-label">MENU</div>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `gad-admin-nav-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={20} strokeWidth={1.9} />

                <span>{item.name}</span>

                {item.name === "Orders" && (
                  <span className="gad-sidebar-order-badge">
                    {/* Replace with live unread order count */}0
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* BOTTOM SECTION */}

        <div className="gad-admin-sidebar-bottom">
          {/* THEME SWITCH */}

          <div className="gad-admin-theme-box">
            <div className="gad-admin-theme-text">
              <span>APPEARANCE</span>
              <strong>{darkMode ? "Dark Mode" : "Light Mode"}</strong>
            </div>

            <button
              type="button"
              className={`gad-admin-theme-toggle ${darkMode ? "dark" : ""}`}
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Toggle light and dark mode"
            >
              <span className="gad-theme-toggle-icon">
                {darkMode ? <Moon size={15} /> : <Sun size={15} />}
              </span>
            </button>
          </div>

          {/* ADMIN PROFILE */}

          <div className="gad-admin-profile">
            <div className="gad-admin-avatar">A</div>

            <div className="gad-admin-profile-info">
              <strong>Admin</strong>
              <span>Super Admin</span>
            </div>

            <button
              type="button"
              className="gad-admin-logout"
              title="Logout"
              onClick={() => {
                // Connect your existing admin logout logic here.
                console.log("Admin logout clicked");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
