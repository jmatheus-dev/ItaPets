"use strict";

// Pasta raiz do site, descoberta pelo endereço deste arquivo (js/main.js).
// Assim os links funcionam tanto na raiz quanto em produtos/.
const RAIZ = new URL("../", document.currentScript.src);

// Número da loja no WhatsApp (só dígitos, com 55 e DDD). É para ele que vão
// os pedidos do carrinho e as mensagens do formulário de contato.
const WHATSAPP = "5579900000000";

const CHAVES = {
  carrinho: "itapets-carrinho",
  favoritos: "itapets-favoritos",
  vistos: "itapets-vistos",
};
const QUANTIDADE_MAXIMA = 20;

const reais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ICONES = {
  coracao: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.6-4.6-9.4-9.4C1.3 7.6 3.6 4 7.1 4c2.1 0 3.6 1.1 4.9 2.9C13.3 5.1 14.8 4 16.9 4c3.5 0 5.8 3.6 4.5 7.1-1.8 4.8-9.4 9.4-9.4 9.4z"/></svg>`,
  compartilhar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>`,
  seta: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15"/></svg>`,
};

/* ---------- Utilidades ---------- */

// "Ração Cães" -> "racao caes", para a busca ignorar acentos e maiúsculas.
function normalizar(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

// "R$ 189,90" -> 18990 (centavos, evita erro de arredondamento).
function centavos(texto) {
  return Math.round(
    Number(texto.replace(/[^\d,]/g, "").replace(",", ".")) * 100,
  );
}

const dinheiro = (valorEmCentavos) => reais.format(valorEmCentavos / 100);

const limitarQuantidade = (valor) =>
  Math.min(QUANTIDADE_MAXIMA, Math.max(1, Math.round(Number(valor)) || 1));

// "produtos/racao-premium-caes-adultos-15kg.html" -> "racao-premium-caes-adultos-15kg"
function slugDoEndereco(endereco) {
  return new URL(endereco, location.href).pathname
    .split("/")
    .pop()
    .replace(/\.html$/, "");
}

const paginaDoProduto = (slug) =>
  new URL(`produtos/${encodeURIComponent(slug)}.html`, RAIZ).href;
const fotoDoProduto = (slug) =>
  new URL(
    `imagens/produtos/${encodeURIComponent(slug)}-miniatura.webp`,
    RAIZ,
  ).href;
const linkDoWhatsApp = (texto) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

// Tudo que vem do localStorage passa por aqui antes de entrar no HTML.
function escapar(texto) {
  return String(texto).replace(
    /[&<>"']/g,
    (caractere) => `&#${caractere.charCodeAt(0)};`,
  );
}

function criarElemento(html) {
  const modelo = document.createElement("template");
  modelo.innerHTML = html.trim();
  return modelo.content.firstElementChild;
}

/* ---------- Dados guardados no navegador ---------- */

// Se o localStorage estiver bloqueado (alguns modos anônimos), as listas
// continuam funcionando enquanto a página estiver aberta.
const reserva = {};

function ler(chave, padrao) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? padrao;
  } catch {
    return reserva[chave] ?? padrao;
  }
}

function gravar(chave, valor) {
  reserva[chave] = valor;
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // segue só com a reserva em memória
  }
  sincronizar();
}

// Lê { slug: { nome, preco, ... } } descartando qualquer item malformado.
function lerProdutos(chave) {
  const dados = ler(chave, {});
  if (typeof dados !== "object" || Array.isArray(dados)) return {};
  return Object.fromEntries(
    Object.entries(dados).filter(
      ([, item]) =>
        typeof item?.nome === "string" && Number.isFinite(item?.preco),
    ),
  );
}

const lerCarrinho = () => lerProdutos(CHAVES.carrinho);
const lerFavoritos = () => lerProdutos(CHAVES.favoritos);

function lerVistos() {
  const vistos = ler(CHAVES.vistos, []);
  return Array.isArray(vistos)
    ? vistos.filter(
        (item) =>
          typeof item?.slug === "string" &&
          typeof item.nome === "string" &&
          Number.isFinite(item.preco),
      )
    : [];
}

function colocarNoCarrinho(produto, quantidade = 1) {
  const itens = lerCarrinho();
  itens[produto.slug] = {
    nome: produto.nome,
    preco: produto.preco,
    quantidade: limitarQuantidade(quantidade),
  };
  gravar(CHAVES.carrinho, itens);
}

function mudarQuantidade(slug, quantidade) {
  const itens = lerCarrinho();
  if (!itens[slug]) return;
  itens[slug].quantidade = limitarQuantidade(quantidade);
  gravar(CHAVES.carrinho, itens);
}

