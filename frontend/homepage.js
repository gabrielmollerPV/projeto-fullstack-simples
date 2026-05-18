let usuarioLogado = false; 
let infoUsuarioLogado = null;

let paginaAtual = 1;
const itensPorPagina = 4;
let listaPublicacoesFiltradas = [];
let bairroFiltroAtivo = null;

const bairrosPadrao = [
    { id_bairro: 1, nome_bairro: "Centro" },
    { id_bairro: 2, nome_bairro: "Trindade" },
    { id_bairro: 3, nome_bairro: "Ingleses" }
];

const publicacoesPadrao = [
    {
        id_publicacao: 1,
        id_bairro: 1,
        titulo: "AÇÃO SOCIAL CENTRO",
        info_A: "Atividade de recolhimento de agasalhos na praça central da cidade.",
        info_B: "+55 (48) 9999-9999",
        info_C: "Social",
        nome: "Maria Silva",
        nome_bairro: "Centro",
        data_hora: "2026-05-18T09:30:00",
        likes: 12,
        comentarios: 2,
        curtido: false
    },
    {
        id_publicacao: 2,
        id_bairro: 2,
        titulo: "CAÇADOR DE CEARENSES",
        info_A: "Conteúdo demonstrativo da publicação realizada dentro do sistema integrado.",
        info_B: "+67 (69) 6767-6767",
        info_C: "Geral",
        nome: "Adamastor Correia Lopes Kirky",
        nome_bairro: "Trindade",
        data_hora: "2026-05-18T12:06:00",
        likes: 42,
        comentarios: 7,
        curtido: false
    },
    {
        id_publicacao: 3,
        id_bairro: 3,
        titulo: "LIMPEZA DA PRAIA",
        info_A: "Mutirão voluntário para recolhimento de resíduos na faixa de areia.",
        info_B: "+55 (48) 8888-8888",
        info_C: "Meio Ambiente",
        nome: "Carlos Souza",
        nome_bairro: "Ingleses",
        data_hora: "2026-05-17T15:45:00",
        likes: 25,
        comentarios: 4,
        curtido: false
    }
];

function formatarDataPadraoProjeto(stringData) {
    let d = new Date(stringData);
    let hrs = String(d.getHours()).padStart(2, '0');
    let min = String(d.getMinutes()).padStart(2, '0');
    let dia = String(d.getDate()).padStart(2, '0');
    let mes = String(d.getMonth() + 1).padStart(2, '0');
    let ano = String(d.getFullYear()).slice(-2);
    return hrs + ":" + min + " - " + dia + "/" + mes + "/" + ano;
}

function atualizarPainelLateral() {
    let container = document.getElementById("wrapper-autenticacao-dinamica");
    
    if (!usuarioLogado) {
        container.innerHTML = `
            <div class="alerta-deslogado">Parece que você ainda não logou!</div>
            <div class="subtexto-alerta">Crie sua conta agora mesmo! É de graça :)</div>
            <button class="btn-registrar" disabled>Registrar Ação</button>
            <button class="btn-navegacao" onclick="abrirModalLogin()">Fazer Login</button>
        `;
    } else {
        container.innerHTML = `
            <div class="perfil-logado-container">
                <div class="avatar-usuario">Perfil Logado</div>
                <div class="card-autor-nome">${infoUsuarioLogado.nome}</div>
                <div class="card-bairro-info">Contador de Postagens: ${infoUsuarioLogado.totalAcoes}</div>
                <div class="card-bairro-info" style="color:#FFF; font-weight:bold; margin-top:5px;">${infoUsuarioLogado.nome_bairro}</div>
            </div>
            <button class="btn-registrar" onclick="alert('Formulário Registre sua ação aberto!')">Registrar Ação</button>
            <button class="btn-navegacao" onclick="efetuarLogout()">Sair da Conta</button>
        `;
    }
}

async function buscarFiltrosBairrosDB() {
    try {
        let res = await fetch('http://localhost:3000/api/bairros');
        if (res.ok) {
            let bairros = await res.json();
            renderizarFiltrosBairros(bairros);
        } else {
            renderizarFiltrosBairros(bairrosPadrao);
        }
    } catch (e) {
        renderizarFiltrosBairros(bairrosPadrao);
    }
}

function renderizarFiltrosBairros(lista) {
    let ul = document.getElementById("elemento-filtros-bairros");
    ul.innerHTML = `<li><a id="filtro-todos" class="ativo" onclick="aplicarFiltroBairro(null)">Ver Todos</a></li>`;
    lista.forEach(function(b) {
        let nome = b.nome_bairro || b.Bairro;
        let id = b.id_bairro;
        ul.innerHTML += `<li><a id="filtro-b-${id}" onclick="aplicarFiltroBairro(${id})">${nome}</a></li>`;
    });
}

