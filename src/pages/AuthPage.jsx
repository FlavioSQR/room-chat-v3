import { useState } from "react";
import api from "../api/client.js";

const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === "true";

export default function AuthPage({ onLogin }) {
  if (AUTH_DISABLED) return <QuickLoginPage onLogin={onLogin} />;
  return <FullAuthPage onLogin={onLogin} />;
}

// Modo de teste: entra com qualquer apelido, sem senha (ver AUTH_DISABLED no backend/.env).
function QuickLoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/quick-login", { username });
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.error?.formErrors?.[0] || err.response?.data?.error || "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="join-screen">
      <form className="join-box" onSubmit={handleSubmit}>
        <h1>Entrar (modo de teste)</h1>
        <input
          placeholder="Escolha um apelido"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {error && <p style={{ color: "#ff6b6b", fontSize: 13 }}>{String(error)}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Aguarde..." : "Entrar"}
        </button>
        <p style={{ fontSize: 13, color: "#949ba4", marginTop: 12 }}>
          Login sem senha (AUTH_DISABLED=true). Desative no .env para exigir cadastro normal.
        </p>
      </form>
    </div>
  );
}

function FullAuthPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.error?.formErrors?.[0] || err.response?.data?.error || "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="join-screen">
      <form className="join-box" onSubmit={handleSubmit}>
        <h1>{isRegister ? "Criar conta" : "Entrar"}</h1>

        {isRegister && (
          <input
            placeholder="Nome de usuário"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {error && <p style={{ color: "#ff6b6b", fontSize: 13 }}>{String(error)}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
        </button>

        <p style={{ fontSize: 13, color: "#949ba4", marginTop: 12 }}>
          {isRegister ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: "none", color: "#00a8fc", padding: 0, width: "auto" }}
          >
            {isRegister ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </form>
    </div>
  );
}
