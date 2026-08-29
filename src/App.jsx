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
  const [voicePresence, setVoicePresence] = useState({}); // { [channelId]: [{userId, username}] }
  const [notification, setNotification] = useState(null); // { type: 'success'|'info', message: string }
  const [joinedViaInvite, setJoinedViaInvite] = useState(false);

  useEffect(() => {
    if (!token) return;
    const s = io(SOCKET_URL, { auth: { token } });
    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  // Entra na "sala" de presença do servidor ativo, pra saber quem está em
  // cada canal de voz mesmo sem estar dentro de nenhum deles.
  useEffect(() => {
    if (!socket || !activeServerId) return;

    socket.emit("server:join", activeServerId, (presence) => setVoicePresence(presence || {}));

    function handlePresenceUpdate({ channelId, userId, username, joined }) {
      setVoicePresence((prev) => {
        const current = prev[channelId] || [];
        const next = joined
          ? current.some((p) => p.userId === userId)
            ? current
            : [...current, { userId, username }]
          : current.filter((p) => p.userId !== userId);
        return { ...prev, [channelId]: next };
      });
    }
    socket.on("presence:voice-update", handlePresenceUpdate);

    return () => {
      socket.emit("server:leave", activeServerId);
      socket.off("presence:voice-update", handlePresenceUpdate);
      setVoicePresence({});
    };
  }, [socket, activeServerId]);

  useEffect(() => {
    if (!token) return;
    api.get("/servers").then((res) => {
      setServers(res.data);
      if (res.data.length && !activeServerId) {
        setActiveServerId(res.data[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-select primeiro canal quando entrar via convite
  useEffect(() => {
    if (!activeServerId || !joinedViaInvite || activeChannel) return;
    
    const server = servers.find((s) => s.id === activeServerId);
    if (server?.channels?.length) {
      const firstChannel = server.channels[0];
      setActiveChannel(firstChannel);
      setNotification({ type: 'success', message: `Bem-vindo à ${server.name}! 🎉` });
      setTimeout(() => setNotification(null), 3000);
      setJoinedViaInvite(false);
    }
  }, [activeServerId, servers, joinedViaInvite, activeChannel]);

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

  async function handleDeleteServer(serverId) {
    const server = servers.find((s) => s.id === serverId);
    if (!confirm(`Apagar a sala "${server?.name}"? Essa ação não pode ser desfeita.`)) return;

    await api.delete(`/servers/${serverId}`);
    setServers((prev) => prev.filter((s) => s.id !== serverId));
    if (activeServerId === serverId) {
      setActiveServerId(null);
      setActiveChannel(null);
    }
  }

  async function handleDeleteChannel(channelId) {
    if (!confirm("Apagar este canal?")) return;

    await api.delete(`/servers/${activeServerId}/channels/${channelId}`);
    setServers((prev) =>
      prev.map((s) =>
        s.id === activeServerId ? { ...s, channels: s.channels.filter((c) => c.id !== channelId) } : s
      )
    );
    if (activeChannel?.id === channelId) setActiveChannel(null);
  }

  function handleAuthenticated(newUser, newToken, joinedServerId) {
    login(newUser, newToken);
    if (joinedServerId) {
      setActiveServerId(joinedServerId);
      setJoinedViaInvite(true);
    }
  }

  if (!token || !user) {
    return <AuthPage onLogin={handleAuthenticated} />;
  }

  if (!socket) return null; // conectando ao socket

  const activeServer = servers.find((s) => s.id === activeServerId);

  return (
    <div className="app-shell">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      <ServerSidebar
        servers={servers}
        activeServerId={activeServerId}
        currentUserId={user.id}
        onSelect={(id) => {
          setActiveServerId(id);
          setActiveChannel(null);
        }}
        onCreate={handleCreateServer}
        onDeleteServer={handleDeleteServer}
      />
      <ChannelList
        server={activeServer}
        activeChannelId={activeChannel?.id}
        currentUserId={user.id}
        voicePresence={voicePresence}
        onSelectChannel={setActiveChannel}
        onCreateChannel={handleCreateChannel}
        onDeleteChannel={handleDeleteChannel}
        username={user.username}
      />
      <div className="main-area">
        {activeChannel ? (
          activeChannel.type === "text" ? (
            <TextChannelView channel={activeChannel} socket={socket} currentUser={user} />
          ) : (
            <VoiceChannelView channel={{...activeChannel, serverId: activeServerId}} socket={socket} username={user.username} />
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
