import { useEffect, useRef, useState } from "react";
import api from "../api/client.js";

export default function TextChannelView({ channel, socket, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [participants, setParticipants] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!channel) return;
    api.get(`/messages/${channel.id}`).then((res) => setMessages(res.data));
    socket.emit("channel:join", channel.id);

    function handleNewMessage(message) {
      if (message.channelId === channel.id) setMessages((prev) => [...prev, message]);
    }
    
    function handleUserTyping({ userId, username }) {
      setTypingUsers((prev) => new Set(prev).add(userId));
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }, 2000);
    }

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleUserTyping);

    return () => {
      socket.emit("channel:leave", channel.id);
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleUserTyping);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [channel, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit("message:send", { channelId: channel.id, content: input });
    setInput("");
    setTypingUsers(new Set());
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    socket.emit("typing:start", { channelId: channel.id });
  }

  const uniqueAuthors = Array.from(
    new Map(messages.map((m) => [m.author.id, m.author])).values()
  );

  return (
    <div className="text-channel-container">
      <div className="text-channel">
        <div className="channel-header"># {channel.name}</div>
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-channel">
              <p>Bem-vindo a #{channel.name}! 👋</p>
              <small>Este é o início da conversa</small>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="chat-message">
                <div className="message-avatar">{msg.author.username.slice(0, 1).toUpperCase()}</div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="author">{msg.author.username}</span>
                    <span className="time">
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {typingUsers.size > 0 && (
            <div className="typing-indicator">
              <small>
                {Array.from(typingUsers).join(", ")} está digitando...
              </small>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            placeholder={`Conversar em #${channel.name}`}
            value={input}
            onChange={handleInputChange}
          />
          <button type="submit" className="send-btn" disabled={!input.trim()}>
            Enviar
          </button>
        </form>
      </div>

      <div className="channel-sidebar">
        <div className="sidebar-header">Participantes</div>
        <div className="participants-list">
          {uniqueAuthors.map((author) => (
            <div key={author.id} className="participant-item">
              <div className="participant-avatar">{author.username.slice(0, 1).toUpperCase()}</div>
              <span className="participant-name">
                {author.username}
                {author.id === currentUser?.id && " (você)"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
