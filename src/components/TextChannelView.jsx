import { useEffect, useRef, useState } from "react";
import api from "../api/client.js";

export default function TextChannelView({ channel, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!channel) return;
    api.get(`/messages/${channel.id}`).then((res) => setMessages(res.data));
    socket.emit("channel:join", channel.id);

    function handleNewMessage(message) {
      if (message.channelId === channel.id) setMessages((prev) => [...prev, message]);
    }
    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("channel:leave", channel.id);
      socket.off("message:new", handleNewMessage);
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
  }

  return (
    <div className="text-channel">
      <div className="channel-header"># {channel.name}</div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className="chat-message">
            <span className="author">{msg.author.username}</span>
            <span className="time">
              {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <div>{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          placeholder={`Conversar em #${channel.name}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}