function tirarDoCarrinho(slug) {
  const itens = lerCarrinho();
  delete itens[slug];
  gravar(CHAVES.carrinho, itens);
}

function marcarFavorito(produto, favorito) {
  const itens = lerFavoritos();
  if (favorito) itens[produto.slug] = { nome: produto.nome, preco: produto.preco };
  else delete itens[produto.slug];
  gravar(CHAVES.favoritos, itens);
  if (favorito) {
    avisar(`“${produto.nome}” foi salvo nos favoritos.`, {
      texto: "Ver favoritos",
      aoClicar: () => abrirPainel("favoritos"),
    });
  } else {
    avisar(`“${produto.nome}” saiu dos favoritos.`, {
      texto: "Desfazer",
      aoClicar: () => marcarFavorito(produto, true),
    });
  }
}

// Guarda os últimos produtos abertos, do mais recente para o mais antigo.
function registrarVisita(produto) {
  const vistos = lerVistos().filter((item) => item.slug !== produto.slug);
  vistos.unshift({ slug: produto.slug, nome: produto.nome, preco: produto.preco });
  gravar(CHAVES.vistos, vistos.slice(0, 8));
}

/* ---------- Avisos rápidos ---------- */

// A área já existe antes do primeiro aviso, para o leitor de tela anunciá-lo.
const areaDeAvisos = document.body.appendChild(
  criarElemento(
    `<div class="toast-container position-fixed bottom-0 start-0 p-3 avisos" role="status" aria-live="polite"></div>`,
  ),
);

// Mostra um aviso no canto da tela; `acao` vira um botão (ex.: "Desfazer").
function avisar(mensagem, acao) {
  if (!window.bootstrap) return;
  // No máximo três avisos empilhados.
  [...areaDeAvisos.children].slice(0, -2).forEach((antigo) => antigo.remove());

  const aviso = criarElemento(`
    <div class="toast aviso" aria-atomic="true">
      <div class="d-flex align-items-center gap-1 pe-2">
        <p class="toast-body mb-0 me-auto"></p>
        ${acao ? `<button type="button" class="aviso__acao">${escapar(acao.texto)}</button>` : ""}
        <button type="button" class="btn-close btn-close-white ms-1" data-bs-dismiss="toast" aria-label="Fechar aviso"></button>
      </div>
    </div>`);
  aviso.querySelector(".toast-body").textContent = mensagem;
  aviso.querySelector(".aviso__acao")?.addEventListener("click", () => {
    window.bootstrap.Toast.getInstance(aviso)?.hide();
    acao.aoClicar();
  });
  aviso.addEventListener("hidden.bs.toast", () => aviso.remove());
  areaDeAvisos.append(aviso);
  window.bootstrap.Toast.getOrCreateInstance(aviso, { delay: 4500 }).show();
}

/* ---------- Painéis do carrinho e dos favoritos ---------- */

const paineis = {};

function criarPainel(nome, titulo) {
  const painel = criarElemento(`
    <aside class="offcanvas offcanvas-end painel" id="painel-${nome}" tabindex="-1" aria-labelledby="painel-${nome}-titulo">
      <header class="offcanvas-header border-bottom">
        <h2 class="offcanvas-title h5 mb-0" id="painel-${nome}-titulo">${titulo}</h2>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Fechar"></button>
      </header>
      <div class="offcanvas-body painel__corpo"></div>
      <footer class="painel__rodape"></footer>
    </aside>`);
  document.body.append(painel);
  paineis[nome] = painel;
  return painel;
}

// Devolve false quando o Bootstrap não carregou; aí o link segue normalmente.
function abrirPainel(nome) {
  const painel = paineis[nome];
  if (!window.bootstrap || !painel) return false;
  Object.values(paineis)
    .filter((outro) => outro !== painel)
    .forEach((outro) => window.bootstrap.Offcanvas.getInstance(outro)?.hide());
  window.bootstrap.Offcanvas.getOrCreateInstance(painel).show();
  return true;
}

// No próprio catálogo, "Ver produtos" só fecha o painel em vez de recarregar.
const avisoDeVazio = (titulo, texto) => `
  <div class="painel__vazio">
    <p class="fw-bold fs-5 text-body mb-1">${titulo}</p>
    <p class="mb-4">${texto}</p>
    <a class="btn btn--azul" href="${new URL("produtos.html", RAIZ)}"
      ${document.querySelector(".vitrine__grade") ? `data-bs-dismiss="offcanvas"` : ""}>Ver produtos</a>
  </div>`;

const fotoDoPainel = (slug) => `
  <a href="${paginaDoProduto(slug)}" tabindex="-1" aria-hidden="true">
    <img class="painel__foto" src="${fotoDoProduto(slug)}" alt="">
  </a>`;

