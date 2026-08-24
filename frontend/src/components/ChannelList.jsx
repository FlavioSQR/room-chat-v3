import { useState } from "react";
import { Hash, Volume2, UserPlus, Trash2 } from "lucide-react";

export default function ChannelList({
  server,
  activeChannelId,
  currentUserId,
  onSelectChannel,
  onCreateChannel,
  onDeleteChannel,
  username,
}) {
  const [copied, setCopied] = useState(false);

  if (!server) return <div className="channel-list" />;

  const isOwner = server.ownerId === currentUserId;
  const textChannels = server.channels.filter((c) => c.type === "text");
  const voiceChannels = server.channels.filter((c) => c.type === "voice");

  async function handleCopyInvite() {
    const link = `${window.location.origin}${window.location.pathname}?invite=${server.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function renderChannel(c, Icon) {
    return (
      <div key={c.id} className="channel-row">
        <button
          className={`channel-item ${activeChannelId === c.id ? "active" : ""}`}
          onClick={() => onSelectChannel(c)}
        >
          <Icon size={16} /> {c.name}
        </button>
        {isOwner && (
          <button className="channel-delete-btn" title="Apagar canal" onClick={() => onDeleteChannel(c.id)}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
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
        {textChannels.map((c) => renderChannel(c, Hash))}

        <div className="channel-group-label">
          Canais de voz
          <button onClick={() => onCreateChannel("voice")}>+</button>
        </div>
        {voiceChannels.map((c) => renderChannel(c, Volume2))}
      </div>
      <div className="channel-list-footer">{username}</div>
    </div>
  );
}
