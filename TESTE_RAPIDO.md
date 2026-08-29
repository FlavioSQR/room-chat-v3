# ⚡ Teste Rápido - room-chat-v3

## 🚀 Start em 2 Terminais

### Terminal 1 - Backend:
```bash
cd ~/room-chat-v3/backend
npm start
# Esperado: "Servidor rodando na porta 4000"
```

### Terminal 2 - Frontend:
```bash
cd ~/room-chat-v3/frontend
npm run dev
# Esperado: http://localhost:5173/
```

---

## ✅ Teste Rápido (5 min)

### Aba 1 (João):
1. http://localhost:5173/
2. Username: `João`
3. Botão "Criar sala" → nome: `Teste`
4. Botão "Convidar" → copiar link

### Aba 2 (Maria):
1. Colar link do convite
2. Username: `Maria`
3. Enter

### ✅ Verificar:
- ✅ Notificação verde "Bem-vindo à Teste! 🎉"?
- ✅ Sidebar com participantes (João, Maria)?
- ✅ Chat pronto para usar?
- ✅ Digitar mostra "está digitando..."?
- ✅ Avatares coloridos com iniciais?

---

## 🎉 Se Passou em Tudo:

Fazer commit:
```bash
cd ~/room-chat-v3
git add frontend/src/App.jsx \
        frontend/src/components/TextChannelView.jsx \
        frontend/src/styles.css

git commit -m "✨ Melhorar UX: auto-select de canal, notificações, sidebar de participantes"

git push origin Dev
```

---

**Status**: Pronto para testar! 🧪
