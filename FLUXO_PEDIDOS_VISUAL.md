# 📈 Guia Visual: Fluxos de Pedidos - AgroColetivo

> Diagramas e guias rápidos visualizando o fluxo de pedidos

---

## 1. VISTA GERAL: De Onde Vos Dados Vêm e Para Onde Vão

```
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE (DATABASE)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  campaigns   │  │    orders    │  │    buyers    │           │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤           │
│  │ id           │  │ id           │  │ id           │           │
│  │ product      │  │ campaign_id  │  │ name         │           │
│  │ status       │  │ buyer_id ────┼──┼─ id          │           │
│  │ pivo_id      │  │ qty          │  │ phone        │           │
│  │ deadline     │  │ status       │  │              │           │
│  │ ...          │  │ submitted_at │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         ▲                  ▲                  ▲                  │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ SELECT           │ SELECT           │ INSERT/SELECT
          │ (campaigns)      │ (orders)         │ (buyers)
          │                  │                  │
    ┌─────┴──────────────────┴──────────────────┴─────────┐
    │                                                       │
    │        useCampaigns.js (HOOK)                        │
    │  ┌──────────────────────────────────────────┐       │
    │  │ loadAll() → fetchCampaigns, fetchOrders  │       │
    │  │ reload() → mesmo que loadAll()           │       │
    │  │ reloadCampaign(id) → só 1 campanha      │       │
    │  │ addOrder() → createOrder() + reload()   │       │
    │  └──────────────────────────────────────────┘       │
    │                      │                              │
    │  setState            │  campaigns: [],              │
    │  campaigns[]  ◀──────┴─  vendors: [],               │
    │  vendors[]           │  loading: bool               │
    │                      │  error: string               │
    └──────────────────────┴──────────────────┐           │
                                              │           │
                  ┌───────────────────────────┘           │
                  │                                        │
    ┌─────────────┴──────────────────────────┐           │
    │                                         │           │
    │    AppContext (CENTRALIZED STATE)      │           │
    │  ┌──────────────────────────────────┐  │           │
    │  │ campaigns ← [...]                │  │           │
    │  │ vendors ← [...]                  │  │           │
    │  │ addOrder(), reload(), etc ←func  │  │           │
    │  └──────────────────────────────────┘  │           │
    │                                         │           │
    └─────────────────────────────────────────┘           │
             ▲                                │           │
             │  useContext(AppContext)       │           │
             │                               │           │
    ┌────────┴──────────┬────────────────────┴────┐      │
    │                   │                         │      │
┌───┴────────┐  ┌──────┴──────┐  ┌──────────────┴──┐  │
│CampaignsPage│  │DashboardPage│  │VendorDashboard  │  │
├─────────────┤  ├─────────────┤  ├─────────────────┤  │
│ campaigns[] │  │ campaigns[] │  │ campaigns[]     │  │
│ orders[]    │  │ (read-only) │  │ vendors[]       │  │
│ addOrder()  │  │             │  │ ownVendor       │  │
│ reload()    │  │             │  │ reload()        │  │
└─────────────┘  └─────────────┘  └─────────────────┘  │
    │ UI            │ UI              │ UI             │
    └──────────────┬─────────────────┬──────────────────┘
                   │                 │
              USER SEES DATA KEPT IN SYNC
```

---

## 2. CRONOGRAMA: Um Pedido Desde o Clique Até a Tela

```
TEMPO: 0ms
├─ 👤 User clica "Adicionar pedido"
│  └─ State local: showOrder = true
│  └─ RENDER: ProducerOrderModal aparece
│
├─ 👤 User preenche: "João", "(11) 99999", "500 kg"
│  └─ State local no Modal: producerName, phone, qty
│  └─ RENDER: Cada keystroke atualiza campo
│
TEMPO: ~1000ms (User clica "Enviar")
├─ ⚙️ onSave callback dispara
│  ├─ Espera: findOrCreateProducer("João", "(11) 99999")
│  │  └─ Query: SELECT * FROM buyers WHERE phone = '11999999'
│  │  └─ Se não existe: INSERT new buyer
│  │  └─ TEMPO: ~20ms (se não existe) ou ~5ms (se existe)
│  │
│  ├─ Espera: createOrder(campaignId, buyer.id, 500, "approved")
│  │  └─ INSERT INTO orders VALUES (...)
│  │  └─ TEMPO: ~10ms
│  │
│  └─ logEvent() + notifyManagerNewOrder()
│     └─ INSERT event log
│     └─ Dispara worker que envia email em BG
│     └─ TEMPO: ~50ms (log) + email em background
│
TEMPO: ~1100ms (reload() começa)
├─ 🔄 reload() dispara (com await)
│  │
│  ├─ PARALELO: fetchCampaigns(user), fetchVendors(user)
│  │  └─ TEMPO: ~100ms
│  │
│  ├─ PARALELO: fetchAllOrdersForCampaigns([...]), fetchAllLotsForCampaigns([...])
│  │  └─ TEMPO: ~150ms (pode variar com volume)
│  │
│  └─ groupBy(), normalizeOrder(), setCampaigns(newState)
│     └─ TEMPO: ~5ms (agrupamento em memória)
│
TEMPO: ~1250ms
├─ 🎨 React detecta setState (campaigns[])
│  ├─ Compara novo vs antigo
│  ├─ re-render dos componentes que consomem context
│  └─ TEMPO: ~20ms
│
TEMPO: ~1270ms
├─ ✅ Novo pedido visível na TabOrders
│  ├─ campaign.orders[] agora tem novo pedido
│  ├─ UI mostra: "João ... 500 kg"
│  └─ TEMPO: render complete
│
TEMPO: ~1300ms
└─ 🚪 Modal fecha (onSave sucesso)
   └─ showOrder = false
   └─ RENDER: Modal desaparece

TEMPO TOTAL: ~300ms (perceptível ao user)
```

