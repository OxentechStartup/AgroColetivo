# 🌾 AgroColetivo — Plataforma de Compras Coletivas

Sistema MVP para consolidação de demanda de insumos rurais em Tabuleiro/MG.

## Tecnologias

- **React 18** + **Vite 5**
- **CSS Modules** (sem UI library externa)
- **React Hooks** customizados

## Como rodar

```bash
npm install
npm run dev
```

Acesse: `http://localhost:5173`

## Estrutura de arquivos

```
src/
├── styles/
│   └── global.css              # Variáveis CSS e utilitários globais
├── utils/
│   └── data.js                 # Mock data, helpers e funções utilitárias
├── hooks/
│   ├── useCampaigns.js         # Estado e ações das cotações
│   └── useToast.js             # Toast notifications
├── components/
│   ├── Button.jsx / .module.css
│   ├── Badge.jsx  / .module.css
│   ├── Card.jsx   / .module.css
│   ├── Modal.jsx  / .module.css
│   ├── ProgressBar.jsx / .module.css
│   ├── Toast.jsx       / .module.css
│   ├── Sidebar.jsx     / .module.css
│   ├── Topbar.jsx      / .module.css
│   ├── NewCampaignModal.jsx
│   ├── ProducerOrderModal.jsx
│   ├── ShareModal.jsx / .module.css
│   └── SetPriceModal.jsx / .module.css
├── pages/
│   ├── DashboardPage.jsx / .module.css
│   ├── CampaignsPage.jsx / .module.css
│   ├── ProducersPage.jsx / .module.css
│   └── ProducerPortalPage.jsx / .module.css
├── App.jsx / App.module.css
└── main.jsx
```

## Páginas

| Rota (SPA)    | Descrição |
|---------------|-----------|
| Dashboard     | Visão geral com estatísticas |
| Cotações      | CRUD de campanhas + pedidos + compartilhamento |
| Produtores    | Lista todos produtores e seus pedidos |
| Portal Produtor | Interface mobile-first para o fazendeiro |

## Próximos passos (pós-MVP)

- [ ] Integração com backend (Supabase ou Firebase)
- [ ] Autenticação real (magic link por SMS)
- [ ] Notificações WhatsApp via API (Z-API / Evolution API)
- [ ] Sistema de pagamento (PIX)
- [ ] PWA para instalação no celular
