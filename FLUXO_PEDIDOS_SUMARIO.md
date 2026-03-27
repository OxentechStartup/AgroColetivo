# ⚡ SUMÁRIO EXECUTIVO: Fluxo de Pedidos AgroColetivo

> Resumo em 2 páginas do que você precisa saber

---

## A. ENTENDER EM 30 SEGUNDOS

```
🎯 Tudo on AgroColetivo é "campanhas" (cotações de produtos)

📊 appContext centraliza TUDO:
   ├─ campaigns[] = campanhas com pedidos
   ├─ addOrder() = função p/ criar pedido
   └─ reload() = função p/ sincronizar do DB

🔀 Um pedido tem status:
   ├─ "approved" = aprovado (conta pra meta)
   └─ "pending" = aguardando gestor revisar

⚡ PADRÃO SEMPRE:
   await addOrder(campaignId, data)
   await context.reload()  // ← OBRIGATÓRIO

✅ Tudo no AppProvider.jsx (src/context/)
```

---

## B. ONDE VAI CADA TIPO DE USUÁRIO

| Tipo       | Página                                    | O que Faz                                 | Dados                                    |
| ---------- | ----------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| **Gestor** | CampaignsPage                             | Cria pedidos, aceita lotes, define frete  | `campaigns[].orders[]` via AppContext    |
| **Admin**  | Dashboard + CampaignsPage                 | Vê tudo, mesmas ações do gestor           | `campaigns[]` via AppContext             |
| **Vendor** | VendorDashboardPage                       | Envia propostas (lotes), não cria pedidos | `campaigns[]` sem orders, via AppContext |
| **Buyer**  | ProducerPortalPage + BuyerOrderStatusPage | Cria pedidos, consulta status             | Query direto Supabase (SEM AppContext)   |

---

## C. FLUXO EM 5 PASSOS

```
1. USER CLICA "ADICIONAR PEDIDO"
   └─ Modal ProducerOrderModal abre

2. USER PREENCHE E ENVIA
   └─ context.addOrder(campaignId, {producerName, phone, qty})
   └─ Internamente:
      ├─ Busca/cria Produtor
      ├─ INSERT order no DB
      └─ Envia email de notificação

3. reload() CHAMADO
   └─ await context.reload()
   └─ Busca campaigns[], vendors[], todos os orders, todos os lots
   └─ Agrupa orders por campaign_id

4. AppContext ATUALIZADO
   └─ setState({ campaigns: [...novo...] })

5. TELA RE-RENDERIZA
   └─ campaign.orders[] agora tem novo pedido
   └─ Modal fecha
   └─ Novo pedido aparece em TabOrders
```

---

## D. CÓDIGO: Template Mínimo para Adicionar Função

```javascript
// ✅ 1. CRIAR em campaigns.js
export async function meuCreateOrder(...) {
  const { data, error } = await supabase.from("orders").insert(...)
  if (error) throw new Error(error.message)
  return data
}

// ✅ 2. EXPOR em useCampaigns.js
const meuOrder = useCallback(async (campaignId, ...) => {
  await campaigns.meuCreateOrder(...)
  await reloadCampaign(campaignId)
}, [...])

// return {..., meuOrder}

// ✅ 3. REGISTRAR em AppProvider.jsx
const { ..., meuOrder } = useCampaigns(user)
const contextValue = { ..., meuOrder }

// ✅ 4. USAR em CampaignsPage.jsx
try {
  await context.meuOrder(...)
  showToast("Sucesso!")
  await context.reload()  // opcional se já chamou em step 2
} catch (e) {
  showToast(e.message, "error")
}
```

---

## E. reload() vs reloadCampaign()

```javascript
// ✅ RÁPIDO: atualiza 1 campanha
await context.reloadCampaign(campaignId);
// Quando usar: após criar pedido, lote, mudar frete

// ✅ SEGURO: recarrega TUDO
await context.reload();
// Quando usar: após algo que afete múltiplas campanhas
```

---

## F. DADOS: Quem Tem Acesso

```
CampaignsPage (GESTOR/ADMIN)
  ├─ campaigns[].orders[]         ✓ pode ver
  ├─ campaigns[].pendingOrders[]  ✓ pode ver
  ├─ campaigns[].lots[]           ✓ pode ver
  └─ Ações: addOrder, approvePending, rejectPending, addLot

DashboardPage (ADMIN/GESTOR)
  ├─ campaigns[]                  ✓ só leitura
  └─ Ações: nenhuma

ProducerPortalPage (BUYER)
  ├─ campaigns[] (open ou negotiating)  ✓
  └─ Pega dados daqui (não AppContext)

BuyerOrderStatusPage (BUYER)
  ├─ Lookup por telefone do buyer
  ├─ Seus pedidos + propostas
  └─ SEM AppContext

VendorDashboardPage (VENDOR)
  ├─ Campanhas where ele pode cotar        ✓
  ├─ SEM orders[] (Vendor não vê pedidos)
  ├─ Propriedades vendors[] + ownVendor
  └─ Ações: createOffer, reload()
```

