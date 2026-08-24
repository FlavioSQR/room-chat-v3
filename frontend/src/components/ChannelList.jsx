import { useState } from "react";
import { Hash, Volume2, UserPlus, Trash2 } from "lucide-react";

export default function ChannelList({
  server,
  activeChannelId,
  currentUserId,
  voicePresence,
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

  function renderDeleteButton(channelId) {
    if (!isOwner) return null;
    return (
      <button className="channel-delete-btn" title="Apagar canal" onClick={() => onDeleteChannel(channelId)}>
        <Trash2 size={14} />
      </button>
    );
  }

  function renderTextChannel(c) {
    return (
      <div key={c.id} className="channel-row">
        <button
          className={`channel-item ${activeChannelId === c.id ? "active" : ""}`}
          onClick={() => onSelectChannel(c)}
        >
          <Hash size={16} /> {c.name}
        </button>
        {renderDeleteButton(c.id)}
      </div>
    );
  }

  function renderVoiceChannel(c) {
    const connected = voicePresence?.[c.id] || [];
    return (
      <div key={c.id} className="channel-row channel-row-voice">
        <button
          className={`channel-item ${activeChannelId === c.id ? "active" : ""}`}
          onClick={() => onSelectChannel(c)}
        >
          <Volume2 size={16} /> {c.name}
        </button>
        {renderDeleteButton(c.id)}
        {connected.length > 0 && (
          <div className="voice-presence">
            {connected.map((p) => (
              <div key={p.userId} className="voice-presence-avatar" title={p.username}>
                {p.username.slice(0, 1).toUpperCase()}
              </div>
            ))}
          </div>
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
        {textChannels.map(renderTextChannel)}

        <div className="channel-group-label">
          Canais de voz
          <button onClick={() => onCreateChannel("voice")}>+</button>
        </div>
        {voiceChannels.map(renderVoiceChannel)}
      </div>
      <div className="channel-list-footer">{username}</div>
    </div>
  );
}
