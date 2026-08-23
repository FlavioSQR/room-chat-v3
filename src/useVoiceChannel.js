import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useVoiceChannel(socket, channelId, myUserId) {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [peers, setPeers] = useState({}); // { userId: { username, stream, screenStream, camOn, micOn } }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [error, setError] = useState("");

  const pcsRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const ensurePeerConnection = useCallback(
    (remoteUserId) => {
      if (pcsRef.current[remoteUserId]) return pcsRef.current[remoteUserId];
      const pc = new RTCPeerConnection(ICE_SERVERS);

      localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, screenStreamRef.current));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit("webrtc:ice-candidate", { targetUserId: remoteUserId, candidate: e.candidate });
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0];
        setPeers((prev) => {
          const existing = prev[remoteUserId] || { username: "Usuário", camOn: false, micOn: true };
          const isFirst = !existing.stream || existing.stream.id === stream.id;
          return {
            ...prev,
            [remoteUserId]: isFirst ? { ...existing, stream } : { ...existing, screenStream: stream },
          };
        });
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) removePeer(remoteUserId);
      };

      pcsRef.current[remoteUserId] = pc;
      return pc;
    },
    [socket]
  );

  function removePeer(userId) {
    pcsRef.current[userId]?.close();
    delete pcsRef.current[userId];
    setPeers((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  function renegotiateAll() {
    Object.entries(pcsRef.current).forEach(async ([remoteUserId, pc]) => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { targetUserId: remoteUserId, offer });
    });
  }

  const join = useCallback(async () => {
    setError("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    setLocalStream(stream);

    socket.emit("voice:join", { channelId }, async (res) => {
      if (res?.error) {
        setError(res.error);
        stream.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        return;
      }
      for (const peer of res.existingPeers) {
        setPeers((prev) => ({ ...prev, [peer.userId]: { username: peer.username, camOn: false, micOn: true } }));
        const pc = ensurePeerConnection(peer.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { targetUserId: peer.userId, offer });
      }
    });
  }, [socket, channelId, ensurePeerConnection]);

  const leave = useCallback(() => {
    socket.emit("voice:leave", { channelId });
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(pcsRef.current).forEach((pc) => pc.close());
    pcsRef.current = {};
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setScreenStream(null);
    setPeers({});
    setCamOn(false);
    setSharingScreen(false);
  }, [socket, channelId]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socket.emit("media:mic-toggle", { channelId, on: track.enabled });
  }, [socket, channelId]);

  const toggleCam = useCallback(async () => {
    if (camOn) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.stop();
        localStreamRef.current.removeTrack(t);
      });
      setCamOn(false);
      socket.emit("media:camera-toggle", { channelId, on: false });
      renegotiateAll();
    } else {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = camStream.getVideoTracks()[0];
      localStreamRef.current.addTrack(track);
      Object.values(pcsRef.current).forEach((pc) => pc.addTrack(track, localStreamRef.current));
      setCamOn(true);
      socket.emit("media:camera-toggle", { channelId, on: true });
      renegotiateAll();
    }
  }, [camOn, socket, channelId]);

  const startScreenShare = useCallback(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    screenStreamRef.current = stream;
    setScreenStream(stream);
    Object.values(pcsRef.current).forEach((pc) => stream.getTracks().forEach((t) => pc.addTrack(t, stream)));
    stream.getVideoTracks()[0].onended = () => stopScreenShare();
    socket.emit("media:screenshare-start", { channelId });
    setSharingScreen(true);
    renegotiateAll();
  }, [socket, channelId]);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    socket.emit("media:screenshare-stop", { channelId });
    setSharingScreen(false);
  }, [socket, channelId]);

  useEffect(() => {
    async function handleOffer({ fromUserId, offer }) {
      const pc = ensurePeerConnection(fromUserId);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { targetUserId: fromUserId, answer });
    }
    async function handleAnswer({ fromUserId, answer }) {
      await pcsRef.current[fromUserId]?.setRemoteDescription(answer);
    }
    async function handleIceCandidate({ fromUserId, candidate }) {
      try {
        await pcsRef.current[fromUserId]?.addIceCandidate(candidate);
      } catch {
        /* candidato fora de ordem, ignora */
      }
    }
    function handlePeerJoined({ userId, username }) {
      setPeers((prev) => (prev[userId] ? prev : { ...prev, [userId]: { username, camOn: false, micOn: true } }));
    }
    function handlePeerLeft({ userId }) {
      removePeer(userId);
    }
    function handleCameraToggled({ userId, on }) {
      setPeers((prev) => (prev[userId] ? { ...prev, [userId]: { ...prev[userId], camOn: on } } : prev));
    }
    function handleMicToggled({ userId, on }) {
      setPeers((prev) => (prev[userId] ? { ...prev, [userId]: { ...prev[userId], micOn: on } } : prev));
    }
    function handleScreenshareStopped({ userId }) {
      setPeers((prev) => (prev[userId] ? { ...prev, [userId]: { ...prev[userId], screenStream: null } } : prev));
    }

    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);
    socket.on("voice:peer-joined", handlePeerJoined);
    socket.on("voice:peer-left", handlePeerLeft);
    socket.on("media:camera-toggled", handleCameraToggled);
    socket.on("media:mic-toggled", handleMicToggled);
    socket.on("media:screenshare-stopped", handleScreenshareStopped);

    return () => {
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
      socket.off("voice:peer-joined", handlePeerJoined);
      socket.off("voice:peer-left", handlePeerLeft);
      socket.off("media:camera-toggled", handleCameraToggled);
      socket.off("media:mic-toggled", handleMicToggled);
      socket.off("media:screenshare-stopped", handleScreenshareStopped);
    };
  }, [socket, ensurePeerConnection]);

  return {
    localStream,
    screenStream,
    peers,
    micOn,
    camOn,
    sharingScreen,
    error,
    join,
    leave,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
  };
}
