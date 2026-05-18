const path = require("path");
const mysql = require("mysql2");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const database = process.env.DB_NAME || "falafloripafeito";
const baseConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "senai",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool({
    ...baseConfig,
    database,
    charset: "utf8mb4"
});

const db = pool.promise();

function svgBuffer(svg) {
    return Buffer.from(svg.trim(), "utf8");
}

function iniciais(nome) {
    return String(nome || "FF")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();
}

function avatarSvg(nome, cor = "#bfe0ff") {
    return svgBuffer(`
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
            <rect width="320" height="320" rx="42" fill="${cor}"/>
            <circle cx="160" cy="126" r="58" fill="#ffffff" opacity=".94"/>
            <path d="M72 272c18-62 58-94 88-94s70 32 88 94" fill="#ffffff" opacity=".94"/>
            <text x="160" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#16324f">${iniciais(nome)}</text>
        </svg>
    `);
}

function postagemSvg(titulo) {
    const texto = String(titulo || "Fala Floripa").slice(0, 34);

    return svgBuffer(`
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420">
            <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stop-color="#88c7f5"/>
                    <stop offset="1" stop-color="#c7c4e3"/>
                </linearGradient>
            </defs>
            <rect width="900" height="420" rx="36" fill="url(#g)"/>
            <circle cx="110" cy="92" r="54" fill="#ffffff" opacity=".24"/>
            <circle cx="790" cy="322" r="82" fill="#ffffff" opacity=".18"/>
            <path d="M120 286c76-78 135-90 194-36 58 54 109 48 176-18 74-72 148-70 252 8" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" opacity=".68"/>
            <text x="450" y="214" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${texto}</text>
        </svg>
    `);
}

function ehImagemValida(valor) {
    if (!valor) return false;
    const buffer = Buffer.isBuffer(valor) ? valor : Buffer.from(valor);
    if (buffer.length < 4) return false;
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return true;
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
    return buffer.toString("utf8", 0, 80).toLowerCase().includes("<svg");
}

async function colunaExiste(tabela, coluna) {
    const [rows] = await db.query(
        `
            SELECT COUNT(*) AS total
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        `,
        [database, tabela, coluna]
    );

    return rows[0].total > 0;
}

async function addColunaSeFaltar(tabela, coluna, definicao) {
    if (!(await colunaExiste(tabela, coluna))) {
        await db.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
    }
}

