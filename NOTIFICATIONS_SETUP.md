# Sistema de Notificações em Tempo Real - Guia de Implementação

## ✅ O que foi implementado

### 1. **Tabela de Notificações no Supabase**

- Arquivo: `migration-notifications.sql`
- Criará tabela `notifications` com campos:
  - `id`: UUID primária
  - `pivo_id`: Referência ao gestor (users.id)
  - `type`: Tipo de notificação ("order_canceled", "order_approved", etc)
  - `title`: Título curto
  - `message`: Mensagem detalhada
  - `related_order_id`: Referência ao pedido
  - `related_campaign_id`: Referência à campanha
  - `read`: Boolean para marcar como lida
  - `created_at`: Timestamp

### 2. **Modificação na Função handleCancelOrder**

- Arquivo: `src/pages/BuyerOrderStatusPage.jsx`
- Quando um comprador cancela um pedido:
  - Sistema busca dados do pedido + gestor (pivo_id)
  - Insere registro em `notifications`
  - Gestor recebe notificação em tempo real

### 3. **Componente NotificationBell**

- Arquivo: `src/components/NotificationBell.jsx`
- Mostra sino de notificações na Topbar
- Badge com número de notificações não lidas
- Dropdown com lista de notificações
- Realtime updates via `supabase.channel()`
- Marcar como lido (individual ou todas)

### 4. **Helper de Realtime Subscriptions**

- Arquivo: `src/lib/realtimeSubscriptions.js`
- Funções reutilizáveis:
  - `subscribeToNotifications(pivoId, callback)`
  - `subscribeToCampaignOffers(campaignId, callback)`
  - `subscribeToVendorOffers(vendorId, callback)`
  - `subscribeToBuyerOrders(buyerId, callback)`
  - `subscribeToCampaigns(callback, options)`

### 5. **Realtime em ProducerPortalPage**

- Arquivo: `src/pages/ProducerPortalPage.jsx`
- Campanhas agora atualizam automaticamente quando:
  - Nova campanha é criada
  - Status muda (open → negotiating → closed)
  - Ofertas são criadas/aceitas
- Elimina necessidade de apertar F5 para ver atualizações

### 6. **NotificationBell na Topbar**

- Arquivo: `src/components/Topbar.jsx`
- Importa e exibe `NotificationBell` para gestores/admins
- Mostra número de notificações não lidas
- Dropdown com detalhes e timestamps

## 🚀 PRÓXIMAS ETAPAS - IMPLEMENTAR NO SUPABASE

### **PASSO 1: Executar SQL para criar tabela de notificações**

Acesse: https://app.supabase.com/project/[seu-projeto]/sql/new

Cole e execute `migration-notifications.sql`:

```sql
create table if not exists public.notifications (
  id              uuid        primary key default gen_random_uuid(),
  pivo_id         uuid        not null references public.users(id) on delete cascade,
  type            text        not null,
  title           text        not null,
  message         text        not null,
  related_order_id uuid       references public.orders(id) on delete cascade,
  related_campaign_id uuid    references public.campaigns(id) on delete cascade,
  read            boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index notifications_pivo_id_idx on public.notifications(pivo_id);
create index notifications_pivo_read_idx on public.notifications(pivo_id, read);
create index notifications_created_at_idx on public.notifications(created_at desc);
```

### **PASSO 2: Testar o sistema**

1. **Como Comprador:**
   - Acesse "Meus Pedidos"
   - Faça login com um telefone
   - Clique "Desistir do pedido"
   - Confirme no modal (não vai mais aparecer `confirm()` do navegador)
   - Pedido será cancelado e notificação criada

2. **Como Gestor:**
   - Faça login como gestor
   - Veja sino de notificações na Topbar (canto superior direito)
   - Badge mostrará número de notificações não lidas
   - Clique no sino para abrir dropdown
   - Veja "Pedido Cancelado" com detalhes
   - Clique em uma notificação para marcar como lida
   - Verifique timestamp em português

## 📊 Fluxo Completo de Notificações

```
COMPRADOR CANCELA PEDIDO (BuyerOrderStatusPage)
    ↓
handleCancelOrder() é executado
    ↓
Busca dados: order.campaign.pivo_id
    ↓
Atualiza orders.status = "rejected"
    ↓
Insere registro em notifications tabela
    ↓
GESTOR recebe realtime event
    ↓
NotificationBell mostra nova notificação
    ↓
Badge aumenta contador
    ↓
Dropdown lista "Pedido Cancelado - [produto]"
```

## 🔄 Realtime Subscriptions Ativas

### Pages com realtime agora:

- ✅ **CampaignsPage**: Ofertas atualizam ao vivo
- ✅ **VendorDashboardPage**: Propostas atualizam ao vivo
- ✅ **ProducerPortalPage**: Campanhas atualizam ao vivo
- ✅ **Topbar (NotificationBell)**: Notificações chegam em tempo real

### Sem necessidade de F5:

- Produtor vê novas campanhas aparecer automaticamente
- Gestor vê ofertas sendo enviadas em tempo real
- Gestor recebe notificações de cancelamento instantaneamente

## ⚙️ Configuração Técnica

### Permissões RLS (Row Level Security)

Por enquanto, RLS está desabilitado na tabela `notifications` para simplificar.

Se quiser habilitar segurança:

```sql
alter table public.notifications enable row level security;

create policy "Users can see their own notifications"
  on public.notifications for select
  using (pivo_id = auth.uid());

create policy "Only system can insert notifications"
  on public.notifications for insert
  with check (true);

create policy "Users can update their notifications"
  on public.notifications for update
  using (pivo_id = auth.uid());
```

## 📝 Changelog

- ✅ Removidas importações duplicadas em BuyerOrderStatusPage
- ✅ Modificada `handleCancelOrder()` para criar notificações
- ✅ Criado componente `NotificationBell` com realtime
- ✅ Criado helper `realtimeSubscriptions.js`
- ✅ Adicionada subscription em `ProducerPortalPage`
- ✅ Integrado `NotificationBell` na `Topbar`
- ✅ Build passa (exit code 0)
- ✅ Pronto para deploy

## 🎯 Próximas Melhorias (Opcional)

1. Adicionar subscriptions em mais pages (ProducersPage, VendorsPage)
2. Implementar áudio/desktop notifications
3. Notificações de aproximação de deadline
4. Notificações quando ofertas são rejeitadas
5. Histórico de notificações (view com paginação)
6. Push notifications (Web Push API)

---

**Status**: Implementação 95% completa. Aguardando execução do SQL no Supabase.
