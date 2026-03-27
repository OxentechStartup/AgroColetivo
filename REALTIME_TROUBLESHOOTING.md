# 🔧 Troubleshooting - Realtime

## 🚨 Erro: "isAuthenticated is not defined"

### ❌ Problema

```
ReferenceError: isAuthenticated is not defined at AppContent (App.jsx:397:8)
```

### ✅ Solução

**JÁ CORRIGIDO!** Este erro foi resolvido adicionando `isAuthenticated` ao destructuring de `useAuth()`.

**Localização da correção:** [src/App.jsx](src/App.jsx#L101-L105)

```javascript
// ANTES (❌ ERRADO)
const { user, loading, error, signIn, signUp, signOut } = useAuth();

// DEPOIS (✅ CORRETO)
const {
  user,
  isAuthenticated, // ← Adicionado
  loading: authLoading,
  error: authError,
  signIn,
  signUp,
  signOut,
  deleteUserAccount,
  pendingVerificationUser,
  onEmailVerified,
  refreshUser,
} = useAuth();
```

---

## 🟡 Status Fica Vermelho (🔴)

### Sintomas

- Indicador no canto inferior direito está **vermelho**
- Dados não sincronizam
- Notificações não aparecem

### Causas Possíveis

#### 1️⃣ Usuário não autenticado

```javascript
// Solução: Fazer login
```

#### 2️⃣ Sem conexão com Internet

```javascript
// Solução: Verificar conexão
// O app tentará reconectar automaticamente
```

#### 3️⃣ Supabase desligado

```javascript
// Verificar: Abrir console (F12)
// Procure por: "Firebase/Supabase connection error"
```

#### 4️⃣ RLS (Row Level Security) bloqueando

```sql
-- Verificar em: supabase dashboard → Authentication → RLS
-- RLS deve ter políticas que permitem read/write
```

### ✅ Como Resolver

1. **Abra Console (F12)**
2. **Procure por ERROR messages**
3. **Se vir auth error:** Faça logout e login novamente
4. **Se vir connection error:** Recarregue página (F5)
5. **Se persistir:** Verifique na [dashboard Supabase](https://supabase.com/)

---

## 📬 Nova Proposta Não Aparece

### Sintomas

- Proposta enviada em outro navegador não aparece
- Alerta "Nova Proposta" não mostra
- Dashboard não atualiza

### Diagnóstico

#### Passo 1: Verificar Console

```javascript
// F12 → Console tab
// Procure por:
// ✅ "✅ Subscrições em tempo real ativadas"
// Se não houver, realtime não inicializou
```

#### Passo 2: Verificar Indicador

```javascript
// Canto inferior direito
// Se vermelho 🔴 → Sem conexão
// Se verde 🟢 → Conectado, problema noutra coisa
```

#### Passo 3: Verificar RLS

```sql
-- Abra Supabase
-- Tables → vendor_campaign_offers
-- RLS policies → Verificar se seu usuário tem acesso READ
```

### ✅ Solução

```javascript
// TESTE 1: Sincronizar Manualmente
// Clique botão "Sincronizar" (se houver)

// TESTE 2: Fazer F5 e esperar 2 segundos
// Dashboard deve atualizar sozinha

// TESTE 3: Se ainda não funciona
// Log out → Log in novamente
```

---

## ⚠️ Performance Lenta

### Sintomas

- Abrir dashboard lenta
- Muitas requisições
- Notificações atrasadas

### Causas

#### 1️⃣ Muitas subscrições ativas

```javascript
// Sistema monitora 8 tabelas:
// campaigns, orders, lots, offers, vendors, products, notifications, events
// Isso é normal, não deixa app lento
```

#### 2️⃣ Muitos dados carregando

```javascript
// Se tiver 1000+ campanhas, é pesado
// Solução: Adicionar paginação
```

#### 3️⃣ Browser com muitas abas

```javascript
// Fechar abas não usadas
// Usar modo incógnito para testar isolado
```

### ✅ Como Otimizar

```javascript
// Adicionar filtros/paginação em páginas grandes
// Exemplo em CampaignsPage:
const [page, setPage] = useState(0);
const pageSize = 20;
const paginated = campaigns.slice(page * pageSize, (page + 1) * pageSize);
```

---

## 🔴 Alerta "Nova Proposta" Não Desaparece

### Sintomas

- Alerta continua mostrando
- Clicker no X não remove
- Persiste após reload

### Solução

```javascript
// Alerta desaparece automaticamente após 5 segundos
// Se não desaparecer:

// 1. Reload página (F5)
// 2. Log out e in novamente
// 3. Limpar browser cache (Ctrl+Shift+Delete)
```

---

## 🟡 Indicador de Sincronização Pisca

### Normal?

```
SIM! É normal piscar ao sincronizar.
Significa:
🟢 Conectado e sincronizando
🔄 Momento de atualização
```

### Problema?

```
Se piscar CONSTANTEMENTE (mais de 1x por segundo):
1. Verificar conexão (pode tá lenta)
2. Verificar se outro navegador tá spammando updates
```

---

## 👥 OnlineUsers Não Mostra Ninguém

### Diagnóstico

```javascript
// 1. Abra Console
// Procure por presenceObject log
// Se não vir, UserPresenceProvider não inicializou

// 2. Verifique quantos usuários online
// Código em useAppData.js:
const onlineUsers = userPresenceList.filter(
  (u) => u.status !== "offline" && u.campaignId === filter,
);
```

### ✅ Solução

```javascript
// Verificar se há vários navegadores/usuários
// OnlineUsers não mostra a si mesmo
// Mínimo 2 usuários para ver algo

// Testar com 2 navegadores:
// Window 1: Gestor
// Window 2: Vendor
// Ambos na mesma página
```

---

## 🔌 Desconexão Inesperada

### Sintomas

- Indicador muda de 🟢 para 🔴
- Mensagem de desconexão aleatória
- Reconecta sozinho depois

### Causas

1. **Perda de Internet** (reconecta automaticamente)
2. **Tab perdeu focus** (normal, conserva batteryLife)
3. **Sessão expirou** (fazer login novamente)

### ✅ Comportamento Normal

```javascript
// Supabase realtime:
// 1. Usa heartbeat a cada 30 segundos
// 2. Se perder resposta, tenta reconectar
// 3. Máximo 3 tentativas
// 4. Depois marca como offline
```

---

## ❌ Componentes Não Aparecem

### RealtimeStatusIndicator Desapareceu?

```javascript
// Verifique em App.jsx:
// <RealtimeStatusIndicator /> deve estar renderizado

// Se não encontrar:
// Abra src/App.jsx
// Procure por: return (
// Deve ter <RealtimeStatusIndicator /> no JSX
```

### OnlineUsers Não Renderiza?

```javascript
// Verifique que página tem:
import { OnlineUsers } from "../components/OnlineUsers";

// E está dentro de um return() com:
<OnlineUsers campaignId={campaignId} maxDisplay={6} />;
```

---

## 📊 Debugging Avançado

### Ver logs de Realtime

```javascript
// Abra DevTools (F12)
// Console tab
// Filtre por "realtime" ou "presence"

// Você verá:
// ✅ Subscrições ativadas
// 🔄 Dados sincronizados
// 👥 Usuários online/offline
// 💬 Notificações adicionadas
```

### Verificar Conexão Supabase

```javascript
// Console:
const { supabase } = window.__app_context || {};
const status = await supabase.auth.getSession();
console.log(status); // Mostra se autenticado
```

### Monitorar Subscrições

```javascript
// Em AppProvider.jsx, procure por:
// console.log("✅ Subscrições em tempo real ativadas")
// Se ver múltiplas mensagens, há leak de memória
```

---

## 🆘 Problema Não Listado?

### Quick Steps

1. **F5** (reload)
2. **Log out + Log in**
3. **Ctrl+Shift+Delete** (limpar cache)
4. **Fechar outros navegadores**
5. **Reiniciar browser**

Se ainda não funcionar:

- Abra [REALTIME_DOCS.md](REALTIME_DOCS.md) para debug aprofundado
- Verificar browser console para erros específicos
- Contatar desenvolvedor com a mensagem de erro exata

---

## 📞 Support

| Problema                | Solução                       |
| ----------------------- | ----------------------------- |
| Nada funciona           | F5 + Log out/in               |
| Vermelho offline        | Verificar Internet            |
| Dados não atualizam     | Console log → verificar erros |
| Performance lenta       | Fechar abas, filtrar dados    |
| Componentes desaparecem | Verificar App.jsx             |

---

**Última atualização:** 2024  
**Sistema:** AgroColetivo Realtime v1.0  
**Status:** ✅ Completamente Funcional
