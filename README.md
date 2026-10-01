# 🐾 ItaPets

Site de um petshop, desenvolvido com HTML, CSS e JavaScript. O projeto apresenta a loja e seus produtos, tem carrinho de compras e favoritos, e envia pedidos e mensagens de contato pelo WhatsApp.

🔗 **Acesse o site:** https://jmatheus-dev.github.io/ItaPets/

---

## 📄 Páginas

| Página | Descrição |
|---|---|
| `index.html` | Página inicial com categorias e produtos em destaque |
| `produtos.html` | Catálogo com busca, filtros e ordenação |
| `produtos/*.html` | Uma página para cada produto |
| `contato.html` | Informações e formulário de contato |

## ✨ Funcionalidades

- **Página inicial:** carrossel com 4 slides (troca sozinho a cada 6 segundos, com setas, pontos e botão de pausar) e produtos em destaque.
- **Catálogo:** filtros por categoria, preço e marca e ordenação feitos só com CSS (`:has()` e `:target`), busca por nome ou marca sem diferenciar acentos e aviso quando nenhum produto atende aos filtros.
- **Carrinho:** fica salvo no navegador, mostra a quantidade no cabeçalho e abre um painel lateral para mudar quantidades, remover itens (com opção de desfazer) e finalizar o pedido pelo WhatsApp com a lista e o total prontos.
- **Favoritos:** coração em cada produto, contador no cabeçalho e painel próprio, de onde dá para mandar os favoritos para o carrinho.
- **Página do produto:** botões de − e + na quantidade, lupa na foto ao passar o mouse, botão de compartilhar e a lista "Vistos recentemente".
- **Contato:** validação dos campos, contador de caracteres e envio da mensagem pelo WhatsApp.
- **Detalhes:** avisos rápidos de confirmação, botão de voltar ao topo, atalho `/` para a busca e prévias de link (Open Graph) ao compartilhar o site.

## 🛠️ Tecnologias utilizadas

- **HTML5** para a estrutura das páginas
- **CSS3** para a estilização e o layout
- **Bootstrap 5.3** (via CDN) para a grade, o menu e os painéis
- **JavaScript** puro (`js/main.js`) para carrinho, favoritos, busca e formulário

## ⚙️ Configuração

O número do WhatsApp que recebe os pedidos e as mensagens fica no começo de `js/main.js`, na constante `WHATSAPP` (só dígitos, com 55 e o DDD). O número atual, `(79) 90000-0000`, é provisório e também aparece no rodapé e na página de contato.

## 📁 Estrutura do projeto

```
ItaPets/
├── css/
│   └── style.css         # Folha de estilos
├── js/
│   └── main.js           # Carrinho, favoritos, busca, contato e outros recursos
├── imagens/
│   ├── categorias/       # Ícones das categorias da página inicial
│   ├── favicon/          # Ícones do site (aba do navegador e atalho no celular)
│   ├── icones/           # Ícones do cabeçalho (carrinho e favoritos)
│   ├── produtos/         # Fotos dos produtos (normal e miniatura)
│   ├── banner-pets.webp  # Ilustração do banner
│   └── logo-itapets.webp # Logo da loja
├── produtos/             # Página de cada produto
├── index.html            # Página inicial
├── produtos.html         # Catálogo de produtos
├── contato.html          # Página de contato
└── README.md
```

## 🚀 Como executar localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/jmatheus-dev/ItaPets.git
   ```
2. Abra a pasta do projeto no VS Code.
3. Abra o `index.html` com a extensão **Live Server** (botão "Go Live").

Não é necessário instalar nenhuma dependência. Abrir o `index.html` direto no navegador também funciona, mas com um servidor local o comportamento fica igual ao do site publicado.

## 👨‍💻 Autor

Desenvolvido por **José Matheus**, estudante de Sistemas da Informação na UFS.

[![GitHub](https://img.shields.io/badge/GitHub-jmatheus--dev-181717?logo=github)](https://github.com/jmatheus-dev)