function desenharCarrinho(itens) {
  const painel = paineis.carrinho;
  if (!painel) return;
  const corpo = painel.querySelector(".painel__corpo");
  const rodape = painel.querySelector(".painel__rodape");
  const lista = Object.entries(itens);

  rodape.hidden = lista.length === 0;
  if (!lista.length) {
    corpo.innerHTML = avisoDeVazio(
      "Seu carrinho está vazio",
      "Adicione produtos para montar o seu pedido.",
    );
    return;
  }

  corpo.innerHTML = `<ul class="painel__lista u-lista-limpa">${lista
    .map(
      ([slug, item]) => `
      <li class="painel__item" data-slug="${escapar(slug)}">
        ${fotoDoPainel(slug)}
        <div class="painel__info">
          <a class="painel__nome" href="${paginaDoProduto(slug)}">${escapar(item.nome)}</a>
          <span class="painel__preco">${dinheiro(item.preco)} cada</span>
          <div class="quantidade quantidade--pequena" role="group" aria-label="Quantidade de ${escapar(item.nome)}">
            <button type="button" class="quantidade__botao" data-acao="menos" aria-label="Diminuir quantidade" ${item.quantidade <= 1 ? "disabled" : ""}>−</button>
            <output class="quantidade__valor">${item.quantidade}</output>
            <button type="button" class="quantidade__botao" data-acao="mais" aria-label="Aumentar quantidade" ${item.quantidade >= QUANTIDADE_MAXIMA ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="painel__lado">
          <strong>${dinheiro(item.preco * item.quantidade)}</strong>
          <button type="button" class="painel__acao painel__acao--remover" data-acao="remover">Remover</button>
        </div>
      </li>`,
    )
    .join("")}</ul>`;

  const unidades = lista.reduce((soma, [, item]) => soma + item.quantidade, 0);
  const total = lista.reduce(
    (soma, [, item]) => soma + item.preco * item.quantidade,
    0,
  );
  const pedido = [
    "Olá, ItaPets! Quero fazer este pedido:",
    "",
    ...lista.map(
      ([, item]) =>
        `• ${item.quantidade}x ${item.nome}: ${dinheiro(item.preco * item.quantidade)}`,
    ),
    "",
    `Total: ${dinheiro(total)}`,
  ].join("\n");

  rodape.innerHTML = `
    <p class="painel__total"><span>Total</span><span>${dinheiro(total)}</span></p>
    <p class="small text-secondary mb-1">
      ${unidades} ${unidades === 1 ? "item" : "itens"}. Entrega e pagamento são combinados pelo WhatsApp.
    </p>
    <a class="btn btn--laranja w-100" href="${linkDoWhatsApp(pedido)}" target="_blank" rel="noopener">
      Finalizar pedido pelo WhatsApp
    </a>
    <button type="button" class="btn btn--contorno w-100" data-acao="esvaziar">Esvaziar carrinho</button>`;
}

function desenharFavoritos(itens, carrinho) {
  const painel = paineis.favoritos;
  if (!painel) return;
  const corpo = painel.querySelector(".painel__corpo");
  const rodape = painel.querySelector(".painel__rodape");
  const lista = Object.entries(itens);
  const foraDoCarrinho = lista.filter(([slug]) => !(slug in carrinho));

  rodape.hidden = lista.length === 0;
  if (!lista.length) {
    corpo.innerHTML = avisoDeVazio(
      "Nenhum favorito ainda",
      "Toque no coração dos produtos para guardá-los aqui.",
    );
    return;
  }

  corpo.innerHTML = `<ul class="painel__lista u-lista-limpa">${lista
    .map(
      ([slug, item]) => `
      <li class="painel__item" data-slug="${escapar(slug)}">
        ${fotoDoPainel(slug)}
        <div class="painel__info">
          <a class="painel__nome" href="${paginaDoProduto(slug)}">${escapar(item.nome)}</a>
          <span class="painel__preco">${dinheiro(item.preco)}</span>
        </div>
        <div class="painel__lado">
          ${
            slug in carrinho
              ? `<button type="button" class="painel__acao" disabled>No carrinho ✓</button>`
              : `<button type="button" class="painel__acao" data-acao="comprar">Adicionar ao carrinho</button>`
          }
          <button type="button" class="painel__acao painel__acao--remover" data-acao="remover">Remover</button>
        </div>
      </li>`,
    )
    .join("")}</ul>`;

  rodape.innerHTML = foraDoCarrinho.length
    ? `<button type="button" class="btn btn--laranja w-100" data-acao="todos">
        Adicionar ${foraDoCarrinho.length === 1 ? "o favorito" : `os ${foraDoCarrinho.length} favoritos`} ao carrinho
      </button>`
    : `<button type="button" class="btn btn--laranja w-100" data-acao="ver-carrinho">Ver carrinho</button>`;
}

// Depois de redesenhar a lista, o botão clicado deixa de existir; o foco
// volta para o botão equivalente (ou para o mais próximo que fizer sentido).
function devolverFoco(painel, slug, acao) {
  const item = slug
    ? painel.querySelector(`[data-slug="${CSS.escape(slug)}"]`)
    : null;
  const candidatos = [
    item?.querySelector(`[data-acao="${acao}"]`),
    item?.querySelector("button:not(:disabled)"),
    painel.querySelector(".painel__corpo a, .painel__corpo button"),
    painel.querySelector(".btn-close"),
  ];
  candidatos.find((botao) => botao && !botao.disabled)?.focus();
}

function ligarPainelDoCarrinho(painel) {
  painel.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const acao = botao.dataset.acao;
    const slug = botao.closest("[data-slug]")?.dataset.slug;
    const itens = lerCarrinho();
    const item = itens[slug];
    // Item que já saiu (por exemplo, em outra aba) antes de a lista atualizar.
    if (slug && !item) return sincronizar();

    if (acao === "mais") mudarQuantidade(slug, item.quantidade + 1);
    if (acao === "menos") mudarQuantidade(slug, item.quantidade - 1);
    if (acao === "remover") {
      tirarDoCarrinho(slug);
      avisar(`“${item.nome}” saiu do carrinho.`, {
        texto: "Desfazer",
        aoClicar: () => colocarNoCarrinho({ slug, ...item }, item.quantidade),
      });
    }
    if (acao === "esvaziar") {
      gravar(CHAVES.carrinho, {});
      avisar("O carrinho foi esvaziado.", {
        texto: "Desfazer",
        aoClicar: () => gravar(CHAVES.carrinho, itens),
      });
    }
    devolverFoco(painel, slug, acao);
  });
}

