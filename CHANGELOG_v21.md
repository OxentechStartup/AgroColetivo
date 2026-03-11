# AgroColetivo v21 — Changelog

## Bugs corrigidos

### 1. Enum `user_role` — erro crítico de banco
- `auth.js` → `fetchPivosAdmin()`: removido `'pivot'` do filtro (não existe no enum). Agora usa `.eq('role', 'pivo')`
- `hooks/usePivos.js`: removido `'admin'` do filtro de pivôs (admin não é pivô). Agora filtra só `'pivo'`
- `lib/campaigns.js`: removido `|| role === 'pivot'` do if de rota de pivo
- `App.jsx`: removida chave morta `pivot` do objeto `ALLOWED`
- `components/Sidebar.jsx`: removida chave `pivot` do `ROLE_LABELS`; corrigido fallback de `ri` (duplo `??` errado)
- `components/Topbar.jsx`: corrigido `role` padrão de `'pivot'` para `'pivo'`

### 2. Race condition ao deletar cotação
- `CampaignsPage.jsx`: `setSelectedId` agora é chamado *antes* do `await deleteCampaign`, evitando flash de tela vazia. Se a deleção falhar, restaura a seleção original.

### 3. Validação inválida em ProducerOrderModal
- Removida condição `maxQty === 0` (nunca atingível via UI, já que `0` não é um `maxQty` válido configurável)

## UX / UI melhorado

### 4. LoginPage — hint clicável
- O texto "Novo aqui? Crie sua conta." e "Já tem conta? Faça login." agora são botões clicáveis que trocam de aba automaticamente, em vez de texto morto

### 5. NewCampaignModal — layout do formulário
- Campo "Máximo por pedido" estava sozinho em um `grid-2` quebrando o layout. Agora fica ao lado do campo "Prazo" — aproveitando a grade corretamente

### 6. Topbar — papel do usuário visível
- Adicionado badge de papel (Pivô / Admin / Fornecedor) abaixo do nome na topbar para todos os roles, não apenas na sidebar

### 7. VendorPivosPage — label de admin corrigida
- Admins exibidos como "⭐ Administrador" e pivôs como "🌱 Pivô / Gestor" (antes: "🌱 Coordenador Pivô" para ambos)