---

## 3. GUIA RÁPIDO: Onde Criar/Editar/Deletar Pedidos

```
┌─────────────────────────────────────────────────────┐
│ AÇÃO: CRIAR NOVO PEDIDO                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ QUEM: Gestor/Admin em CampaignsPage.jsx            │
│ COMO: Clica "Adicionar pedido" → ProducerOrderModal│
│ FUNÇÃO CHAMADA: context.addOrder(campaignId, data) │
│ DEPOIS: await context.reload()                     │
│ STATUS: "approved" (direto aprovado)               │
│                                                     │
│ Arquivo: addOrder em useCampaigns.js linhas 390-420│
│ Dependencies:                                       │
│  ├─ findOrCreateProducer() [producers.js]          │
│  ├─ createOrder() [campaigns.js]                   │
│  ├─ notifyManagerNewOrder() [notifications.js]     │
│  └─ logEvent() [events.js]                         │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AÇÃO: CRIAR PEDIDO PENDENTE (Buyer via Portal)      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ QUEM: Produtor/Buyer em ProducerPortalPage.jsx    │
│ COMO: Preenche form no portal → Clica "Comprar"   │
│ FUNÇÃO: await supabase.from("orders").insert(...)  │
│ STATUS: "approved" (criado direto)                 │
│ DEPOIS: Modal fecha, re-busca BuyerOrderStatusPage │
│                                                     │
│ Nota: ProducerPortalPage NON usa AppContext!      │
│       Faz queries diretas ao Supabase              │
│                                                     │
│ Arquivo: ProducerPortalPage.jsx (sem linhas fixas) │
│          função anônima em handleOrder()           │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AÇÃO: APROVAR PEDIDO PENDENTE                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│ QUEM: Gestor em CampaignsPage (TabOrders)          │
│ COMO: Vê "✓ Pendentes" seção → Clica "Aprovar"   │
│ FUNÇÃO: await context.approvePending(campId, ordId)│
│ DEPOIS: await context.reload()                     │
│ RESULTADO: order.status = "approved"               │
│            Move de pendingOrders[] para orders[]    │
│                                                     │
│ Arquivo: useCampaigns.js linhas 440-444            │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AÇÃO: REJEITAR PEDIDO PENDENTE                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ QUEM: Gestor em CampaignsPage (TabOrders)          │
│ COMO: Clica botão "X" next to "Aprovar"            │
│ FUNÇÃO: await context.rejectPending(campId, ordId) │
│ DEPOIS: await context.reload()                     │
│ RESULTADO: order.status = "rejected"               │
│            Removido de UI (BuyerOrderStatusPage)   │
│                                                     │
│ Arquivo: useCampaigns.js linhas 445-449            │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AÇÃO: DELETAR PEDIDO                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ QUEM: Gestor em CampaignsPage (pode implementar)   │
│ COMO: Botão "🗑️ Deletar" ao lado do pedido        │
│ FUNÇÃO: await context.removeOrder(campId, ordId)   │
│ DEPOIS: await context.reload()                     │
│ RESULTADO: DELETE FROM orders WHERE id = ordId     │
│                                                     │
│ Arquivo: useCampaigns.js linhas 424-427            │
│ Nota: UI NÃO implementa botão delete ainda         │
│       (removeOrder existe mas sem UI)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. QUICK REF: Estados de Um Pedido

```
            ┌─────────────────────────────────────┐
            │ CRIAÇÃO DO PEDIDO                  │
            │ (por Gestor ou Buyer)              │
            │ INSERT INTO orders (qty, status)   │
            └─────────────────────────────────────┘
                         │
                    status = ?
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    "approved"      "pending"       (nunca "rejected")
    (direto do      (vem de buyer    na criação, então
     gestor)         via portal)     entra pendente →
         │               │            aguarda gestor)
         │               │
         ▼               ▼
    campaign.orders[]  campaign.pendingOrders[]
    (já conta para     (aguardando approvePending())
     metas)            │
                       │
                 ┌─────┴──────┐
                 │            │
                 ▼            ▼
            Aprovar        Rejeitar
      approvePending()  rejectPending()
            │                │
            ▼                ▼
       "approved"      "rejected"
    (move para orders) (BuyerOrderStatus
                        neq('rejected'))
                       │
                       ▼
                   ESCONDIDO
                   (não aparece)