function ligarPainelDosFavoritos(painel) {
  painel.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const acao = botao.dataset.acao;
    const slug = botao.closest("[data-slug]")?.dataset.slug;
    const favoritos = lerFavoritos();
    if (slug && !favoritos[slug]) return sincronizar();

    if (acao === "comprar") {
      colocarNoCarrinho({ slug, ...favoritos[slug] });
      avisar(`“${favoritos[slug].nome}” foi adicionado ao carrinho.`, {
        texto: "Ver carrinho",
        aoClicar: () => abrirPainel("carrinho"),
      });
    }
    if (acao === "remover") marcarFavorito({ slug, ...favoritos[slug] }, false);
    if (acao === "todos") {
      const carrinho = lerCarrinho();
      for (const [chave, item] of Object.entries(favoritos)) {
        carrinho[chave] ??= { ...item, quantidade: 1 };
      }
      gravar(CHAVES.carrinho, carrinho);
      abrirPainel("carrinho");
      return;
    }
    if (acao === "ver-carrinho") {
      abrirPainel("carrinho");
      return;
    }
    devolverFoco(painel, slug, acao);
  });
}

/* ---------- Contadores do cabeçalho ---------- */

const contadores = {};

function criarContador(link) {
  const contador = criarElemento(
    `<span class="cabecalho__contador" aria-hidden="true" hidden></span>`,
  );
  link.append(contador);
  link.setAttribute("aria-haspopup", "dialog");
  link.setAttribute("aria-controls", `painel-${link.dataset.abrir}`);
  contadores[link.dataset.abrir] = { link, contador };
}

function atualizarContador(nome, quantidade) {
  const alvo = contadores[nome];
  if (!alvo) return;
  const rotulo = nome === "carrinho" ? "Carrinho de compras" : "Favoritos";
  alvo.contador.textContent = quantidade > 99 ? "99+" : quantidade;
  alvo.contador.hidden = quantidade === 0;
  alvo.link.setAttribute(
    "aria-label",
    quantidade
      ? `${rotulo}, ${quantidade} ${quantidade === 1 ? "item" : "itens"}`
      : `${rotulo}, vazio`,
  );
}

/* ---------- Sincronização ---------- */

// Funções extras que cada página registra para acompanhar o carrinho.
const aoSincronizar = [];

// Deixa botões, contadores e painéis iguais ao que está guardado. Roda depois
// de qualquer mudança, inclusive as feitas em outra aba.
function sincronizar() {
  const carrinho = lerCarrinho();
  const favoritos = lerFavoritos();

  document.querySelectorAll("[data-carrinho]").forEach((botao) => {
    botao.checked = botao.dataset.carrinho in carrinho;
  });
  document.querySelectorAll("[data-favorito]").forEach((botao) => {
    const favorito = botao.dataset.favorito in favoritos;
    if (botao.type === "checkbox") botao.checked = favorito;
    else botao.setAttribute("aria-pressed", String(favorito));
  });

  atualizarContador(
    "carrinho",
    Object.values(carrinho).reduce((soma, item) => soma + item.quantidade, 0),
  );
  atualizarContador("favoritos", Object.keys(favoritos).length);
  desenharCarrinho(carrinho);
  desenharFavoritos(favoritos, carrinho);
  aoSincronizar.forEach((funcao) => funcao(carrinho));
}

