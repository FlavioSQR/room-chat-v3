# 🚀 Deploy no Render

## Configuração Rápida

### 1. Crie um novo Web Service no Render

**Backend:**
- **Repository:** Seu repositório Git
- **Branch:** Dev
- **Runtime:** Node
- **Build Command:** `cd backend && npm install`
- **Start Command:** `node src/index.js`
- **Environment Variables:**
  ```
  DATABASE_URL=postgresql://[user]:[pass]@[host]/[db]
  JWT_SECRET=[gerar-uuid-seguro]
  PORT=4000
  CLIENT_URL=https://seu-frontend.onrender.com
  AUTH_DISABLED=false
  SIMPLE_AUTH=true
  ```

**Frontend:**
- **Repository:** Mesmo repositório
- **Branch:** Dev
- **Runtime:** Node
- **Build Command:** `cd frontend && npm install && npm run build`
- **Start Command:** `cd frontend && npm run preview`
- **Environment Variables:**
  ```
  VITE_API_URL=https://room-chat-backend.onrender.com/api
  VITE_SOCKET_URL=https://room-chat-backend.onrender.com
  VITE_AUTH_DISABLED=true
  ```

### 2. Database

Use PostgreSQL no Render ou configure sua DATABASE_URL manualmente.

### 3. Deploy

Push para a branch `Dev`:
```bash
git push origin Dev
```

Render vai fazer deploy automaticamente.

---

## URLs Finais

- **Frontend:** `https://seu-frontend.onrender.com`
- **Backend:** `https://seu-backend.onrender.com`
- **API:** `https://seu-backend.onrender.com/api`

---

## Troubleshooting

### Build falha
- Certifique que `npm install` roda sem erros localmente
- Verifique as variáveis de ambiente

### API não conecta
- Verifique CORS no backend: `origin: process.env.CLIENT_URL`
- Confirme URLs no frontend .env

### Database não conecta
- Verifique DATABASE_URL está correto
- Rode migrations: `npx prisma migrate deploy`
