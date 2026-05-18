const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000/api" : `${window.location.origin}/api`;
const ITENS_POR_PAGINA = 4;
const CHAVE_USUARIO = "falaFloripaUsuario";

const estado = {
    usuario: null,
    perfil: null,
    bairros: [],
    publicacoes: [],
    filtroAtual: null,
    paginaAtual: 1,
    comentarios: {},
    comentariosAbertos: new Set()
};

const $ = (seletor) => document.querySelector(seletor);

function escapeHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[char]);
}

function escapeAttr(valor) {
    return escapeHtml(valor).replace(/`/g, "&#96;");
}

function svgDataUrl(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function imagemPerfilFallback(nome) {
    const iniciais = String(nome || "FF")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();

    return svgDataUrl(`
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
            <rect width="320" height="320" rx="42" fill="#bfe0ff"/>
            <circle cx="160" cy="126" r="58" fill="#ffffff" opacity=".94"/>
            <path d="M72 272c18-62 58-94 88-94s70 32 88 94" fill="#ffffff" opacity=".94"/>
            <text x="160" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#16324f">${escapeHtml(iniciais)}</text>
        </svg>
    `);
}

function imagemPublicacaoFallback(titulo) {
    return svgDataUrl(`
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420">
            <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stop-color="#88c7f5"/>
                    <stop offset="1" stop-color="#c7c4e3"/>
                </linearGradient>
            </defs>
            <rect width="900" height="420" rx="36" fill="url(#g)"/>
            <path d="M116 292c78-80 138-92 198-38 58 52 108 46 176-20 74-72 150-70 252 8" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" opacity=".7"/>
            <text x="450" y="206" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${escapeHtml(String(titulo || "Fala Floripa").slice(0, 34))}</text>
        </svg>
    `);
}

function formatarDataHora(dataString) {
    if (!dataString) return "";
    const data = new Date(dataString);
    const hh = String(data.getHours()).padStart(2, "0");
    const mm = String(data.getMinutes()).padStart(2, "0");
    const dd = String(data.getDate()).padStart(2, "0");
    const mo = String(data.getMonth() + 1).padStart(2, "0");
    const yy = String(data.getFullYear()).slice(-2);
    return `${hh}:${mm} - ${dd}/${mo}/${yy}`;
}

async function api(caminho, opcoes = {}) {
    const resposta = await fetch(`${API_BASE}${caminho}`, opcoes);
    const conteudo = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(conteudo.mensagem || "Erro de comunicação com o servidor.");
    }

    return conteudo;
}

function carregarUsuarioLocal() {
    try {
        estado.usuario = JSON.parse(localStorage.getItem(CHAVE_USUARIO));
    } catch (err) {
        estado.usuario = null;
    }
}

function salvarUsuarioLocal(usuario) {
    estado.usuario = usuario;
    if (usuario) {
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
    } else {
        localStorage.removeItem(CHAVE_USUARIO);
    }
}

function exigirLogin() {
    if (estado.usuario) return true;
    abrirModal("modal-login");
    return false;
}

function limparErro(idMensagem, inputs = []) {
    const mensagem = $(`#${idMensagem}`);
    if (mensagem) {
        mensagem.textContent = "";
        mensagem.classList.remove("mostrar-bloco");
    }

    inputs.forEach((input) => input && input.classList.remove("input-erro-borda"));
}

function mostrarErro(idMensagem, texto, inputs = []) {
    const mensagem = $(`#${idMensagem}`);
    if (mensagem) {
        mensagem.textContent = texto;
        mensagem.classList.add("mostrar-bloco");
    }

    inputs.forEach((input) => input && input.classList.add("input-erro-borda"));
}

function abrirModal(id) {
    const modal = $(`#${id}`);
    if (modal) modal.classList.add("mostrar-flex");
}

function fecharModal(id) {
    const modal = $(`#${id}`);
    if (modal) modal.classList.remove("mostrar-flex");
}

function popularSelectBairros() {
    const selects = [$("#cad-bairro"), $("#post-bairro")].filter(Boolean);

    selects.forEach((select) => {
        const valorAtual = select.value;
        select.innerHTML = `<option value="">Selecione um bairro</option>`;
        estado.bairros.forEach((bairro) => {
            const option = document.createElement("option");
            option.value = bairro.id_bairro;
            option.textContent = bairro.nome_bairro;
            select.appendChild(option);
        });
        if (valorAtual) select.value = valorAtual;
    });

    if (estado.usuario && $("#post-bairro")) {
        $("#post-bairro").value = estado.usuario.bairro_id || "";
    }
}

function renderizarPainelLateral() {
    const painel = $("#wrapper-autenticacao");
    if (!painel) return;

    if (!estado.usuario) {
        painel.innerHTML = `
            <div class="alerta-deslogado">Faça login para interagir!</div>
            <button class="btn-registrar" type="button" disabled>Registrar</button>
            <button class="btn-navegacao" type="button" data-action="abrir-login">Fazer Login</button>
            <button class="btn-navegacao" type="button" data-action="abrir-cadastro">Criar Conta</button>
        `;
        return;
    }

    const perfil = estado.perfil || estado.usuario;
    const foto = perfil.foto || estado.usuario.foto || imagemPerfilFallback(perfil.nome);

    painel.innerHTML = `
        <div class="perfil-logado-container">
            <div class="perfil-topo">
                <button class="botao-imagem" type="button" data-action="ver-imagem" data-src="${escapeAttr(foto)}" data-alt="Foto de perfil de ${escapeAttr(perfil.nome)}">
                    <img class="avatar-usuario" src="${escapeAttr(foto)}" alt="Foto de perfil de ${escapeAttr(perfil.nome)}">
                </button>
                <div>
                    <div class="perfil-nome">${escapeHtml(perfil.nome)}</div>
                    <div class="perfil-bairro">${escapeHtml(perfil.nome_bairro || "Bairro não informado")}</div>
                </div>
            </div>
            <div class="perfil-metricas">
                <div class="perfil-metrica">
                    <strong>${Number(perfil.total_publicacoes || 0)}</strong>
                    <span>Ações</span>
                </div>
                <div class="perfil-metrica">
                    <strong>${Number(perfil.total_curtidas_recebidas || 0)}</strong>
                    <span>Curtidas</span>
                </div>
            </div>
        </div>
        <button class="btn-registrar" type="button" data-action="abrir-postagem">Registrar</button>
        <button class="btn-navegacao" type="button" data-action="logout">Sair</button>
    `;
}

function renderizarFiltros() {
    const lista = $("#lista-filtros-bairros");
    if (!lista) return;

    const todosAtivo = estado.filtroAtual === null ? " ativo" : "";
    lista.innerHTML = `<button class="filtro-chip${todosAtivo}" type="button" data-action="filtrar" data-bairro="">Ver Todos</button>`;

    estado.bairros.forEach((bairro) => {
        const ativo = estado.filtroAtual === bairro.id_bairro ? " ativo" : "";
        lista.insertAdjacentHTML(
            "beforeend",
            `<button class="filtro-chip${ativo}" type="button" data-action="filtrar" data-bairro="${bairro.id_bairro}">${escapeHtml(bairro.nome_bairro)}</button>`
        );
    });
}

function publicacoesFiltradas() {
    if (estado.filtroAtual === null) return estado.publicacoes;
    return estado.publicacoes.filter((publicacao) => Number(publicacao.bairro_id) === Number(estado.filtroAtual));
}

function renderizarComentarios(publicacaoId) {
    if (!estado.comentariosAbertos.has(publicacaoId)) return "";

    const comentarios = estado.comentarios[publicacaoId];
    const lista = !comentarios
        ? `<div class="comentario-item"><div></div><p>Carregando comentários...</p></div>`
        : comentarios.length === 0
            ? `<div class="comentario-item"><div></div><p>Sem comentários ainda.</p></div>`
            : comentarios.map((comentario) => {
                const foto = comentario.foto_usuario || imagemPerfilFallback(comentario.nome_usuario);
                return `
                    <div class="comentario-item">
                        <img src="${escapeAttr(foto)}" alt="Foto de ${escapeAttr(comentario.nome_usuario)}">
                        <div>
                            <strong>${escapeHtml(comentario.nome_usuario || "Usuário")}</strong>
                            <p>${escapeHtml(comentario.conteudo)}</p>
                        </div>
                    </div>
                `;
            }).join("");

    return `
        <div id="aba-coment-${publicacaoId}" class="container-comentarios-expansivel mostrar-bloco">
            <div class="comentarios-lista">${lista}</div>
            <div class="caixa-input-comentario">
                <input type="text" data-comment-input="${publicacaoId}" placeholder="Responder comentário..." maxlength="240">
                <button type="button" data-action="enviar-comentario" data-id="${publicacaoId}" aria-label="Enviar comentário">
                    <img src="imgs/send.svg" alt="">
                </button>
            </div>
            <div id="comentario-erro-${publicacaoId}" class="comentario-erro"></div>
        </div>
    `;
}

function renderizarCard(publicacao) {
    const id = Number(publicacao.id_publicacao);
    const fotoAutor = publicacao.foto_usuario || imagemPerfilFallback(publicacao.nome_usuario);
    const imagemPost = publicacao.imagem_publicacao || imagemPublicacaoFallback(publicacao.titulo);
    const iconeCurtida = publicacao.curtido_usuario ? "imgs/CoracaoVermelho.svg" : "imgs/coracao.svg";

    return `
        <article class="card-mensagem-real" data-post-id="${id}">
            <div class="card-corpo-superior">
                <div class="card-bloco-usuario">
                    <button class="botao-imagem" type="button" data-action="ver-imagem" data-src="${escapeAttr(fotoAutor)}" data-alt="Foto de perfil de ${escapeAttr(publicacao.nome_usuario)}">
                        <img class="card-foto-moldura" src="${escapeAttr(fotoAutor)}" alt="Foto de perfil de ${escapeAttr(publicacao.nome_usuario)}">
                    </button>
                    <div class="card-autor-nome">${escapeHtml(publicacao.nome_usuario)}</div>
                    <div class="card-bairro-info">${escapeHtml(publicacao.nome_bairro || "Sem bairro")}</div>
                </div>
                <div class="card-bloco-conteudo">
                    <h3 class="card-titulo-texto">${escapeHtml(publicacao.titulo)}</h3>
                    <button class="botao-imagem" type="button" data-action="ver-imagem" data-src="${escapeAttr(imagemPost)}" data-alt="Imagem da postagem ${escapeAttr(publicacao.titulo)}">
                        <img class="postagem-imagem" src="${escapeAttr(imagemPost)}" alt="Imagem da postagem ${escapeAttr(publicacao.titulo)}">
                    </button>
                    <p class="card-caixa-branca">${escapeHtml(publicacao.info_A)}</p>
                </div>
            </div>
            <div class="card-rodape-interacoes">
                <span class="info-extra-texto">${escapeHtml(publicacao.info_B)} | ${escapeHtml(publicacao.info_C)}</span>
                <button class="item-clicavel-acao" type="button" data-action="curtir" data-id="${id}" aria-label="Curtir publicação">
                    <img class="acao-icone" src="${iconeCurtida}" alt="">
                    <span>${Number(publicacao.total_curtidas || 0)}</span>
                </button>
                <button class="item-clicavel-acao" type="button" data-action="comentarios" data-id="${id}" aria-label="Comentários da publicação">
                    <img class="acao-icone" src="imgs/comentario.svg" alt="">
                    <span>${Number(publicacao.total_comentarios || 0)}</span>
                </button>
                <span class="data-publicacao">${formatarDataHora(publicacao.data_hora)}</span>
            </div>
            ${renderizarComentarios(id)}
        </article>
    `;
}

function renderizarFeed() {
    const feed = $("#feed-publicacoes");
    if (!feed) return;

    const filtradas = publicacoesFiltradas();
    const totalPaginas = Math.max(Math.ceil(filtradas.length / ITENS_POR_PAGINA), 1);

    if (estado.paginaAtual > totalPaginas) estado.paginaAtual = totalPaginas;
    if (estado.paginaAtual < 1) estado.paginaAtual = 1;

    $("#indicador-pagina").textContent = String(estado.paginaAtual);
    $("#btn-pag-anterior").disabled = estado.paginaAtual === 1;
    $("#btn-pag-proximo").disabled = estado.paginaAtual === totalPaginas || filtradas.length === 0;

    if (filtradas.length === 0) {
        feed.innerHTML = `<div class="estado-vazio">Nenhuma publicação encontrada.</div>`;
        return;
    }

    const inicio = (estado.paginaAtual - 1) * ITENS_POR_PAGINA;
    const pagina = filtradas.slice(inicio, inicio + ITENS_POR_PAGINA);
    feed.innerHTML = pagina.map(renderizarCard).join("");
}

async function buscarBairros() {
    try {
        estado.bairros = await api("/bairros");
    } catch (err) {
        estado.bairros = [];
    }

    popularSelectBairros();
    renderizarFiltros();
}

async function buscarPublicacoes() {
    try {
        const usuarioQuery = estado.usuario ? `?usuario_id=${estado.usuario.id}` : "";
        estado.publicacoes = await api(`/publicacoes${usuarioQuery}`);
    } catch (err) {
        estado.publicacoes = [];
    }

    renderizarFeed();
}

async function carregarPerfil() {
    if (!estado.usuario) {
        estado.perfil = null;
        renderizarPainelLateral();
        return;
    }

    try {
        estado.perfil = await api(`/perfil/${estado.usuario.id}`);
        salvarUsuarioLocal({ ...estado.usuario, ...estado.perfil });
    } catch (err) {
        estado.perfil = estado.usuario;
    }

    renderizarPainelLateral();
}

function aplicarFiltroBairro(idBairro) {
    if (!exigirLogin()) return;
    estado.filtroAtual = idBairro ? Number(idBairro) : null;
    estado.paginaAtual = 1;
    renderizarFiltros();
    renderizarFeed();
}

function mudarPagina(passo) {
    if (!exigirLogin()) return;
    estado.paginaAtual += passo;
    renderizarFeed();
}

async function alternarLike(publicacaoId) {
    if (!exigirLogin()) return;

    try {
        const resposta = await api(`/publicacoes/${publicacaoId}/curtir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario_id: estado.usuario.id })
        });
        const publicacao = estado.publicacoes.find((item) => Number(item.id_publicacao) === Number(publicacaoId));
        if (publicacao) {
            publicacao.curtido_usuario = resposta.curtido;
            publicacao.total_curtidas = resposta.total_curtidas;
        }
        await carregarPerfil();
        renderizarFeed();
    } catch (err) {
        alert(err.message);
    }
}

async function alternarComentarios(publicacaoId) {
    if (!exigirLogin()) return;

    if (estado.comentariosAbertos.has(publicacaoId)) {
        estado.comentariosAbertos.delete(publicacaoId);
        renderizarFeed();
        return;
    }

    estado.comentariosAbertos.add(publicacaoId);
    renderizarFeed();

    try {
        estado.comentarios[publicacaoId] = await api(`/publicacoes/${publicacaoId}/comentarios`);
    } catch (err) {
        estado.comentarios[publicacaoId] = [];
    }

    renderizarFeed();
}

async function enviarComentario(publicacaoId) {
    if (!exigirLogin()) return;

    const input = document.querySelector(`[data-comment-input="${publicacaoId}"]`);
    const erro = $(`#comentario-erro-${publicacaoId}`);
    const texto = input ? input.value.trim() : "";

    if (erro) erro.textContent = "";
    if (texto.length <= 2) {
        if (erro) erro.textContent = "Comentário deve ter mais de 2 caracteres.";
        return;
    }

    try {
        const resposta = await api("/comentarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                texto,
                usuario_id: estado.usuario.id,
                publicacao_id: publicacaoId
            })
        });

        const publicacao = estado.publicacoes.find((item) => Number(item.id_publicacao) === Number(publicacaoId));
        if (publicacao) publicacao.total_comentarios = resposta.total_comentarios;

        const comentario = {
            ...resposta.comentario,
            nome_usuario: estado.usuario.nome,
            foto_usuario: estado.usuario.foto
        };
        estado.comentarios[publicacaoId] = [...(estado.comentarios[publicacaoId] || []), comentario];
        renderizarFeed();
    } catch (err) {
        if (erro) erro.textContent = err.message;
    }
}

