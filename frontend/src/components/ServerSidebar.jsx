import { Plus } from "lucide-react";

export default function ServerSidebar({ servers, activeServerId, onSelect, onCreate }) {
  return (
    <div className="server-sidebar">
      {servers.map((server) => (
        <button
          key={server.id}
          className={`server-icon ${activeServerId === server.id ? "active" : ""}`}
          onClick={() => onSelect(server.id)}
          title={server.name}
        >
          {server.name.slice(0, 2).toUpperCase()}
        </button>
      ))}
      <button className="server-icon add" onClick={onCreate} title="Criar/entrar em servidor">
        <Plus size={20} />
      </button>
    </div>
  );
}