/* ---------- Cards de produto ---------- */

function produtoDoCard(card) {
  const link = card.querySelector(".produto-card__titulo a");
  return {
    slug: slugDoEndereco(link.getAttribute("href")),
    nome: link.textContent.replace(/\s+/g, " ").trim(),
    preco: centavos(card.querySelector(".produto-card__preco").textContent),
  };
}

function avisarCarrinho(produto, adicionado) {
  if (adicionado) {
    avisar(`“${produto.nome}” foi adicionado ao carrinho.`, {
      texto: "Ver carrinho",
      aoClicar: () => abrirPainel("carrinho"),
    });
  } else {
    avisar(`“${produto.nome}” saiu do carrinho.`);
  }
}

// Cada card tem o checkbox "Adicionar / Adicionado ✓" e ganha um coração.
function ligarCard(card) {
  const botao = card.querySelector(".btn-check");
  if (!botao || !card.querySelector(".produto-card__titulo a")) return;
  const produto = produtoDoCard(card);

  botao.dataset.carrinho = produto.slug;
  botao.addEventListener("change", () => {
    if (botao.checked) colocarNoCarrinho(produto, 1);
    else tirarDoCarrinho(produto.slug);
    avisarCarrinho(produto, botao.checked);
  });

  const coracao = criarElemento(
    `<button type="button" class="produto-card__favorito" aria-pressed="false">${ICONES.coracao}</button>`,
  );
  coracao.setAttribute("aria-label", `Favoritar ${produto.nome}`);
  coracao.dataset.favorito = produto.slug;
  coracao.addEventListener("click", () =>
    marcarFavorito(produto, coracao.getAttribute("aria-pressed") !== "true"),
  );
  card.append(coracao);
}

const cardDoProduto = (item, prefixo) => `
  <li class="col">
    <article class="produto-card">
      <a class="produto-card__imagem" href="${paginaDoProduto(item.slug)}" tabindex="-1" aria-hidden="true">
        <img src="${fotoDoProduto(item.slug)}" alt="" loading="lazy">
      </a>
      <h3 class="produto-card__titulo">
        <a href="${paginaDoProduto(item.slug)}">${escapar(item.nome)}</a>
      </h3>
      <p class="produto-card__preco">${dinheiro(item.preco)}</p>
      <input type="checkbox" class="btn-check" id="${prefixo}-${escapar(item.slug)}" autocomplete="off">
      <label class="btn btn--laranja btn-sm w-100 mt-1" for="${prefixo}-${escapar(item.slug)}">
        <span class="u-texto-inativo">Adicionar</span><span class="u-texto-ativo">Adicionado ✓</span>
      </label>
    </article>
  </li>`;

// "Vistos recentemente": até 4 produtos abertos antes, menos o atual.
function mostrarVistos(posicionar, slugAtual) {
  const vistos = lerVistos()
    .filter((item) => item.slug !== slugAtual)
    .slice(0, 4);
  if (!vistos.length) return;
  const secao = criarElemento(`
    <section aria-labelledby="recentes-titulo">
      <h2 class="recentes__titulo" id="recentes-titulo">Vistos recentemente</h2>
      <ul class="row row-cols-2 row-cols-md-4 g-3 u-lista-limpa">
        ${vistos.map((item) => cardDoProduto(item, "recente")).join("")}
      </ul>
    </section>`);
  posicionar(secao);
  secao.querySelectorAll(".produto-card").forEach(ligarCard);
}

/* ---------- Página de produto ---------- */