async function executarLogin(evento) {
    evento.preventDefault();

    const email = $("#login-email");
    const senha = $("#login-senha");
    limparErro("mensagem-erro", [email, senha]);

    if (!email.value.trim() || !senha.value.trim()) {
        const campos = [];
        if (!email.value.trim()) campos.push(email);
        if (!senha.value.trim()) campos.push(senha);
        mostrarErro("mensagem-erro", "email ou senha obrigatório", campos);
        return;
    }

    try {
        const resposta = await api("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.value.trim(),
                senha: senha.value.trim()
            })
        });

        salvarUsuarioLocal(resposta.usuario);
        fecharModal("modal-login");
        $("#form-login").reset();
        await carregarPerfil();
        await buscarPublicacoes();
    } catch (err) {
        mostrarErro("mensagem-erro", "email ou senha incorreta", [email, senha]);
    }
}

async function executarCadastro(evento) {
    evento.preventDefault();

    const nome = $("#cad-nome");
    const email = $("#cad-email");
    const senha = $("#cad-senha");
    const bairro = $("#cad-bairro");
    const foto = $("#cad-foto");
    limparErro("mensagem-erro-cadastro", [nome, email, senha, bairro]);

    const camposInvalidos = [nome, email, senha, bairro].filter((campo) => !campo.value.trim());
    if (camposInvalidos.length > 0) {
        mostrarErro("mensagem-erro-cadastro", "Preencha todos os campos obrigatórios.", camposInvalidos);
        return;
    }

    try {
        const formData = new FormData();
        formData.append("nome", nome.value.trim());
        formData.append("email", email.value.trim());
        formData.append("senha", senha.value.trim());
        formData.append("bairro_id", bairro.value);
        if (foto.files.length > 0) formData.append("foto", foto.files[0]);

        const resposta = await api("/register", {
            method: "POST",
            body: formData
        });

        salvarUsuarioLocal(resposta.usuario);
        fecharModal("modal-cadastro");
        $("#form-cadastro").reset();
        await carregarPerfil();
        await buscarPublicacoes();
    } catch (err) {
        mostrarErro("mensagem-erro-cadastro", err.message);
    }
}

