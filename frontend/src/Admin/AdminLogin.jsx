import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole, ArrowUpRight } from "lucide-react";
import { adminFetch, getToken, setToken } from "./api";
import "../Admincss/AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (getToken()) return <Navigate to="/admin" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminFetch("/login", { method: "POST", body: { email, password } });
      setToken(data.token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="gad-login-page">
      <form className="gad-login-card" onSubmit={submit}>
        <div className="gad-login-logo">
          GADGET<span>É</span>
          <sup>®</sup>
        </div>
        <span className="gad-login-eyebrow">ADMIN PANEL</span>
        <h1>
          SIGN IN<span>.</span>
        </h1>

        <label>
          EMAIL
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          PASSWORD
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="gad-login-error">{error}</p>}

        <button type="submit" disabled={loading}>
          <LockKeyhole size={17} />
          {loading ? "SIGNING IN…" : "SIGN IN"}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </main>
  );
};

export default AdminLogin;