STATE DIAGRAM MATURITY:
   PENDING → APPROVED (✓ happy path)
         └─  REJECTED (✗ recusado)

Queries importantes:
- campaign.orders[] = orders WHERE status = 'approved'
- campaign.pendingOrders[] = orders WHERE status = 'pending'
- BuyerOrderStatusPage = orders WHERE status <> 'rejected'
```

---

## 5. PADRÃO: Como Adicionar Novo Botão que Modifica Pedidos

**Exemplo: Botão "Cancelar Pedido" para Buyer**

### **PASSO 1: Criar Função em campaigns.js**

```javascript
// src/lib/campaigns.js

export async function cancelOrderByBuyer(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "cancelled" }) // novo status
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

### **PASSO 2: Criar em useCampaigns.js**

```javascript
// src/hooks/useCampaigns.js (linha ~450)

const cancelOrder = useCallback(
  async (campaignId, orderId) => {
    await cancelOrderByBuyer(orderId);
    logEvent(campaignId, EVENT.ORDER_CANCELLED, { orderId }, user?.id);
    await reloadCampaign(campaignId);
  },
  [user]
);

// Adicionar ao return {}
return {
  ...,
  cancelOrder,  // ← novo
};
```

### **PASSO 3: Expor em AppProvider.jsx**

```javascript
// src/context/AppProvider.jsx (linha ~65)

const {
  ...,
  cancelOrder,  // ← novo
} = useCampaigns(user);

const contextValue = {
  ...,
  cancelOrder,  // ← novo
};
```

### **PASSO 4: Usar em BuyerOrderStatusPage.jsx**

```javascript
// src/pages/BuyerOrderStatusPage.jsx (novo botão)

function OrderCard({ order, onCancel }) {
  return (
    <div>
      <h3>{order.campaign.product}</h3>
      <p>Qtd: {order.qty}</p>

      {order.status === "approved" && ( // só se aprovado
        <Button variant="outline" onClick={() => onCancel(order.id)}>
          <X size={14} /> Cancelar
        </Button>
      )}
    </div>
  );
}

// No component pai:
<OrderCard
  order={order}
  onCancel={async (orderId) => {
    try {
      await context.cancelOrder(campaignId, orderId);
      showToast("Pedido cancelado");
      // Recarregar lista
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error) {
      showToast(error.message, "error");
    }
  }}
/>;
```

---

## 6. DECISÃO ÁRVORE: Qual `reload()` Usar?

```
Você fez uma ação que modifica dados?
│
├─→ sim (criar, editar, deletar)
│  │
│  └─→ Afeta MÚLTIPLAS campanhas?
│     │
│     ├─ SIM (ex: mudou role do user, deletou campanha)
│     │  └─ await context.reload()
│     │     └─ Recarrega TUDO (campaigns[], vendors[], etc)
│     │
│     └─ NÃO (ex: criou pedido em campanha específica)
│        └─ await context.reloadCampaign(campaignId)
│           └─ Recarrega SÓ essa campanha (mais rápido)
│
└─→ não (só leitura)
   └─ Nada precisa fazer
      └─ Dados já estão no context
```

**Exemplos Práticos:**

| Ação | Função | reload() ou reloadCampaign()? |
|------|--------||----|
| Criar pedido | `addOrder()` | `reloadCampaign(id)` |
| Acei proposta (lote) | `acceptOffer()` | `reloadCampaign(id)` |
| Definir frete | `saveFinancials()` | `reloadCampaign(id)` |
| Publicar campanha | `publishToVendors()` | `reload()` (afeta filtro vendor) |
| Deletar campanha | `deleteCampaign()` | `reload()` (lista muda) |
| Deletar vendor | `deleteVendor()` | `reload()` (lista vendors muda) |

---

## 7. TROUBLESHOOTING: Por Que Não Vejo o Novo Pedido?

