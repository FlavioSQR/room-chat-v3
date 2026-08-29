import { Plus, Trash2 } from "lucide-react";

export default function ServerSidebar({ servers, activeServerId, currentUserId, onSelect, onCreate, onDeleteServer }) {
  return (
    <div className="server-sidebar">
      {servers.map((server) => (
        <div key={server.id} className="server-icon-wrapper">
          <button
            className={`server-icon ${activeServerId === server.id ? "active" : ""}`}
            onClick={() => onSelect(server.id)}
            title={server.name}
          >
            {server.name.slice(0, 2).toUpperCase()}
          </button>
          {server.ownerId === currentUserId && (
            <button
              className="server-delete-badge"
              title="Apagar sala"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteServer(server.id);
              }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
      <button className="server-icon add" onClick={onCreate} title="Criar/entrar em servidor">
        <Plus size={20} />
      </button>
    </div>
  );
}
