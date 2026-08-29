import { Hash, Volume2 } from "lucide-react";

export default function ChannelList({ server, activeChannelId, onSelectChannel, username, onCreateChannel }) {
  if (!server) return <div className="channel-list" />;

  const textChannels = server.channels.filter((c) => c.type === "text");
  const voiceChannels = server.channels.filter((c) => c.type === "voice");

  return (
    <div className="channel-list">
      <div className="channel-list-header">{server.name}</div>
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
