# Room Chat — Especificação Técnica e Lógica

## 1. Visão geral

Aplicação de sala única (chat + chamada) para até **20 pessoas**, com chat de texto,
voz, câmera e **compartilhamento de tela simultâneos**. Sem banco de dados — tudo em
memória no backend. Conexão de mídia é **P2P (mesh)**: os navegadores conectam
diretamente entre si; o servidor só faz a "apresentação" (sinalização).

```
backend/   → Node.js + Express + Socket.IO (sinalização e chat)
frontend/  → React + Vite (UI, WebRTC no navegador)
```

---

## 2. Fluxo lógico completo

### 2.1 Entrar na sala

1. Usuário digita nome + nome da sala e envia `room:join`.
2. Backend:
   - Se a sala não existe, cria (`getOrCreateRoom`).
   - Se já tem 20 participantes, recusa com erro.
   - Gera um `userId` (uuid) para esse socket, guarda em `socket.data`.
   - Responde ao próprio usuário (via `callback`) com `{ userId, existingPeers }` —
     a lista de quem já está na sala.
   - Avisa aos outros (`socket.to(roomId).emit("room:peer-joined", ...)`) que alguém
     novo entrou (usado só para fins de UI/log; a conexão de mídia não depende disso).
3. Frontend do novo usuário:
   - Chama `getUserMedia({ audio: true })` para pegar o microfone (câmera começa
     desligada por padrão — usuário liga manualmente).
   - Para cada peer em `existingPeers`, chama `connectToPeer(userId)` → **ele é quem
     inicia a oferta WebRTC** com cada participante já presente.

**Por que só o novo entrante inicia a oferta?** Evita "glare" (os dois lados mandando
oferta ao mesmo tempo, o que exigiria lógica de desempate). Regra simples: quem chega
por último inicia a conexão com todos que já estavam lá.

### 2.2 Sinalização WebRTC (handshake SDP + ICE)

Fluxo clássico de WebRTC, com o Socket.IO como "correio" entre os dois navegadores
(o servidor nunca vê o conteúdo de áudio/vídeo, só as mensagens de conexão):

```
Peer A (novo)                    Backend (Socket.IO)              Peer B (já na sala)
    |--- webrtc:offer ------------------>|                              |
    |                                    |------- webrtc:offer -------->|
    |                                    |<------ webrtc:answer --------|
    |<-------- webrtc:answer ------------|                              |
    |--- webrtc:ice-candidate ---------->|------- ice-candidate ------->|
    |<-- webrtc:ice-candidate -----------|<------ ice-candidate --------|
    (troca continua até a conexão P2P direta ser estabelecida)
```

- `offer`/`answer`: descrição SDP (codecs, resoluções suportadas, etc.)
- `ice-candidate`: possíveis rotas de rede (IP local, IP público via STUN) para os
  dois navegadores acharem o melhor caminho direto entre si.
- STUN público do Google (`stun:stun.l.google.com:19302`) resolve a maioria dos casos
  domésticos. Redes com NAT simétrico/firewall corporativo restritivo podem falhar —
  nesse caso seria necessário um servidor **TURN** (retransmissor de mídia).

### 2.3 Câmera, microfone e tela — como cada mídia trafega

Cada `RTCPeerConnection` (uma por par de usuários) carrega **tracks** (trilhas):

| Ação do usuário | O que acontece |
|---|---|
| Liga microfone (padrão) | Track de áudio adicionada na conexão desde o início |
| Muta/desmuta | `track.enabled = false/true` — não renegocia, é instantâneo. Avisa os outros via evento `media:mic-toggle` só para atualizar o ícone de "mutado" na UI deles |
| Liga câmera | Novo `getUserMedia({video:true})` → track adicionada a cada `RTCPeerConnection` existente → **renegociação** (nova troca de offer/answer) porque a lista de tracks mudou |
| Desliga câmera | Track parada e removida → renegociação novamente |
| Compartilha tela | `getDisplayMedia()` → gera um `MediaStream` separado (não é o mesmo da câmera) → tracks adicionadas às conexões → renegociação |
| Para de compartilhar | Tracks paradas, evento `media:screenshare-stop` avisa os outros a remover aquele tile de vídeo |

