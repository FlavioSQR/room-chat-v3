# Room Chat v3 — com login, servidores/canais e persistência

Chat estilo Discord (simplificado): login, múltiplos servidores com canais de texto
e voz, mensagens persistidas, e voz/câmera/compartilhamento de tela simultâneos em
canais de voz (até 20 pessoas por canal).

## O que mudou da v1
- ✅ Login/registro com JWT
- ✅ Banco de dados (PostgreSQL via Prisma) — usuários, servidores, canais, mensagens
- ✅ Múltiplos servidores, cada um com seus próprios canais de texto/voz
- ⏭️ Vídeo ainda é mesh P2P (ver seção "Sobre o SFU" abaixo) — funciona bem até
  ~6-8 pessoas com câmera ligada ao mesmo tempo por canal; para 20 pessoas com vídeo
  simultâneo de forma robusta, o próximo passo é migrar para um SFU.

## Como rodar

### Pré-requisito: PostgreSQL
Rode um Postgres local (ou use Docker: `docker run -e POSTGRES_PASSWORD=senha -p 5432:5432 postgres`).

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env        # edite DATABASE_URL e JWT_SECRET
npx prisma migrate dev --name init
npm run dev
```
Sobe em `http://localhost:4000`.

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env        # ajuste se necessário
npm run dev
```
Abre em `http://localhost:5173`.

## Fluxo de uso
1. Crie uma conta (registro).
2. Clique no "+" na barra lateral esquerda para criar um servidor (vem com um canal
   de texto "geral" e um canal de voz "Geral" por padrão).
3. Crie mais canais de texto/voz com o "+" ao lado de cada categoria.
4. Entre em um canal de voz para ligar microfone, câmera e compartilhar tela.
5. Compartilhe o servidor com outras pessoas dando a elas o `serverId` (endpoint
   `POST /api/servers/:serverId/join` — ainda não tem UI de "entrar por convite",
   é um próximo passo simples de adicionar se precisar).

## Sobre o SFU (não implementado nesta versão)
A arquitetura atual é **mesh P2P**: cada participante de um canal de voz conecta
diretamente com todos os outros. Isso é simples e já funciona, mas escala mal com
vídeo em grupos grandes, porque cada pessoa precisa *enviar* sua própria câmera uma
vez para cada outro participante.

Para suportar 20 pessoas com vídeo simultâneo de forma confiável, o caminho é trocar
por um **SFU** (Selective Forwarding Unit) — um servidor de mídia que recebe cada
stream uma única vez e redistribui, tirando a carga de upload do cliente. As opções
mais diretas de integrar:
- **LiveKit** (open-source, tem versão cloud gerenciada e self-hosted, SDK React pronto)
- **mediasoup** (mais baixo nível, mais controle, mais trabalho de integração)

Essa troca exigiria: (1) você criar uma conta/deploy do LiveKit (ou similar) e me
passar as credenciais (URL + API key/secret), e (2) eu troco a camada de sinalização
WebRTC (`useVoiceChannel.js` no frontend, e o bloco de eventos `webrtc:*`/`voice:*`
no backend) pela integração com o SDK do LiveKit — o resto do app (auth, servidores,
canais, chat) não muda nada.

## Limitações restantes
- Sem TURN server: redes com NAT restritivo podem falhar ao conectar em voz/vídeo.
- Sem UI de "entrar em servidor por convite" (só a rota de API existe).
- Sem cargos/permissões (todo membro pode criar canais).
