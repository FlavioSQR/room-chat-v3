import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "./api/client.js";
import { useAuth } from "./store/useAuth.js";
import AuthPage from "./pages/AuthPage.jsx";
import ServerSidebar from "./components/ServerSidebar.jsx";
import ChannelList from "./components/ChannelList.jsx";
import TextChannelView from "./components/TextChannelView.jsx";
import VoiceChannelView from "./components/VoiceChannelView.jsx";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export default function App() {
  const { user, token, login, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);

  useEffect(() => {
    if (!token) return;
    const s = io(SOCKET_URL, { auth: { token } });
    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.get("/servers").then((res) => {
      setServers(res.data);
      if (res.data.length && !activeServerId) setActiveServerId(res.data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreateServer() {
    const name = prompt("Nome do novo servidor:");
    if (!name?.trim()) return;
    const { data } = await api.post("/servers", { name });
    setServers((prev) => [...prev, data]);
    setActiveServerId(data.id);
    setActiveChannel(null);
  }

  async function handleCreateChannel(type) {
    const name = prompt(`Nome do novo canal de ${type === "text" ? "texto" : "voz"}:`);
    if (!name?.trim()) return;
    const { data } = await api.post(`/servers/${activeServerId}/channels`, { name, type });
    setServers((prev) =>
      prev.map((s) => (s.id === activeServerId ? { ...s, channels: [...s.channels, data] } : s))
    );
  }

  function handleAuthenticated(newUser, newToken, joinedServerId) {
    login(newUser, newToken);
    if (joinedServerId) setActiveServerId(joinedServerId);
  }

  if (!token || !user) {
    return <AuthPage onLogin={handleAuthenticated} />;
  }

  if (!socket) return null; // conectando ao socket

  const activeServer = servers.find((s) => s.id === activeServerId);

  return (
    <div className="app-shell">
      <ServerSidebar
        servers={servers}
        activeServerId={activeServerId}
        onSelect={(id) => {
          setActiveServerId(id);
          setActiveChannel(null);
        }}
        onCreate={handleCreateServer}
      />
      <ChannelList
        server={activeServer}
        activeChannelId={activeChannel?.id}
        onSelectChannel={setActiveChannel}
        onCreateChannel={handleCreateChannel}
        username={user.username}
      />
      <div className="main-area">
        {activeChannel ? (
          activeChannel.type === "text" ? (
            <TextChannelView channel={activeChannel} socket={socket} />
          ) : (
            <VoiceChannelView channel={activeChannel} socket={socket} username={user.username} />
          )
        ) : activeServer ? (
          <div className="empty-state">Selecione um canal</div>
        ) : (
          <div className="empty-state">
            <p>Crie ou entre em um servidor para começar</p>
            <div className="empty-state-actions">
              <button className="btn-primary" onClick={handleCreateServer}>
                Criar sala
              </button>
              <button className="btn-secondary" onClick={logout}>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