No lado de quem **recebe**, o evento `pc.ontrack` dispara para cada track nova. Como
câmera e tela chegam como streams com IDs diferentes, o código distingue: o primeiro
stream recebido vira `peer.stream` (câmera), qualquer stream com ID diferente vira
`peer.screenStream` (tela) — por isso os dois aparecem como tiles separados na grade.

### 2.4 Chat de texto

Simples pub/sub via socket: `chat:send` → backend cria a mensagem (id, timestamp) →
`io.to(roomId).emit("chat:message", ...)` para todos na sala, incluindo quem enviou.
Sem persistência: histórico existe só enquanto o navegador está aberto (não há reload
de mensagens antigas ao entrar).

### 2.5 Saída / desconexão

- Usuário clica "Sair" → frontend para todas as tracks locais, fecha todas as
  `RTCPeerConnection`, desconecta o socket.
- Se a conexão cai (fechar aba, perda de rede) → backend detecta `disconnect`,
  remove o participante da sala e avisa os outros (`room:peer-left`) para eles
  fecharem a conexão correspondente e removerem o tile de vídeo.
- Sala vazia é apagada da memória automaticamente.

---

## 3. Eventos Socket.IO (referência completa)

| Evento | Direção | Payload | Descrição |
|---|---|---|---|
| `room:join` | cliente→servidor | `{roomId, username}` | Entra na sala; callback retorna `{userId, existingPeers}` ou `{error}` |
| `room:peer-joined` | servidor→clientes | `{userId, username}` | Avisa que alguém novo entrou |
| `room:peer-left` | servidor→clientes | `{userId}` | Avisa saída/desconexão |
| `chat:send` | cliente→servidor | `{content}` | Envia mensagem |
| `chat:message` | servidor→clientes | `{id, userId, username, content, createdAt}` | Broadcast da mensagem |
| `webrtc:offer` | bidirecional (via servidor) | `{targetUserId, offer}` | Oferta SDP |
| `webrtc:answer` | bidirecional | `{targetUserId, answer}` | Resposta SDP |
| `webrtc:ice-candidate` | bidirecional | `{targetUserId, candidate}` | Candidato ICE |
| `media:mic-toggle` | cliente→servidor→clientes | `{on}` | Estado do microfone (só UI) |
| `media:camera-toggle` | cliente→servidor→clientes | `{on}` | Estado da câmera (só UI) |
| `media:screenshare-start/stop` | cliente→servidor→clientes | — | Avisa início/fim do compartilhamento |

---

## 4. Estrutura de arquivos

```
room-chat/
├── backend/
│   ├── src/index.js        # servidor único: rotas + sockets + lógica de salas
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx        # entrada React
│   │   ├── App.jsx         # tela de entrada + sala (vídeo, chat, controles)
│   │   ├── useRoomMedia.js # hook central: WebRTC mesh (câmera/mic/tela)
│   │   ├── VideoTile.jsx   # componente de vídeo reutilizável
│   │   └── styles.css      # estilo (sem framework de UI)
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 5. Variáveis de ambiente

**Frontend** (`.env` na pasta `frontend/`):
```
VITE_SOCKET_URL=http://localhost:4000
```

**Backend**: `PORT` (padrão 4000). Sem necessidade de banco de dados nesta versão.

---

## 6. Limitações conhecidas e por quê

- **Mesh P2P escala mal com vídeo**: com N pessoas, cada uma mantém N-1 conexões.
  Com todas as câmeras ligadas, cada participante *envia* seu próprio vídeo N-1 vezes
  simultaneamente — pesado para o upload de quem tem internet mais fraca. Funciona
  bem até ~6-8 pessoas com vídeo; para 20 pessoas com vídeo simultâneo de forma
  confiável, a solução correta é um **SFU** (ex: LiveKit, mediasoup) — um servidor
  que recebe cada mídia uma vez e redistribui, tirando essa carga do cliente.
- **Sem TURN**: conexões atrás de NAT simétrico ou firewalls corporativos restritivos
  podem falhar em conectar diretamente.
- **Sem persistência**: mensagens e salas somem quando o processo do backend reinicia.
- **Sem autenticação**: qualquer pessoa com o nome da sala entra.

## 7. Possíveis próximos passos

1. Trocar mesh por SFU (LiveKit tem SDK pronto e é o caminho mais rápido).
2. Adicionar servidor TURN (ex: coturn ou serviço gerenciado).
3. Persistir salas e histórico de mensagens em banco (Postgres/Redis).
4. Autenticação simples (senha de sala) ou completa (login).
