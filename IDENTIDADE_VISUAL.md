# IDENTIDADE VISUAL - HUBCOMPRAS

Versao: 1.0  
Data: 2026-04-06

## 1. Objetivo

Este documento define os padroes visuais do HubCompras para manter consistencia em todas as telas (login, dashboards, formularios, modais e notificacoes).

Objetivos principais:

- manter unidade visual entre telas
- acelerar desenvolvimento de novas interfaces
- reduzir retrabalho de UI/UX
- garantir legibilidade e acessibilidade

Escopo atual:

- baseado na tela de login atual
- alinhado com tokens de src/styles/global.css

## 2. Essencia da Marca

Direcao visual:

- Agro + tecnologia + confianca operacional
- visual limpo, moderno e funcional
- destaque para tons de verde com suporte azul

Pilares:

- Clareza: interface direta, sem excesso visual
- Controle: componentes previsiveis e consistentes
- Confianca: contraste, hierarquia e estados claros

## 3. Sistema de Cores

## 3.1 Paleta Primaria

- Primaria: #059669
- Primaria hover: #047857
- Primaria clara: #10b981
- Primaria dim: #ecfdf5
- Primaria borda: #a7f3d0

## 3.2 Suporte Secundario

- Azul de apoio: #1d6ec9
- Azul hover: #1558b0
- Azul base global: #2563eb

## 3.3 Neutros

- Fundo app: #f8fafc
- Fundo secundario: #f1f5f9
- Superficie principal: #ffffff
- Borda padrao: #e2e8f0
- Texto principal: #0f172a
- Texto secundario: #475569
- Texto terciario: #94a3b8

## 3.4 Cores Semanticas

- Sucesso: usar familia primaria (verde)
- Alerta: #d97706 e variacoes amber
- Erro: #dc2626 e variacoes red
- Info: usar familia blue

## 3.5 Gradientes Oficiais

Gradiente de acao (botao principal):

```css
linear-gradient(90deg, #059669, #1d6ec9)
```

Gradiente/overlay da area hero com imagem (login):

```css
background:
  linear-gradient(180deg, rgba(5, 38, 33, 0.14) 0%, rgba(6, 36, 59, 0.26) 100%),
  linear-gradient(
    135deg,
    rgba(0, 128, 89, 0.42) 0%,
    rgba(0, 107, 74, 0.3) 44%,
    rgba(26, 98, 151, 0.42) 100%
  );
```

Regra:

- evitar incluir novas cores fora da paleta sem justificativa funcional
- evitar roxo como cor de destaque

## 4. Tipografia

Familia principal:

- Inter, system-ui, sans-serif

Pesos recomendados:

- 400: corpo
- 500/600: apoio e labels
- 700: botoes, subtitulos
- 800: titulos principais

Escala base (global):

- --text-xs: 0.72rem
- --text-sm: 0.8rem
- --text-base: 0.875rem
- --text-md: 0.95rem
- --text-lg: 1.05rem
- --text-xl: 1.2rem
- --text-2xl: 1.5rem

Hierarquia recomendada:

- H1 de pagina: 1.75rem a 2rem, peso 800
- Titulo hero: clamp(2.35rem, 4vw, 3.1rem), peso 800
- Corpo principal: 0.88rem a 1rem
- Label de formulario: 0.7rem, uppercase, tracking leve

## 5. Layout e Proporcoes

Padrao de tela de entrada (split):

- Area visual: flex 1.35
- Area de autenticacao: flex 0.65

Comportamento responsivo:

- <= 1024px: esconder lado visual
- <= 768px: layout 100% formulario, foco em usabilidade
- <= 480px: reduzir espacamentos e altura de inputs/botoes

Larguras e containers:

- authContainer max-width: 340px
- visualContent width: min(560px, 100%)

## 6. Espacamento e Forma

Escala de espacamento (base 4):

- 4, 6, 8, 10, 12, 14, 16, 18, 24, 32, 40, 52

Raios:

- --r: 8px
- --r-lg: 12px
- --r-xl: 20px

Uso tipico:

- inputs: 10px
- stat cards: 12px
- chips: 999px

## 7. Componentes Base

## 7.1 Botao Primario

Padrao:

- altura: 46px
- radius: 10px
- peso: 700
- gradiente oficial verde-azul
- sombra verde suave

Estados:

- hover: opacidade 0.92 + shift vertical sutil
- disabled: opacidade reduzida e cursor bloqueado

## 7.2 Inputs

Padrao:

- altura: 44px
- fundo: --surface2
- borda: --border
- icone a esquerda

Focus:

- borda primaria
- ring suave: rgba(13, 155, 110, 0.12)

## 7.3 Cards de Destaque

Uso:

- dados sinteticos e ganhos operacionais
- fundo translcido no hero

Padrao:

- fundo branco com baixa opacidade
- borda clara
- titulo forte + descricao curta

## 7.4 Chips/Badges

Uso:

- estado de seguranca, confianca, status de fluxo

Padrao:

- radius full
- verde dim de fundo
- borda verde leve
- texto pequeno em caixa normal

## 8. Iconografia

Biblioteca:

- Lucide

Regras:

- manter consistencia de tamanho por contexto (13, 15, 18)
- icones sem excesso de ornamentacao
- usar icone para reforcar sentido, nao para decorar

## 9. Imagem e Overlay

Regra da area visual:

- imagem fotografica agricola em cover
- overlay com dois gradientes suaves para legibilidade
- opacidade da imagem ajustada para preservar contraste

Diretriz:

- texto deve continuar legivel mesmo com troca de imagem
- em imagens mais claras, aumentar intensidade do overlay

## 10. Sombra e Profundidade

Sombras globais:

- --shadow-sm
- --shadow
- --shadow-lg

Uso recomendado:

- formularios e cards com profundidade leve
- evitar sombra pesada em massa

## 11. Acessibilidade

Regras minimas:

- contraste minimo WCAG AA (texto normal)
- foco visivel em todos os elementos interativos
- tamanho alvo de toque minimo em mobile
- nao depender apenas de cor para sinalizar erro/sucesso

Formularios:

- labels sempre visiveis
- estados de erro com mensagem textual
- placeholders nao substituem labels

## 12. Tom de Interface

Idioma:

- Portugues brasileiro

Tom:

- claro, profissional e objetivo
- orientado a acao e operacao

Padroes de texto:

- titulos curtos e diretos
- descricoes em uma frase de valor
- botoes com verbos de acao: Entrar, Criar conta, Publicar

## 13. Do e Dont

Fazer:

- usar tokens globais sempre que possivel
- reaproveitar componentes base
- manter hierarquia de texto e espacamento

Evitar:

- inventar nova paleta por tela
- misturar estilos de borda/radius sem criterio
- usar fontes diferentes da familia principal
- criar animacoes chamativas sem funcao

## 14. Checklist para Novas Telas

- usa paleta oficial (verde + azul de apoio + neutros)
- usa tipografia e escala global
- respeita espacamento e raios padrao
- possui estados de hover, focus e disabled
- esta legivel em 1024, 768 e 480
- atende contraste minimo e navegacao por teclado

## 15. Fonte de Verdade Atual

Arquivos de referencia:

- src/styles/global.css
- src/pages/LoginPage.module.css

Regra de governanca:

- qualquer mudanca estrutural de identidade visual deve atualizar este documento
- toda nova tela deve ser validada com base neste guia antes de release
