import { useEffect } from "react";
import { useVoiceChannel } from "../useVoiceChannel.js";
import VideoTile from "../VideoTile.jsx";

export default function VoiceChannelView({ channel, socket, username }) {
  const vc = useVoiceChannel(socket, channel.id);

  useEffect(() => {
    vc.join();
    return () => vc.leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  const peerList = Object.entries(vc.peers);

  return (
    <div className="text-channel">
      <div className="channel-header">🔊 {channel.name}</div>

      {vc.error && <p style={{ color: "#ff6b6b", padding: "8px 16px" }}>{vc.error}</p>}

      <div className="video-grid">
        <VideoTile stream={vc.camOn ? vc.localStream : null} label={`${username} (você)`} isLocal muted={!vc.micOn} />
        {vc.screenStream && (
          <VideoTile stream={vc.screenStream} label={`${username} — tela`} isLocal screenshare />
        )}
        {peerList.map(([userId, peer]) => (
          <VideoTile key={userId} stream={peer.camOn ? peer.stream : null} label={peer.username} muted={!peer.micOn} />
        ))}
        {peerList.map(
          ([userId, peer]) =>
            peer.screenStream && (
              <VideoTile key={userId + "-screen"} stream={peer.screenStream} label={`${peer.username} — tela`} screenshare />
            )
        )}
      </div>

      <div className="controls">
        <button className={`control-btn ${vc.micOn ? "active" : "danger"}`} onClick={vc.toggleMic} title="Microfone">
          {vc.micOn ? "🎤" : "🔇"}
        </button>
        <button className={`control-btn ${vc.camOn ? "active" : ""}`} onClick={vc.toggleCam} title="Câmera">
          {vc.camOn ? "📹" : "📷"}
        </button>
        <button
          className={`control-btn ${vc.sharingScreen ? "active" : ""}`}
          onClick={vc.sharingScreen ? vc.stopScreenShare : vc.startScreenShare}
          title="Compartilhar tela"
        >
          🖥️
        </button>
      </div>
    </div>
  );
}