```
CHECKSUM:

[ ] Novo pedido criado?
    └─ Verifique DB (Supabase console)
    └─ SELECT * FROM orders WHERE campaign_id = 'xxx'

[ ] reload() foi chamado?
    └─ Procure `await context.reload()` ou `await context.reloadCampaign()`
    └─ Se falta, adicionar!
    └─ Certifique-se que está APÓS o addOrder()

[ ] reload() completou?
    └─ Adicione console.log ANTES e DEPOIS:
       console.log("antes de reload");
       await context.reload();
       console.log("depois de reload, campaigns:",
         context.campaigns.find(c => c.id === campaignId)?.orders
       );

[ ] Estado foi atualizado?
    └─ No React DevTools, inspecione AppContext.campaigns
    └─ Veja se campaign[n].orders[] tem novo pedido

[ ] Componente re-renderizou?
    └─ Procure por console.log no início do component
    └─ Se re-log não aparece = problema with useContext re-render
    └─ Verify que component usa useContext(AppContext)

AINDA NÃO FUNCIONA?

1️⃣ Verifique rede (DevTools Network tab)
   └─ Supabase request foi bem-sucedido? (200 OK?)

2️⃣ Verifique console do browser (DevTools Console)
   └─ Érro JSON? Erro de acesso à DB?
   └─ Erro de permissão RLS (Row Level Security)?

3️⃣ Teste com reload() ao invés reloadCampaign()
   └─ reload() é mais "pesado" mas mais confiável

4️⃣ Limpe React cache
   └─ Dev extenção → Gears → Reset
   └─ Reload página (F5)
```

---

## 8. ESTRUTURA: Todos os Arquivos Envolvidos no Fluxo

```
SRC
├─ context/
│  ├─ AppContext.jsx ..................... Contexto definido
│  └─ AppProvider.jsx .................... Provedor (consumidor de useCampaigns)
│
├─ hooks/
│  └─ useCampaigns.js .................... CENTRAL: addOrder, reload, etc
│
├─ lib/
│  ├─ campaigns.js ....................... createOrder(), updateOrderStatus()
│  ├─ producers.js ....................... findOrCreateProducer()
│  ├─ notifications.js ................... notifyManagerNewOrder()
│  ├─ events.js .......................... logEvent()
│  └─ supabase.js ........................ Cliente Supabase
│
├─ pages/
│  ├─ CampaignsPage.jsx .................. PRINCIPAL: UI para Gestor
│  │  ├─ Imports: context.addOrder()
│  │  ├─ Chama: context.reload()
│  │  └─ Nela: ProducerOrderModal
│  │
│  ├─ DashboardPage.jsx .................. Dashboard (read-only)
│  │  └─ Imports: context.campaigns[] (apenas lê)
│  │
│  ├─ ProducerPortalPage.jsx ............. Portal Buyer
│  │  ├─ NÃO usa AppContext
│  │  ├─ Query direto Supabase
│  │  ├─ Chama: BuyerOrderStatusPage
│  │  └─ Nela: Header, CampaignsList
│  │
│  ├─ BuyerOrderStatusPage.jsx ........... Lookup por telefone
│  │  ├─ NÃO usa AppContext
│  │  ├─ fetchBuyerOrdersWithOffers(phone)
│  │  └─ Component interno (dentro de ProducerPortalPage)
│  │
│  └─ VendorDashboardPage.jsx ............ Dashboard Vendor
│     ├─ Imports: context.campaigns[], context.reload()
│     ├─ Chama: createOffer()
│     └─ Com await: context.reload()
│
├─ components/
│  ├─ ProducerOrderModal.jsx ............ Modal para criar pedido
│  │  └─ Callback onSave = addOrder + reload
│  │
│  ├─ NotificationBell.jsx .............. Bell com notificações
│  │  └─ Lê: context.notifications[]
│  │
│  └─ ... (outros componentes UI)
│
└─ utils/
   ├─ masks.js ........................... mascara de valores
   └─ data.js ............................ cálculos (totalOrdered, etc)
```

---

## 9. PERFORMANCE: Tempos Esperados

```
Operação           Tempo Esperado    Notas
────────────────────────────────────────────────────────────
findOrCreateProducer         ~10ms   Se existe no DB
                             ~20ms   Se precisa INSERT

createOrder                  ~10ms   INSERT simples

logEvent                     ~50ms   INSERT + índices

notifyManagerNewOrder        ~10ms   Retorna logo,
                                     email é async

reload() com 10 campanhas    ~200ms  4 queries + agrupar
reload() com 50 campanhas    ~500ms  Pode ficar lento

reloadCampaign()             ~50ms   1 query + update state

React re-render              ~20ms   Reconciliação + paint

TOTAL (User → Novo Pedido)   ~300ms  Perceptível mas OK
                             ~1s     Começar ficar lento
                             >2s     User fica irritado
```

---

**FIM do Guia Visual**
