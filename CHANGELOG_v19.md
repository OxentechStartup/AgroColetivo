# AgroColetivo v19 — Changelog

## Mudanças principais

### 1. Login por e-mail
- Campo "usuário" substituído por e-mail em toda a tela de login e registro
- Validação de formato de e-mail antes de enviar
- Banco atualizado: coluna `email` em `admin_users` (schema v4)

### 2. Dashboard melhorado (pivô e admin)
- Cards clicáveis que navegam para a página certa
- **Alertas inteligentes**: pendentes, cotações acima de 80% da meta, cotações sem fornecedor
- **Top Produtores**: ranking dos produtores mais ativos
- **Histórico resumido** das cotações encerradas com valor transacionado
- Taxa de 1,5% da plataforma já exibida no dashboard

### 3. Taxa 1,5% visível na cotação
- Banner azul mostra o valor da taxa calculado sobre o total da cotação ativa
- Fornecedor vê a taxa estimada também no modal de envio de preço

### 4. Aba de cotações simplificada
- Botão "Fazer Pedido" (WhatsApp) disponível sempre que houver fornecedores cadastrados
- Layout mais limpo; feeBanner destaca a taxa de 1,5%

### 5. Fornecedor se cadastra sozinho
- Tela de cadastro expandida para role "Fornecedor": nome da empresa, telefone, cidade, produtos
- Ao criar conta como vendor, o registro na tabela `vendors` é criado automaticamente
- Pivô **não pode mais** adicionar fornecedores manualmente; a aba Fornecedores foi removida

### 6. Fazendeiro lembrado automaticamente
- No modal de adicionar pedido, ao digitar o WhatsApp o sistema busca o produtor no banco
- Se encontrado, o nome é preenchido automaticamente + indicador verde "Produtor encontrado"
- Um produtor pode participar de múltiplas cotações sem precisar se recadastrar

### 7. Aba Fornecedores removida
- Contato com fornecedores agora exclusivo pelo botão **"Fazer Pedido"** / **"Enviar Preço"** em Cotações
- O botão "Manifestar interesse via WhatsApp" na visão do fornecedor permite contato direto

### Extras / segurança
- Sidebar mostra nome/empresa do usuário logado
- Navegação respeitada por role (vendor não acessa dashboard, pivot não acessa monitoramento)
- Schema SQL v4 totalmente idempotente