async function executarPostagem(evento) {
    evento.preventDefault();
    if (!exigirLogin()) return;

    const titulo = $("#post-titulo");
    const bairro = $("#post-bairro");
    const infoA = $("#post-info-a");
    const infoB = $("#post-info-b");
    const infoC = $("#post-info-c");
    const imagem = $("#post-imagem");
    limparErro("mensagem-erro-postagem", [titulo, bairro, infoA, infoB, infoC]);

    const camposInvalidos = [titulo, bairro, infoA, infoB, infoC].filter((campo) => !campo.value.trim());
    if (camposInvalidos.length > 0) {
        mostrarErro("mensagem-erro-postagem", "Preencha todos os campos da publicação.", camposInvalidos);
        return;
    }

    try {
        const formData = new FormData();
        formData.append("titulo", titulo.value.trim());
        formData.append("info_A", infoA.value.trim());
        formData.append("info_B", infoB.value.trim());
        formData.append("info_C", infoC.value);
        formData.append("bairro_id", bairro.value);
        formData.append("usuario_id", estado.usuario.id);
        if (imagem.files.length > 0) formData.append("imagem", imagem.files[0]);

        await api("/publicacoes", {
            method: "POST",
            body: formData
        });

        fecharModal("modal-postagem");
        $("#form-postagem").reset();
        estado.filtroAtual = null;
        estado.paginaAtual = 1;
        estado.comentariosAbertos.clear();
        await carregarPerfil();
        await buscarPublicacoes();
        renderizarFiltros();
    } catch (err) {
        mostrarErro("mensagem-erro-postagem", err.message);
    }
}