function iniciarPaginaDoProduto(form) {
  const produto = {
    slug: slugDoEndereco(location.href),
    nome: document.querySelector("#produto-titulo").textContent.trim(),
    preco: centavos(form.querySelector(".produto__preco").textContent),
  };
  const botao = form.querySelector("#add-carrinho");
  const favoritar = form.querySelector("#favoritar");
  const campo = form.querySelector("#quantidade");
  const comprarAgora = form.querySelector(".produto__acoes button");

  // Enter no campo de quantidade não deve recarregar a página.
  form.addEventListener("submit", (evento) => evento.preventDefault());

  // Botões − e + em volta do campo de quantidade.
  const menos = criarElemento(
    `<button type="button" class="quantidade__botao" aria-label="Diminuir quantidade">−</button>`,
  );
  const mais = criarElemento(
    `<button type="button" class="quantidade__botao" aria-label="Aumentar quantidade">+</button>`,
  );
  const grupo = criarElemento(`<span class="quantidade"></span>`);
  campo.replaceWith(grupo);
  grupo.append(menos, campo, mais);

  function mostrarQuantidade(valor) {
    campo.value = limitarQuantidade(valor);
    menos.disabled = Number(campo.value) <= 1;
    mais.disabled = Number(campo.value) >= QUANTIDADE_MAXIMA;
  }
  function trocarQuantidade(valor) {
    mostrarQuantidade(valor);
    if (botao.checked) mudarQuantidade(produto.slug, campo.value);
  }
  menos.addEventListener("click", () => trocarQuantidade(Number(campo.value) - 1));
  mais.addEventListener("click", () => trocarQuantidade(Number(campo.value) + 1));
  campo.addEventListener("change", () => trocarQuantidade(campo.value));

  // Se a quantidade mudar no painel do carrinho, o campo acompanha.
  aoSincronizar.push((carrinho) => {
    const item = carrinho[produto.slug];
    if (item && document.activeElement !== campo) mostrarQuantidade(item.quantidade);
  });
  mostrarQuantidade(lerCarrinho()[produto.slug]?.quantidade ?? campo.value);

  botao.dataset.carrinho = produto.slug;
  botao.addEventListener("change", () => {
    if (botao.checked) colocarNoCarrinho(produto, campo.value);
    else tirarDoCarrinho(produto.slug);
    avisarCarrinho(produto, botao.checked);
  });

  favoritar.dataset.favorito = produto.slug;
  favoritar.addEventListener("change", () =>
    marcarFavorito(produto, favoritar.checked),
  );

  comprarAgora?.addEventListener("click", () => {
    colocarNoCarrinho(produto, campo.value);
    if (!abrirPainel("carrinho")) avisarCarrinho(produto, true);
  });

  // Compartilhar: menu do celular quando existir; senão, copia o link.
  const compartilhar = criarElemento(
    `<button type="button" class="produto__compartilhar">${ICONES.compartilhar}Compartilhar produto</button>`,
  );
  form.querySelector(".produto__acoes").after(compartilhar);
  compartilhar.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: location.href });
      } catch {
        // a pessoa fechou o menu de compartilhar
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(location.href);
      avisar("Link do produto copiado.");
    } catch {
      avisar("Não foi possível copiar o link. Copie pela barra de endereço.");
    }
  });

  // Lupa: com mouse, a foto principal amplia no ponto em que ele está.
  const moldura = document.querySelector(".galeria__principal");
  const foto = moldura?.querySelector("img");
  if (foto && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    moldura.classList.add("galeria__principal--zoom");
    moldura.addEventListener("pointermove", (evento) => {
      const area = moldura.getBoundingClientRect();
      const x = ((evento.clientX - area.left) / area.width) * 100;
      const y = ((evento.clientY - area.top) / area.height) * 100;
      foto.style.transition = "none";
      foto.style.transformOrigin = `${x}% ${y}%`;
      foto.style.transform = "scale(2.2)";
    });
    moldura.addEventListener("pointerleave", () => foto.removeAttribute("style"));
  }

  registrarVisita(produto);
  mostrarVistos(
    (secao) => document.querySelector(".produto").after(secao),
    produto.slug,
  );
}

/* ---------- Catálogo: busca e lista vazia ---------- */

