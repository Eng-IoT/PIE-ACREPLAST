# Correção aplicada — Menu fixo com rolagem independente

## Melhorias implementadas

- O menu lateral agora fica fixo na lateral da tela em desktop.
- A área principal possui rolagem própria, sem arrastar o menu junto.
- O menu lateral possui rolagem própria, permitindo navegar por todas as abas sem mover a tela principal.
- No smartphone, ao tocar em uma aba do menu, o menu recolhe automaticamente.
- Foi adicionada barra de rolagem discreta para menu e área principal.

## Arquivos alterados

- `src/App.tsx`
- `src/components/Sidebar.tsx`
- `src/index.css`

## Comportamento esperado

### Desktop

- Menu permanece fixo.
- Conteúdo rola separadamente.
- Menu rola separadamente quando houver muitas abas.

### Smartphone Android/iOS

- Botão hambúrguer abre o menu.
- Ao selecionar uma aba, o menu fecha automaticamente.
- A página escolhida abre normalmente.
