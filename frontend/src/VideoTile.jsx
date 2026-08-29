import { useEffect, useRef } from "react";

export default function VideoTile({ stream, label, muted, isLocal, screenshare }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className={`video-tile ${screenshare ? "screenshare" : ""} ${muted ? "muted" : ""}`}>
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} />
      ) : (
        <div className="avatar-placeholder">{label.slice(0, 2).toUpperCase()}</div>
      )}
      <div className="label">{label}</div>
    </div>
  );
}