function iniciarCatalogo(grade) {
  const formBusca = document.querySelector("#busca-principal");
  const campoBusca = formBusca.querySelector(".busca__campo");
  const filtros = document.querySelector("#filtros");
  const itens = [...grade.querySelectorAll(".vitrine__item")];

  const aviso = criarElemento(
    `<p class="vitrine__busca small mb-2" role="status" hidden></p>`,
  );
  grade.before(aviso);

  const vazio = criarElemento(`
    <div class="vitrine__vazio" hidden>
      <p class="fw-bold fs-5 text-body mb-1">Nenhum produto encontrado</p>
      <p class="mb-3">Tente buscar outro termo ou tirar alguns filtros.</p>
      <button type="button" class="btn btn--azul">Limpar busca e filtros</button>
    </div>`);
  grade.after(vazio);

  // Os filtros são CSS puro; aqui só se confere se sobrou algum card visível.
  // O setTimeout espera o "reset" do formulário terminar de limpar os campos.
  function conferirVazio() {
    setTimeout(() => {
      vazio.hidden = itens.some((item) => item.offsetParent !== null);
    });
  }

  function buscar(termo) {
    const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
    itens.forEach((item) => {
      const texto = normalizar(
        `${item.querySelector(".produto-card__titulo").textContent} ${item.dataset.marca}`,
      );
      item.hidden = !palavras.every((palavra) => texto.includes(palavra));
    });

    aviso.hidden = palavras.length === 0;
    aviso.innerHTML = `Resultados para “<strong></strong>”. <a href="produtos.html">Limpar busca</a>`;
    aviso.querySelector("strong").textContent = termo.trim();

    // Mantém o termo no endereço, para a busca sobreviver a um recarregar.
    const endereco = new URL(location.href);
    if (palavras.length) endereco.searchParams.set("busca", termo.trim());
    else endereco.searchParams.delete("busca");
    history.replaceState(null, "", endereco);
    conferirVazio();
  }

  function limparBusca() {
    campoBusca.value = "";
    buscar("");
  }

  campoBusca.value = new URLSearchParams(location.search).get("busca") || "";
  buscar(campoBusca.value);

  // No catálogo a busca filtra na hora, sem recarregar a página.
  campoBusca.addEventListener("input", () => buscar(campoBusca.value));
  formBusca.addEventListener("submit", (evento) => {
    evento.preventDefault();
    buscar(campoBusca.value);
    // No celular a busca fica no menu; fecha o menu para mostrar o resultado.
    if (window.bootstrap && matchMedia("(max-width: 991.98px)").matches) {
      campoBusca.blur();
      document
        .querySelectorAll(".cabecalho__menu.show")
        .forEach((menu) =>
          window.bootstrap.Collapse.getOrCreateInstance(menu, {
            toggle: false,
          }).hide(),
        );
    }
  });
  aviso.addEventListener("click", (evento) => {
    if (!evento.target.closest("a")) return;
    evento.preventDefault();
    limparBusca();
  });

  vazio.querySelector("button").addEventListener("click", () => {
    filtros?.reset();
    limparBusca();
    if (location.hash && location.hash !== "#todos") location.hash = "todos";
    conferirVazio();
  });

  filtros?.addEventListener("change", conferirVazio);
  filtros?.addEventListener("reset", conferirVazio);
  addEventListener("hashchange", conferirVazio);
}

/* ---------- Formulário de contato ---------- */

function iniciarContato(form) {
  const campos = [...form.querySelectorAll("[required]")];
  const mensagensDeErro = {
    nome: "Digite seu nome.",
    email: "Digite um e-mail válido, como nome@exemplo.com.",
    mensagem: "Escreva sua mensagem.",
  };

  // Links como contato.html?assunto=Farmácia já chegam com o campo preenchido.
  for (const [nome, valor] of new URLSearchParams(location.search)) {
    const campo = form.elements.namedItem(nome);
    if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement) {
      campo.value = valor;
    }
  }

  function validar(campo) {
    campo.setCustomValidity("");
    // O navegador aceita "nome@site"; aqui exigimos também o domínio (".com").
    if (
      campo.type === "email" &&
      campo.value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(campo.value)
    ) {
      campo.setCustomValidity(mensagensDeErro.email);
    }
    if (!campo.value.trim()) campo.value = "";
    const valido = campo.checkValidity();
    campo.classList.toggle("is-invalid", !valido);
    return valido;
  }

  // Uma mensagem de erro embaixo de cada campo obrigatório, no estilo do Bootstrap.
  campos.forEach((campo) => {
    const erro = criarElemento(
      `<span class="invalid-feedback" id="${campo.id}-erro"></span>`,
    );
    erro.textContent = mensagensDeErro[campo.name];
    campo.after(erro);
    campo.setAttribute("aria-describedby", erro.id);
    campo.addEventListener("blur", () => campo.value && validar(campo));
    campo.addEventListener("input", () => {
      if (campo.classList.contains("is-invalid")) validar(campo);
    });
  });

  // Contador de caracteres da mensagem.
  const mensagem = form.elements.mensagem;
  const contador = criarElemento(
    `<small class="contato__contador" id="mensagem-contador"></small>`,
  );
  mensagem.parentElement.append(contador);
  const contar = () => {
    contador.textContent = `${mensagem.value.length} de ${mensagem.maxLength} caracteres`;
  };
  if (mensagem.maxLength > 0) {
    mensagem.addEventListener("input", contar);
    contar();
  } else {
    contador.remove();
  }

  const confirmacao = criarElemento(
    `<p class="alert alert-success mb-0" role="status" hidden></p>`,
  );
  form.append(confirmacao);

  form.noValidate = true;
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const invalidos = campos.filter((campo) => !validar(campo));
    if (invalidos.length) {
      confirmacao.hidden = true;
      invalidos[0].focus();
      return;
    }

    const dados = Object.fromEntries(new FormData(form));
    const nome = dados.nome.trim();
    const texto = [
      `Olá, ItaPets! Meu nome é ${nome}.`,
      dados.assunto?.trim() ? `Assunto: ${dados.assunto.trim()}` : null,
      "",
      dados.mensagem.trim(),
      "",
      `E-mail para resposta: ${dados.email.trim()}`,
    ]
      .filter((linha) => linha !== null)
      .join("\n");
    const endereco = linkDoWhatsApp(texto);
    window.open(endereco, "_blank", "noopener");

    confirmacao.innerHTML = `Tudo certo, <strong></strong>! A sua mensagem está pronta no WhatsApp, é só tocar em enviar. Se ele não abriu, <a class="alert-link" href="${endereco}" target="_blank" rel="noopener">clique aqui</a>.`;
    confirmacao.querySelector("strong").textContent = nome.split(/\s+/)[0];
    confirmacao.hidden = false;
    form.reset();
    if (mensagem.maxLength > 0) contar();
  });
}