async function initializeDatabase() {
    const conexaoSetup = await mysql.createConnection(baseConfig).promise();
    await conexaoSetup.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conexaoSetup.end();

    await db.query(`
        CREATE TABLE IF NOT EXISTS bairros (
            id_bairro INT NOT NULL AUTO_INCREMENT,
            nome_bairro VARCHAR(100) NOT NULL,
            regiao VARCHAR(50) NOT NULL,
            PRIMARY KEY (id_bairro),
            UNIQUE KEY uq_bairros_nome_regiao (nome_bairro, regiao)
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT NOT NULL AUTO_INCREMENT,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            senha VARCHAR(255) NOT NULL,
            foto LONGBLOB DEFAULT NULL,
            foto_tipo VARCHAR(80) DEFAULT NULL,
            data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            bairro_id INT DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_usuarios_email (email),
            KEY idx_usuarios_bairro (bairro_id),
            CONSTRAINT fk_usuarios_bairros
                FOREIGN KEY (bairro_id)
                REFERENCES bairros(id_bairro)
                ON DELETE SET NULL
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS publicacoes (
            id_publicacao INT NOT NULL AUTO_INCREMENT,
            titulo VARCHAR(255) NOT NULL,
            info_A TEXT NOT NULL,
            info_B TEXT NOT NULL,
            info_C TEXT NOT NULL,
            imagem LONGBLOB DEFAULT NULL,
            imagem_tipo VARCHAR(80) DEFAULT NULL,
            data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            usuario_id INT NOT NULL,
            bairro_id INT DEFAULT NULL,
            PRIMARY KEY (id_publicacao),
            KEY idx_publicacoes_usuario (usuario_id),
            KEY idx_publicacoes_bairro (bairro_id),
            KEY idx_publicacoes_data_hora (data_hora),
            CONSTRAINT fk_publicacoes_usuarios
                FOREIGN KEY (usuario_id)
                REFERENCES usuarios(id)
                ON DELETE CASCADE,
            CONSTRAINT fk_publicacoes_bairros
                FOREIGN KEY (bairro_id)
                REFERENCES bairros(id_bairro)
                ON DELETE SET NULL
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS comentarios (
            id_comentario INT NOT NULL AUTO_INCREMENT,
            conteudo TEXT NOT NULL,
            data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            publicacao_id INT NOT NULL,
            usuario_id INT NOT NULL,
            PRIMARY KEY (id_comentario),
            KEY idx_comentarios_publicacao (publicacao_id),
            KEY idx_comentarios_usuario (usuario_id),
            KEY idx_comentarios_publicacao_data (publicacao_id, data_hora),
            CONSTRAINT fk_comentarios_publicacoes
                FOREIGN KEY (publicacao_id)
                REFERENCES publicacoes(id_publicacao)
                ON DELETE CASCADE,
            CONSTRAINT fk_comentarios_usuarios
                FOREIGN KEY (usuario_id)
                REFERENCES usuarios(id)
                ON DELETE CASCADE
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS curtidas (
            id_curtida INT NOT NULL AUTO_INCREMENT,
            data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            usuario_id INT NOT NULL,
            publicacao_id INT NOT NULL,
            PRIMARY KEY (id_curtida),
            UNIQUE KEY uq_curtidas_usuario_publicacao (usuario_id, publicacao_id),
            KEY idx_curtidas_usuario (usuario_id),
            KEY idx_curtidas_publicacao (publicacao_id),
            CONSTRAINT fk_curtidas_usuarios
                FOREIGN KEY (usuario_id)
                REFERENCES usuarios(id)
                ON DELETE CASCADE,
            CONSTRAINT fk_curtidas_publicacoes
                FOREIGN KEY (publicacao_id)
                REFERENCES publicacoes(id_publicacao)
                ON DELETE CASCADE
        )
    `);

    await addColunaSeFaltar("usuarios", "foto_tipo", "VARCHAR(80) DEFAULT NULL");
    await addColunaSeFaltar("publicacoes", "imagem", "LONGBLOB DEFAULT NULL");
    await addColunaSeFaltar("publicacoes", "imagem_tipo", "VARCHAR(80) DEFAULT NULL");

    await db.query(`
        INSERT IGNORE INTO bairros (id_bairro, nome_bairro, regiao) VALUES
        (1, 'Canasvieiras', 'norte'),
        (2, 'Ingleses', 'norte'),
        (3, 'Campeche', 'sul'),
        (4, 'Tapera', 'sul'),
        (5, 'Lagoa da Conceição', 'leste'),
        (6, 'Barra da Lagoa', 'leste'),
        (7, 'Centro Floripa', 'centro'),
        (8, 'Trindade', 'centro'),
        (9, 'Coqueiros', 'oeste_continente'),
        (10, 'Estreito', 'oeste_continente')
    `);

    await db.query("UPDATE usuarios SET nome = 'Prof. Santiago' WHERE nome = 'Prof. Santusuariosusuariosiago'");
    await db.query("UPDATE usuarios SET nome = 'Prof. Wygor', email = 'professorwygor@senai.com' WHERE email = 'professorwigor@senai.com'");

    const [[usuariosInfo]] = await db.query("SELECT COUNT(*) AS total FROM usuarios");
    if (usuariosInfo.total === 0) {
        await db.query(
            `
                INSERT INTO usuarios (id, nome, email, senha, foto, foto_tipo, data_hora, bairro_id)
                VALUES (?, ?, ?, ?, ?, ?, '2026-05-04 13:45:01', ?),
                       (?, ?, ?, ?, ?, ?, '2026-05-04 13:45:01', ?),
                       (?, ?, ?, ?, ?, ?, '2026-05-04 13:45:01', ?)
            `,
            [
                1, "Prof. Santiago", "professorsantiago@senai.com", "12345", avatarSvg("Prof. Santiago", "#a7d8ff"), "image/svg+xml", 7,
                2, "Prof. Wygor", "professorwygor@senai.com", "12345", avatarSvg("Prof. Wygor", "#c7f3d4"), "image/svg+xml", 8,
                3, "Prof. Luan", "professorluan@senai.com", "12345", avatarSvg("Prof. Luan", "#f7d6a6"), "image/svg+xml", 1
            ]
        );
    }

    await db.query(`
        UPDATE publicacoes
        SET titulo = 'Mutirão no Centro',
            info_A = 'Organização de conversa comunitária para mapear melhorias no centro da cidade.',
            info_B = '+55 (48) 99123-1111',
            info_C = 'Prioridade alta'
        WHERE titulo = 'nome tipo A' AND info_A = 'aaa'
    `);
    await db.query(`
        UPDATE publicacoes
        SET titulo = 'Rota segura na Trindade',
            info_A = 'Registro de ponto com pouca iluminação e sugestão de rota mais segura para estudantes.',
            info_B = '+55 (48) 99222-2222',
            info_C = 'Em análise'
        WHERE titulo = 'nome tipo B' AND info_A = 'bbb'
    `);
    await db.query(`
        UPDATE publicacoes
        SET titulo = 'Apoio em Canasvieiras',
            info_A = 'Pedido de apoio para divulgar uma ação local com moradores e comerciantes.',
            info_B = '+55 (48) 99333-3333',
            info_C = 'Aberto'
        WHERE titulo = 'nome tipo C' AND info_A = 'ccc'
    `);

    const [[publicacoesInfo]] = await db.query("SELECT COUNT(*) AS total FROM publicacoes");
    if (publicacoesInfo.total === 0) {
        await db.query(
            `
                INSERT INTO publicacoes
                    (id_publicacao, titulo, info_A, info_B, info_C, imagem, imagem_tipo, data_hora, usuario_id, bairro_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, '2026-05-04 13:45:01', ?, ?),
                       (?, ?, ?, ?, ?, ?, ?, '2026-05-04 13:45:01', ?, ?),
                       (?, ?, ?, ?, ?, ?, ?, '2026-05-04 13:45:01', ?, ?)
            `,
            [
                1, "Mutirão no Centro", "Organização de conversa comunitária para mapear melhorias no centro da cidade.", "+55 (48) 99123-1111", "Prioridade alta", postagemSvg("Mutirão no Centro"), "image/svg+xml", 1, 7,
                2, "Rota segura na Trindade", "Registro de ponto com pouca iluminação e sugestão de rota mais segura para estudantes.", "+55 (48) 99222-2222", "Em análise", postagemSvg("Rota segura na Trindade"), "image/svg+xml", 2, 8,
                3, "Apoio em Canasvieiras", "Pedido de apoio para divulgar uma ação local com moradores e comerciantes.", "+55 (48) 99333-3333", "Aberto", postagemSvg("Apoio em Canasvieiras"), "image/svg+xml", 3, 1
            ]
        );
    }

    const [usuarios] = await db.query("SELECT id, nome, foto, foto_tipo FROM usuarios");
    for (const usuario of usuarios) {
        if (!usuario.foto_tipo || !ehImagemValida(usuario.foto)) {
            await db.query("UPDATE usuarios SET foto = ?, foto_tipo = ? WHERE id = ?", [
                avatarSvg(usuario.nome),
                "image/svg+xml",
                usuario.id
            ]);
        }
    }

    const [publicacoes] = await db.query("SELECT id_publicacao, titulo, imagem, imagem_tipo FROM publicacoes");
    for (const publicacao of publicacoes) {
        if (!publicacao.imagem_tipo || !ehImagemValida(publicacao.imagem)) {
            await db.query("UPDATE publicacoes SET imagem = ?, imagem_tipo = ? WHERE id_publicacao = ?", [
                postagemSvg(publicacao.titulo),
                "image/svg+xml",
                publicacao.id_publicacao
            ]);
        }
    }

    console.log("Pool conectado e banco verificado.");
}

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;
module.exports.avatarSvg = avatarSvg;
module.exports.postagemSvg = postagemSvg;