async function carregarPublicacoesDoBanco() {
    try {
        let url = 'http://localhost:3000/api/publicacoes';
        if (bairroFiltroAtivo) {
            url += "?bairro_id=" + bairroFiltroAtivo;
        }
        
        let res = await fetch(url);
        if (res.ok) {
            let dados = await res.json();
            mapearEGuardarPublicacoes(dados);
        } else {
            filtrarEGuardarLocais();
        }
    } catch (e) {
        filtrarEGuardarLocais();
    }
    renderizarPaginaAtual();
}

function mapearEGuardarPublicacoes(dados) {
    listaPublicacoesFiltradas = dados.map(function(p) {
        return {
            id_publicacao: p.id_publicacao,
            id_bairro: p.id_bairro,
            titulo: p.titulo,
            info_A: p.info_A,
            info_B: p.info_B,
            info_C: p.info_C,
            nome: p.nome,
            nome_bairro: p.nome_bairro || "Florianópolis",
            data_hora: p.data_hora,
            likes: p.likes || 0,
            comentarios: p.comentarios || 0,
            curtido: false
        };
    });
}

function filtrarEGuardarLocais() {
    if (bairroFiltroAtivo) {
        listaPublicacoesFiltradas = publicacoesPadrao.filter(p => p.id_bairro === bairroFiltroAtivo);
    } else {
        listaPublicacoesFiltradas = [...publicacoesPadrao];
    }
}

function renderizarPaginaAtual() {
    let feed = document.getElementById("container-feed-real");
    feed.innerHTML = "";

    if (listaPublicacoesFiltradas.length === 0) {
        feed.innerHTML = `<p style="text-align:center; color:#888; padding: 20px;">Nenhuma ação cadastrada neste filtro.</p>`;
        verificarLimitesBotoesPaginacao();
        return;
    }

    let indiceInicio = (paginaAtual - 1) * itensPorPagina;
    let indiceFim = indiceInicio + itensPorPagina;
    let itensExibidos = listaPublicacoesFiltradas.slice(indiceInicio, indiceFim);

    itensExibidos.forEach(function(pub) {
        let card = document.createElement("div");
        card.className = "card-mensagem-real";
        card.innerHTML = `
            <div class="card-corpo-superior">
                <div class="card-bloco-usuario">
                    <div class="card-foto-moldura"></div>
                    <div class="card-autor-nome">${pub.nome || 'Anônimo'}</div>
                    <div class="card-bairro-info">${pub.nome_bairro}</div>
                </div>
                <div class="card-bloco-conteudo">
                    <h4 class="card-titulo-texto">${pub.titulo}</h4>
                    <div class="card-caixa-branca">${pub.info_A}</div>
                </div>
            </div>
            <div class="card-rodape-interacoes">
                <span class="card-contato-campo">${pub.info_B || ''}</span>
                <div class="item-clicavel-acao" onclick="interagirCurtidaDoCard(${pub.id_publicacao}, this)">
                    <span class="icone-like-heart ${pub.curtido ? 'vermelho-ativo' : ''}">❤</span>
                    <span class="quantidade-likes-num">${pub.likes}</span>
                </div>
                <div class="item-clicavel-acao" onclick="alternarVisibilidadeComentarios(${pub.id_publicacao})">
                    <span class="icone-comentario-svg">💬</span>
                    <span id="badge-coment-${pub.id_publicacao}">${pub.comentarios}</span>
                </div>
                <div>${formatarDataPadraoProjeto(pub.data_hora)}</div>
            </div>
            <div id="box-comentarios-${pub.id_publicacao}" class="container-comentarios-expansivel">
                <div class="caixa-input-comentario">
                    <input type="text" id="campo-coment-text-${pub.id_publicacao}" class="input-comentario-campo" placeholder="Responder comentário...">
                    <button class="btn-enviar-comentario-seta" onclick="enviarComentarioDoCard(${pub.id_publicacao})">➔</button>
                </div>
            </div>
        `;
        feed.appendChild(card);
    });

    verificarLimitesBotoesPaginacao();
}

function mudarPagina(direcao) {
    if (!usuarioLogado) { abrirModalLogin(); return; }
    paginaAtual += direcao;
    renderizarPaginaAtual();
}

function aplicarFiltroBairro(idBairro) {
    if (!usuarioLogado) { abrirModalLogin(); return; }
    bairroFiltroAtivo = idBairro;
    paginaAtual = 1;
    
    document.querySelectorAll(".lista-filtros a").forEach(el => el.classList.remove("ativo"));
    let target = idBairro ? document.getElementById("filtro-b-" + idBairro) : document.getElementById("filtro-todos");
    if (target) target.classList.add("ativo");

    carregarPublicacoesDoBanco();
}