function fazerLogout() {
    salvarUsuarioLocal(null);
    estado.perfil = null;
    estado.filtroAtual = null;
    estado.paginaAtual = 1;
    estado.comentarios = {};
    estado.comentariosAbertos.clear();
    renderizarPainelLateral();
    renderizarFiltros();
    buscarPublicacoes();
}

function abrirPostagem() {
    if (!exigirLogin()) return;
    popularSelectBairros();
    abrirModal("modal-postagem");
}

function abrirImagem(src, alt) {
    const imagem = $("#imagem-ampliada");
    imagem.src = src;
    imagem.alt = alt || "Imagem ampliada";
    abrirModal("modal-imagem");
}

function registrarEventos() {
    $("#form-login").addEventListener("submit", executarLogin);
    $("#form-cadastro").addEventListener("submit", executarCadastro);
    $("#form-postagem").addEventListener("submit", executarPostagem);
    $("#btn-atualizar").addEventListener("click", async () => {
        await carregarPerfil();
        await buscarPublicacoes();
    });
    $("#btn-pag-anterior").addEventListener("click", () => mudarPagina(-1));
    $("#btn-pag-proximo").addEventListener("click", () => mudarPagina(1));

    document.addEventListener("click", (evento) => {
        const alvo = evento.target.closest("[data-action]");
        if (!alvo) return;

        const acao = alvo.dataset.action;
        if (acao === "abrir-login") abrirModal("modal-login");
        if (acao === "abrir-cadastro") abrirModal("modal-cadastro");
        if (acao === "abrir-postagem") abrirPostagem();
        if (acao === "fechar-login") {
            fecharModal("modal-login");
            limparErro("mensagem-erro", [$("#login-email"), $("#login-senha")]);
        }
        if (acao === "fechar-cadastro") {
            fecharModal("modal-cadastro");
            limparErro("mensagem-erro-cadastro", [$("#cad-nome"), $("#cad-email"), $("#cad-senha"), $("#cad-bairro")]);
        }
        if (acao === "fechar-postagem") {
            fecharModal("modal-postagem");
            limparErro("mensagem-erro-postagem", [$("#post-titulo"), $("#post-bairro"), $("#post-info-a"), $("#post-info-b"), $("#post-info-c")]);
        }
        if (acao === "fechar-imagem") fecharModal("modal-imagem");
        if (acao === "logout") fazerLogout();
        if (acao === "filtrar") aplicarFiltroBairro(alvo.dataset.bairro);
        if (acao === "curtir") alternarLike(Number(alvo.dataset.id));
        if (acao === "comentarios") alternarComentarios(Number(alvo.dataset.id));
        if (acao === "enviar-comentario") enviarComentario(Number(alvo.dataset.id));
        if (acao === "ver-imagem") abrirImagem(alvo.dataset.src, alvo.dataset.alt);
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            ["modal-login", "modal-cadastro", "modal-postagem", "modal-imagem"].forEach(fecharModal);
        }
    });
}

async function iniciar() {
    carregarUsuarioLocal();
    registrarEventos();
    renderizarPainelLateral();
    await buscarBairros();
    await carregarPerfil();
    await buscarPublicacoes();
}

document.addEventListener("DOMContentLoaded", iniciar);
