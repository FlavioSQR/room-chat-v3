import { useState } from "react";
import { Hash, Volume2, UserPlus } from "lucide-react";

export default function ChannelList({ server, activeChannelId, onSelectChannel, username, onCreateChannel }) {
  const [copied, setCopied] = useState(false);

  if (!server) return <div className="channel-list" />;

  const textChannels = server.channels.filter((c) => c.type === "text");
  const voiceChannels = server.channels.filter((c) => c.type === "voice");

  async function handleCopyInvite() {
    const link = `${window.location.origin}${window.location.pathname}?invite=${server.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="channel-list">
      <div className="channel-list-header">
        {server.name}
        <button className="invite-button" onClick={handleCopyInvite} title="Copiar link de convite">
          <UserPlus size={16} /> {copied ? "Copiado!" : "Convidar"}
        </button>
      </div>
      <div className="channel-list-body">
        <div className="channel-group-label">
          Canais de texto
          <button onClick={() => onCreateChannel("text")}>+</button>
        </div>
        {textChannels.map((c) => (
          <button
            key={c.id}
            className={`channel-item ${activeChannelId === c.id ? "active" : ""}`}
            onClick={() => onSelectChannel(c)}
          >
            <Hash size={16} /> {c.name}
          </button>
        ))}

        <div className="channel-group-label">
          Canais de voz
          <button onClick={() => onCreateChannel("voice")}>+</button>
        </div>
        {voiceChannels.map((c) => (
          <button
            key={c.id}
            className={`channel-item ${activeChannelId === c.id ? "active" : ""}`}
            onClick={() => onSelectChannel(c)}
          >
            <Volume2 size={16} /> {c.name}
          </button>
        ))}
      </div>
      <div className="channel-list-footer">{username}</div>
    </div>
  );
}
