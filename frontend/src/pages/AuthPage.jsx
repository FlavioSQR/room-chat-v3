import { useState } from "react";
import api from "../api/client.js";

const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === "true";

function getInviteCodeFromUrl() {
  return new URLSearchParams(window.location.search).get("invite") || "";
}

// Depois de usar o convite (ou não), tira o parâmetro da URL pra não tentar
// entrar de novo se a página for recarregada.
function clearInviteFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.history.replaceState({}, "", url);
}

export default function AuthPage({ onLogin }) {
  const [inviteCode] = useState(getInviteCodeFromUrl);

  function handleLogin(user, token, joinedServerId) {
    clearInviteFromUrl();
    onLogin(user, token, joinedServerId);
  }

  if (AUTH_DISABLED) return <QuickLoginPage onLogin={handleLogin} inviteCode={inviteCode} />;
  return <FullAuthPage onLogin={handleLogin} inviteCode={inviteCode} />;
}

// Modo de teste: entra com qualquer apelido, sem senha (ver AUTH_DISABLED no backend/.env).
function QuickLoginPage({ onLogin, inviteCode }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/quick-login", { username, inviteCode: inviteCode || undefined });
      onLogin(data.user, data.token, data.joinedServerId);
    } catch (err) {
      setError(err.response?.data?.error?.formErrors?.[0] || err.response?.data?.error || "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="join-screen">
      <form className="join-box" onSubmit={handleSubmit}>
        <h1>{inviteCode ? "Você foi convidado!" : "Entrar (modo de teste)"}</h1>
        {inviteCode && (
          <p style={{ fontSize: 13, color: "#949ba4", marginTop: -8, marginBottom: 4 }}>
            Escolha um apelido para entrar na sala.
          </p>
        )}
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

function FullAuthPage({ onLogin, inviteCode }) {
  const [isRegister, setIsRegister] = useState(Boolean(inviteCode));
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = {
        ...(isRegister ? form : { email: form.email, password: form.password }),
        inviteCode: inviteCode || undefined,
      };
      const { data } = await api.post(endpoint, payload);
      onLogin(data.user, data.token, data.joinedServerId);
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
        {inviteCode && (
          <p style={{ fontSize: 13, color: "#949ba4", marginTop: -8, marginBottom: 4 }}>
            Você foi convidado! Entre para acessar a sala.
          </p>
        )}

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