/* ---------- Carrossel da página inicial ---------- */

// Criado aqui (antes do Bootstrap fazê-lo sozinho no "load") para desligar a
// pausa ao passar o mouse: ela religaria o carrossel mesmo depois de a pessoa
// apertar o botão de pausar.
function iniciarCarrossel(carrossel) {
  if (!window.bootstrap) return;
  const instancia = window.bootstrap.Carousel.getOrCreateInstance(carrossel, {
    pause: false,
  });
  const botao = carrossel.querySelector(".carrossel__pausa");
  let pausado = false;

  function pausar(estado) {
    pausado = estado;
    carrossel.classList.toggle("carrossel--pausado", estado);
    botao.setAttribute(
      "aria-label",
      estado ? "Continuar carrossel" : "Pausar carrossel",
    );
    if (estado) instancia.pause();
    else instancia.cycle();
  }

  botao.hidden = false;
  botao.addEventListener("click", () => pausar(!pausado));
  // Quem pediu menos movimento no sistema começa com o carrossel parado.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) pausar(true);
}

/* ---------- Em todas as páginas ---------- */

function iniciarCabecalho() {
  const cabecalho = document.querySelector(".cabecalho");
  const topo = criarElemento(
    `<button type="button" class="topo" aria-label="Voltar ao topo" hidden>${ICONES.seta}</button>`,
  );
  document.body.append(topo);
  topo.addEventListener("click", () => {
    scrollTo({ top: 0 });
    document.querySelector(".cabecalho__marca")?.focus({ preventScroll: true });
  });

  // Sombra no cabeçalho e botão de voltar ao topo, conforme a rolagem.
  let agendado = false;
  function aoRolar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      cabecalho?.classList.toggle("cabecalho--rolado", scrollY > 8);
      topo.hidden = scrollY < 600;
    });
  }
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  // Atalho: "/" leva para a busca, como em muitas lojas on-line.
  document
    .querySelector(".busca__campo")
    ?.setAttribute("aria-keyshortcuts", "/");
  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "/" || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (evento.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const busca = document.querySelector(".busca__campo");
    if (!busca || busca.offsetParent === null) return;
    evento.preventDefault();
    busca.focus();
  });

  document.querySelectorAll("[data-ano]").forEach((ano) => {
    ano.textContent = new Date().getFullYear();
  });
}

/* ---------- Início ---------- */

ligarPainelDoCarrinho(criarPainel("carrinho", "Seu carrinho"));
ligarPainelDosFavoritos(criarPainel("favoritos", "Seus favoritos"));
document.querySelectorAll(".cabecalho__icone[data-abrir]").forEach(criarContador);
document.querySelectorAll("[data-abrir]").forEach((link) => {
  link.addEventListener("click", (evento) => {
    if (abrirPainel(link.dataset.abrir)) evento.preventDefault();
  });
});

document.querySelectorAll(".produto-card").forEach(ligarCard);

const formCompra = document.querySelector("#comprar");
if (formCompra) iniciarPaginaDoProduto(formCompra);

const grade = document.querySelector(".vitrine__grade");
if (grade) iniciarCatalogo(grade);

const carrossel = document.querySelector(".carrossel");
if (carrossel) iniciarCarrossel(carrossel);

const chamadaDeContato = document.querySelector(".cta-contato");
if (chamadaDeContato) mostrarVistos((secao) => chamadaDeContato.before(secao));

const formContato = document.querySelector(".contato__form");
if (formContato) iniciarContato(formContato);

iniciarCabecalho();
sincronizar();

// Mantém tudo igual quando o carrinho ou os favoritos mudam em outra aba.
addEventListener("storage", (evento) => {
  if (evento.key === null || Object.values(CHAVES).includes(evento.key)) {
    sincronizar();
  }
});