---

## G. CHECKLIST: Implementar Nova Feature

- [ ] **1. Criar função DB em `lib/campaigns.js`**
  - `export async function ...() { await supabase.from(...).insert/update/delete(...) }`
  - Validar com `if (error) throw new Error(...)`

- [ ] **2. Expor em `hooks/useCampaigns.js`**
  - `const myFunc = useCallback(async (...) => { ... }, [...])`
  - Chamar `logEvent()` pra logging
  - Chamar `reloadCampaign()` ou `reload()`
  - Adicionar ao `return { ..., myFunc }`

- [ ] **3. Registrar em `context/AppProvider.jsx`**
  - Import da função
  - Add ao `contextValue = { ..., myFunc }`

- [ ] **4. Usar em página (CampaignsPage, etc)**
  - `try { await context.myFunc(...) }`
  - `await context.reload()` (se necessário)
  - `catch { showToast(error.message, "error") }`

- [ ] **5. Testar**
  - Supabase console: dados foram salvos?
  - Browser DevTools: estado foi atualizado?
  - UI: novo dados aparece na tela?

---

## H. PROBLEMAS COMUNS

| Problema                      | Causa                                | Solução                                               |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------- |
| Novo pedido não aparece       | Faltou `await reload()`              | Adicionar `await context.reload()`                    |
| Erro "AppProvider não config" | Component fora de Provider           | Verificar App.jsx, envolver com `<AppProvider>`       |
| JSON error no console         | RLS (Row Level Security) do Supabase | Verificar permissões no cabeçalho do Supabase console |
| reload() muito lento          | Muitas campanhas                     | Usar `reloadCampaign(id)` para 1 específica           |
| Dados divergem entre users    | Sem realtime                         | Adicionar realtime listeners (Supabase)               |

---

## I. ESTRUTURA DE PASTAS KEY

```
src/
 ├─ context/
 │  ├─ AppContext.jsx ................. <Context>
 │  └─ AppProvider.jsx ................ Provider + hook useCampaigns
 │
 ├─ hooks/
 │  └─ useCampaigns.js ................ addOrder, reload, reloadCampaign
 │
 ├─ lib/
 │  ├─ campaigns.js ................... createOrder, updateOrderStatus
 │  └─ producers.js ................... findOrCreateProducer
 │
 ├─ pages/
 │  ├─ CampaignsPage.jsx .............. Gestor: full CRUD pedidos
 │  ├─ DashboardPage.jsx .............. Admin/Gestor: leitura
 │  ├─ ProducerPortalPage.jsx ......... Buyer: cria pedidos
 │  └─ VendorDashboardPage.jsx ........ Vendor: envia propostas
 │
 └─ components/
    ├─ ProducerOrderModal.jsx ......... Form + addOrder
    └─ NotificationBell.jsx ........... Mostra notificações
```

---

## J. REFERÊNCIA RÁPIDA: FUNÇÕES

```javascript
// ─────────────────────────────────────────────────────
// CRIAR (INSERT)
// ─────────────────────────────────────────────────────

// Crear novo pedido (Gestor)
await context.addOrder(campaignId, {
  producerName: "João Silva",
  phone: "(11) 99999-9999",
  qty: 500,
});
await context.reload();

// Criar pendente (Buyer via portal)
// Direto no Supabase sem AppContext

// ─────────────────────────────────────────────────────
// MUDAR STATUS
// ─────────────────────────────────────────────────────

// Aprovar pendente
await context.approvePending(campaignId, orderId);

// Rejeitar
await context.rejectPending(campaignId, orderId);

// ─────────────────────────────────────────────────────
// SINCRONIZAR
// ─────────────────────────────────────────────────────

// Recarrega TUDO
await context.reload();

// Recarrega 1 campanha
await context.reloadCampaign(campaignId);

// ─────────────────────────────────────────────────────
// DELETAR (não tem UI, mas código existe)
// ─────────────────────────────────────────────────────

await context.removeOrder(campaignId, orderId);
await context.reload();
```

---

## K. LEMBRETE: O Padrão Ouro

```javascript
// ✅ SEMPRE ASSIM:

try {
  // 1. Fazer ação que altera dados
  await context.addOrder(...)

  // 2. RECARREGAR (obrigatório)
  await context.reload()

  // 3. Feedback ao user
  showToast("Pedido criado! ✓")

  // 4. Fechar modal/navegar
  setShowModal(false)

} catch (error) {
  // 5. Erros
  showToast(error.message, "error")
  // Modal fica aberto pra retry
}
```

---

**Leia os docs completos para detalhes:**

- `FLUXO_PEDIDOS_ANALISE.md` — Tudo em profund
