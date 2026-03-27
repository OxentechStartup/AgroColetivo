# 🚀 Guia de Configuração do Sistema Realtime Completo

Este guia explica como configurar e usar o novo sistema de interação em tempo real do AgroColetivo.

## 📋 Índice

1. [Arquitetura](#arquitetura)
2. [Configuração Inicial](#configuração-inicial)
3. [Hooks Disponíveis](#hooks-disponíveis)
4. [Componentes Visuais](#componentes-visuais)
5. [Exemplos de Uso](#exemplos-de-uso)
6. [Melhores Práticas](#melhores-práticas)

---

## 🏗️ Arquitetura

O sistema de realtime é baseado em 3 camadas:

### Layer 1: Contextos Globais

- **AppContext/AppProvider** - Gerencia dados gerais (campanhas, orders, vendors)
- **UserPresenceContext/UserPresenceProvider** - Gerencia presença de usuários online

### Layer 2: Hooks Customizados

- **useAppData()** - Acesso ao AppContext
- **useUserPresence()** - Acesso ao UserPresenceContext
- **useRealtimeSync()** - Sincronizar dados automaticamente
- **useTypingIndicator()** - Detectar digitação

### Layer 3: Componentes Visuais

- **OnlineUsers** - Mostrar usuários online
- **TypingIndicator** - Mostrar quando alguém está digitando

---

## ⚙️ Configuração Inicial

### 1. Envolver a App com os Providers

```jsx
// src/main.jsx
import { AppProvider } from "./context/AppProvider";
import { UserPresenceProvider } from "./context/UserPresenceProvider";

function App() {
  return (
    <AppProvider>
      <UserPresenceProvider>
        <YourApp />
      </UserPresenceProvider>
    </AppProvider>
  );
}
```

### 2. Criar Tabelas no Supabase (se não existirem)

```sql
-- Tabela para atividades de usuários
CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  campaign_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para eventos do sistema
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  campaign_id UUID,
  actor_id UUID REFERENCES auth.users(id),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

---

## 🎣 Hooks Disponíveis

### `useAppData()`

Acessa dados globais da aplikação.

```javascript
const {
  // Autenticação
  user,
  isAuthenticated,
  profile,
  login,
  logout,

  // Campanhas
  campaigns,
  vendors,
  addCampaign,
  updateCampaign,
  reloadCampaign,

  // Pedidos
  addOrder,
  updateOrder,
  deleteOrder,

  // Notificações
  notifications,
  addNotification,
  liveNotifications,

  // Produtos
  liveProducts,

  // Eventos
  systemEvents,

  // Status
  realTimeActive,
} = useAppData();
```

### `useUserPresence()`

Acessa informações de presença de usuários.

```javascript
const {
  onlineUsers, // { userId: { user_id, user_name, status, ... } }
  userActivity, // { userId: { type, timestamp, ... } }
  updateUserPresence, // (status, campaignId) => void
  recordActivity, // (type, campaignId, details) => void
  isUserOnline, // (userId) => boolean
  getUserStatus, // (userId) => 'active' | 'inactive' | 'typing' | 'offline'
  getOnlineUsersInCampaign, // (campaignId) => User[]
} = useUserPresence();
```

### `useRealtimeSync(campaignId, onSync, deps)`

Sincronizar dados da campanha em tempo real.

```javascript
const { sync, isRealTimeActive } = useRealtimeSync(campaignId, () => {
  console.log("Dados sincronizados!");
});

// Chamar sync() manualmente quando necessário
await sync();
```

### `useTypingIndicator(campaignId)`

Detectar quando usuário está digitando.

```javascript
const { onInput } = useTypingIndicator(campaignId);

<input onInput={onInput} onBlur={() => updateUserPresence("active")} />;
```

---

## 🎨 Componentes Visuais

### `<OnlineUsers />`

Mostra usuários online em uma campanha.

```jsx
import { OnlineUsers } from "../components/OnlineUsers";

<OnlineUsers campaignId="campaign-123" maxDisplay={5} />;
```

Props:

- `campaignId` (string, opcional) - ID da campanha (se omitido, mostra todos online)
- `maxDisplay` (number, default: 5) - Máximo de usuários a exibir

### `<TypingIndicator />`

Mostra quando alguém está digitando.

```jsx
import { TypingIndicator } from "../components/TypingIndicator";

<TypingIndicator campaignId="campaign-123" />;
```

Props:

- `campaignId` (string) - ID da campanha

---

## 💡 Exemplos de Uso

### Exemplo 1: Página com Sincronização Realtime

```jsx
import { useAppData } from "../hooks/useAppData";
import { useRealtimeSync } from "../hooks/useRealtimeSync";
import { OnlineUsers } from "../components/OnlineUsers";
import { TypingIndicator } from "../components/TypingIndicator";

export function CampaignPage({ campaignId }) {
  const { campaigns, addNotification } = useAppData();
  const { sync, isRealTimeActive } = useRealtimeSync(campaignId, () => {
    addNotification({
      title: "Dados sincronizados",
      message: "Alterações de outros usuários carregadas",
      type: "success",
    });
  });

  const campaign = campaigns.find((c) => c.id === campaignId);

  return (
    <div>
      <h1>{campaign?.name}</h1>

      {/* Mostrar usuários online na campanha */}
      <OnlineUsers campaignId={campaignId} />

      {/* Mostrar indicador de digitação */}
      <TypingIndicator campaignId={campaignId} />

      {/* Status de realtime */}
      {isRealTimeActive ? (
        <p style={{ color: "green" }}>🟢 Realtime ativo</p>
      ) : (
        <p style={{ color: "red" }}>🔴 Realtime inativo</p>
      )}

      <button onClick={sync}>Sincronizar agora</button>
    </div>
  );
}
```

### Exemplo 2: Caixa de Texto com Indicador de Digitação

```jsx
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { useUserPresence } from "../hooks/useUserPresence";
import { useState } from "react";

export function CommentInput({ campaignId }) {
  const [comment, setComment] = useState("");
  const { onInput } = useTypingIndicator(campaignId);
  const { updateUserPresence } = useUserPresence();

  return (
    <div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onInput={onInput}
        onBlur={() => updateUserPresence("active")}
        placeholder="Escreva seu comentário..."
      />
    </div>
  );
}
```

### Exemplo 3: Dashboard com Atividade do Sistema

```jsx
import { useAppData } from "../hooks/useAppData";

export function ActivityFeed() {
  const { systemEvents } = useAppData();

  return (
    <div>
      <h2>Atividade no Sistema</h2>
      {systemEvents.map((event) => (
        <div key={event.id}>
          <strong>{event.type}</strong>
          <p>{new Date(event.created_at).toLocaleString()}</p>
          <pre>{JSON.stringify(event.payload, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

---

## 📚 Melhores Práticas

### 1. Sempre Usar Hooks, Nunca Acessar Contexto Diretamente

❌ **Não faça:**

```javascript
import AppContext from "../context/AppContext";
const context = useContext(AppContext);
```

✅ **Faça:**

```javascript
import { useAppData } from "../hooks/useAppData";
const { campaigns, addNotification } = useAppData();
```

### 2. Colocar os Providers no Nível Mais Alto Possível

```jsx
// src/main.jsx
ReactDOM.render(
  <AppProvider>
    <UserPresenceProvider>
      <App />
    </UserPresenceProvider>
  </AppProvider>,
  document.getElementById("root"),
);
```

### 3. Usar `useRealtimeSync` Para Páginas que Precisam Sincronizar

```jsx
export function CampaignPage({ campaignId }) {
  useRealtimeSync(campaignId, () => {
    console.log("Dados atualizados!");
  });

  // O hook cuida automaticamente da sincronização
}
```

### 4. Lembrar de Atualizar Presença ao Sair de uma Página

```jsx
useEffect(() => {
  return () => {
    updateUserPresence("inactive"); // Ao desmontar o componente
  };
}, [updateUserPresence]);
```

### 5. Não Abusar do `recordActivity`

`recordActivity` salva no banco de dados, então use com moderação:

```javascript
// ✅ Bom - registra ações importantes
recordActivity("campaign_created", campaignId);
recordActivity("order_submitted", campaignId);

// ❌ Ruim - registra cada keystroke
input.addEventListener("keydown", () =>
  recordActivity("keystroke", campaignId),
);
```

---

## 🔧 Troubleshooting

### Usuários não aparecem como online?

1. Verificar se `UserPresenceProvider` está envolvendo a aplicação
2. Verificar se o Supabase tem realtime habilitado
3. Verificar console para erros de conexão

### Dados não sincronizam?

1. Verificar se `AppProvider` está envolvendo a aplicação
2. Verificar se `useRealtimeSync` está sendo usado na página
3. Verificar se RLS policies estão corretas no Supabase

### Performance ruim com muitos usuários?

1. Limitar quantidade de eventos mantidos em `systemEvents` (já faz limite de 50)
2. Usar `maxDisplay` em `OnlineUsers` para não renderizar muitos avatares
3. Considerar usar `useMemo` e `useCallback` para otimizar re-renders

---

## 📖 Referências

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [React Context API](https://react.dev/reference/react/createContext)
- [React Hooks](https://react.dev/reference/react)