function verificarLimitesBotoesPaginacao() {
    let totalPaginas = Math.ceil(listaPublicacoesFiltradas.length / itensPorPagina) || 1;
    document.getElementById("indicador-pagina").textContent = paginaAtual;
    document.getElementById("btn-pag-anterior").disabled = (paginaAtual === 1);
    document.getElementById("btn-pag-proximo").disabled = (paginaAtual === totalPaginas || listaPublicacoesFiltradas.length === 0);
}

function interagirCurtidaDoCard(idPub, elementoHtml) {
    if (!usuarioLogado) { abrirModalLogin(); return; }
    let heart = elementoHtml.querySelector(".icone-like-heart");
    let txtNum = elementoHtml.querySelector(".quantidade-likes-num");
    let valorAtual = parseInt(txtNum.textContent);

    let item = listaPublicacoesFiltradas.find(p => p.id_publicacao === idPub);

    if (heart.classList.contains("vermelho-ativo")) {
        heart.classList.remove("vermelho-ativo");
        txtNum.textContent = valorAtual - 1;
        if(item) { item.curtido = false; item.likes--; }
    } else {
        heart.classList.add("vermelho-ativo");
        txtNum.textContent = valorAtual + 1;
        if(item) { item.curtido = true; item.likes++; }
    }
}

function alternarVisibilidadeComentarios(idPub) {
    if (!usuarioLogado) { abrirModalLogin(); return; }
    let box = document.getElementById("box-comentarios-" + idPub);
    box.classList.toggle("exibir-bloco");
}

function enviarComentarioDoCard(idPub) {
    let input = document.getElementById("campo-coment-text-" + idPub);
    let texto = input.value.trim();

    if (texto.length <= 2) {
        alert("O comentário precisa ter mais do que 2 caracteres para ser válido!");
        return;
    }

    let badge = document.getElementById("badge-coment-" + idPub);
    badge.textContent = parseInt(badge.textContent) + 1;
    input.value = "";
    alert("Resposta adicionada com sucesso!");
}

function verificarPermissaoAcao() {
    if (!usuarioLogado) { abrirModalLogin(); return; }
    alert("Iniciando publicação...");
}

function abrirModalLogin() {
    document.getElementById("modal-login-sistema").classList.add("exibir-flex");
}

function fecharModalLogin() {
    document.getElementById("modal-login-sistema").classList.remove("exibir-flex");
    limparErrosModal();
}

function limparErrosModal() {
    let msgErro = document.getElementById("texto-erro-modal");
    msgErro.classList.remove("exibir-bloco");
    document.getElementById("login-input-email").classList.remove("input-erro-borda");
    document.getElementById("login-input-senha").classList.remove("input-erro-borda");
}

async function processarLoginFront() {
    limparErrosModal();
    let email = document.getElementById("login-input-email").value.trim();
    let senha = document.getElementById("login-input-senha").value.trim();
    let msgErro = document.getElementById("texto-erro-modal");

    if (!email || !senha) {
        msgErro.textContent = "email ou senha obrigatório";
        msgErro.classList.add("exibir-bloco");
        if (!email) document.getElementById("login-input-email").classList.add("input-erro-borda");
        if (!senha) document.getElementById("login-input-senha").classList.add("input-erro-borda");
        return;
    }

    try {
        let res = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: senha })
        });

        if (res.ok) {
            let data = await res.json();
            usuarioLogado = true;
            infoUsuarioLogado = { nome: data.usuario.nome, nome_bairro: "Membro Ativo", totalAcoes: 1 };
            fecharModalLogin();
            atualizarPainelLateral();
            carregarPublicacoesDoBanco();
        } else {
            exibirErroCredenciaisIncorretas();
        }
    } catch (e) {
        if(email === "admin@teste.com" && senha === "123") {
            usuarioLogado = true;
            infoUsuarioLogado = { nome: "Pessoa Rapaz", nome_bairro: "Bairrolux", totalAcoes: 42 };
            fecharModalLogin();
            atualizarPainelLateral();
            carregarPublicacoesDoBanco();
        } else {
            exibirErroCredenciaisIncorretas();
        }
    }
}

function exibirErroCredenciaisIncorretas() {
    let msgErro = document.getElementById("texto-erro-modal");
    msgErro.textContent = "email ou senha incorreta";
    msgErro.classList.add("exibir-bloco");
    document.getElementById("login-input-email").classList.add("input-erro-borda");
    document.getElementById("login-input-senha").classList.add("input-erro-borda");
}

function efetuarLogout() {
    usuarioLogado = false;
    infoUsuarioLogado = null;
    paginaAtual = 1;
    bairroFiltroAtivo = null;
    atualizarPainelLateral();
    carregarPublicacoesDoBanco();
}

document.addEventListener("DOMContentLoaded", function() {
    atualizarPainelLateral();
    buscarFiltrosBairrosDB();
    carregarPublicacoesDoBanco();
});