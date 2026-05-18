const db = require("../config/db");
const bcrypt = require("bcrypt");

function detectarMime(buffer) {
    if (!buffer || buffer.length < 4) return "image/png";
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
    if (buffer.toString("utf8", 0, 80).toLowerCase().includes("<svg")) return "image/svg+xml";
    return "image/png";
}

function blobParaDataUrl(blob, mime) {
    if (!blob) return null;
    const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
    return `data:${mime || detectarMime(buffer)};base64,${buffer.toString("base64")}`;
}

async function senhaConfere(senhaDigitada, senhaBanco) {
    const senhaTexto = String(senhaBanco || "");

    if (senhaTexto.startsWith("$2")) {
        return bcrypt.compare(String(senhaDigitada), senhaTexto);
    }

    return String(senhaDigitada) === senhaTexto;
}

function publicacaoJson(row) {
    return {
        id_publicacao: row.id_publicacao,
        titulo: row.titulo,
        info_A: row.info_A,
        info_B: row.info_B,
        info_C: row.info_C,
        data_hora: row.data_hora,
        usuario_id: row.usuario_id,
        bairro_id: row.bairro_id,
        nome_usuario: row.nome_usuario,
        nome_bairro: row.nome_bairro,
        regiao: row.regiao,
        foto_usuario: blobParaDataUrl(row.foto_usuario, row.foto_tipo),
        imagem_publicacao: blobParaDataUrl(row.imagem_publicacao, row.imagem_tipo),
        total_curtidas: Number(row.total_curtidas || 0),
        total_comentarios: Number(row.total_comentarios || 0),
        curtido_usuario: Boolean(row.curtido_usuario)
    };
}

exports.register = async (req, res) => {
    try {
        const { nome, email, senha, bairro_id } = req.body;

        if (!nome || !email || !senha || !bairro_id) {
            return res.status(400).json({ mensagem: "Preencha todos os campos obrigatórios." });
        }

        const foto = req.file ? req.file.buffer : db.avatarSvg(nome);
        const fotoTipo = req.file ? req.file.mimetype : "image/svg+xml";
        const senhaCriptografada = await bcrypt.hash(String(senha), 10);

        const [result] = await db.query(
            `
                INSERT INTO usuarios (nome, email, senha, foto, foto_tipo, bairro_id, data_hora)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `,
            [nome, email, senhaCriptografada, foto, fotoTipo, bairro_id]
        );

        res.status(201).json({
            mensagem: "Usuário cadastrado",
            usuario: {
                id: result.insertId,
                nome,
                email,
                bairro_id: Number(bairro_id),
                foto: blobParaDataUrl(foto, fotoTipo)
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ mensagem: "E-mail já cadastrado." });
        }

        res.status(500).json({ mensagem: "Erro ao cadastrar usuário.", erro: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ mensagem: "email ou senha obrigatório" });
        }

        const [result] = await db.query(
            `
                SELECT usuarios.*, bairros.nome_bairro
                FROM usuarios
                LEFT JOIN bairros ON bairros.id_bairro = usuarios.bairro_id
                WHERE usuarios.email = ?
            `,
            [email]
        );

        if (result.length === 0) {
            return res.status(401).json({ mensagem: "email ou senha incorreta" });
        }

        const usuario = result[0];
        const senhaCorreta = await senhaConfere(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: "email ou senha incorreta" });
        }

        res.json({
            mensagem: "Login realizado",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                bairro_id: usuario.bairro_id,
                nome_bairro: usuario.nome_bairro,
                foto: blobParaDataUrl(usuario.foto, usuario.foto_tipo)
            }
        });
    } catch (error) {
        res.status(500).json({ mensagem: "Erro ao realizar login.", erro: error.message });
    }
};

exports.getBairros = async (req, res) => {
    try {
        const [result] = await db.query("SELECT * FROM bairros ORDER BY nome_bairro");
        res.json(result);
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao buscar bairros.", erro: err.message });
    }
};

exports.getPublicacoes = async (req, res) => {
    try {
        const bairroId = req.query.bairro_id;
        const usuarioId = Number(req.query.usuario_id || 0);
        const params = [usuarioId];
        let filtro = "";

        if (bairroId) {
            filtro = "WHERE publicacoes.bairro_id = ?";
            params.push(bairroId);
        }

        const [result] = await db.query(
            `
                SELECT
                    publicacoes.id_publicacao,
                    publicacoes.titulo,
                    publicacoes.info_A,
                    publicacoes.info_B,
                    publicacoes.info_C,
                    publicacoes.imagem AS imagem_publicacao,
                    publicacoes.imagem_tipo,
                    publicacoes.data_hora,
                    publicacoes.usuario_id,
                    publicacoes.bairro_id,
                    usuarios.nome AS nome_usuario,
                    usuarios.foto AS foto_usuario,
                    usuarios.foto_tipo,
                    bairros.nome_bairro,
                    bairros.regiao,
                    (
                        SELECT COUNT(*)
                        FROM curtidas
                        WHERE curtidas.publicacao_id = publicacoes.id_publicacao
                    ) AS total_curtidas,
                    (
                        SELECT COUNT(*)
                        FROM comentarios
                        WHERE comentarios.publicacao_id = publicacoes.id_publicacao
                    ) AS total_comentarios,
                    EXISTS (
                        SELECT 1
                        FROM curtidas curtidas_usuario
                        WHERE curtidas_usuario.publicacao_id = publicacoes.id_publicacao
                          AND curtidas_usuario.usuario_id = ?
                    ) AS curtido_usuario
                FROM publicacoes
                INNER JOIN usuarios ON usuarios.id = publicacoes.usuario_id
                LEFT JOIN bairros ON bairros.id_bairro = publicacoes.bairro_id
                ${filtro}
                ORDER BY publicacoes.id_publicacao DESC
            `,
            params
        );

        res.json(result.map(publicacaoJson));
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao buscar publicações.", erro: err.message });
    }
};

exports.criarPublicacao = async (req, res) => {
    try {
        const { titulo, info_A, info_B, info_C, usuario_id, bairro_id } = req.body;

        if (!titulo || !info_A || !info_B || !info_C || !usuario_id || !bairro_id) {
            return res.status(400).json({ mensagem: "Preencha todos os campos da publicação." });
        }

        const imagem = req.file ? req.file.buffer : db.postagemSvg(titulo);
        const imagemTipo = req.file ? req.file.mimetype : "image/svg+xml";

        const [result] = await db.query(
            `
                INSERT INTO publicacoes
                    (titulo, info_A, info_B, info_C, imagem, imagem_tipo, usuario_id, bairro_id, data_hora)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `,
            [titulo, info_A, info_B, info_C, imagem, imagemTipo, usuario_id, bairro_id]
        );

        res.status(201).json({ mensagem: "Publicação criada", id_publicacao: result.insertId });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao criar publicação.", erro: err.message });
    }
};

exports.getComentarios = async (req, res) => {
    try {
        const [result] = await db.query(
            `
                SELECT
                    comentarios.id_comentario,
                    comentarios.conteudo,
                    comentarios.data_hora,
                    comentarios.usuario_id,
                    usuarios.nome AS nome_usuario,
                    usuarios.foto AS foto_usuario,
                    usuarios.foto_tipo
                FROM comentarios
                INNER JOIN usuarios ON usuarios.id = comentarios.usuario_id
                WHERE comentarios.publicacao_id = ?
                ORDER BY comentarios.data_hora ASC
            `,
            [req.params.id]
        );

        res.json(
            result.map((comentario) => ({
                ...comentario,
                foto_usuario: blobParaDataUrl(comentario.foto_usuario, comentario.foto_tipo)
            }))
        );
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao buscar comentários.", erro: err.message });
    }
};

exports.criarComentario = async (req, res) => {
    try {
        const { texto, usuario_id, publicacao_id } = req.body;

        if (!texto || texto.trim().length <= 2 || !usuario_id || !publicacao_id) {
            return res.status(400).json({ mensagem: "Comentário deve ter mais de 2 caracteres." });
        }

        const [result] = await db.query(
            "INSERT INTO comentarios (conteudo, usuario_id, publicacao_id, data_hora) VALUES (?, ?, ?, NOW())",
            [texto.trim(), usuario_id, publicacao_id]
        );

        const [[total]] = await db.query(
            "SELECT COUNT(*) AS total FROM comentarios WHERE publicacao_id = ?",
            [publicacao_id]
        );

        res.status(201).json({
            mensagem: "Comentário criado",
            comentario: {
                id_comentario: result.insertId,
                conteudo: texto.trim(),
                usuario_id: Number(usuario_id),
                publicacao_id: Number(publicacao_id),
                data_hora: new Date()
            },
            total_comentarios: Number(total.total)
        });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao comentar.", erro: err.message });
    }
};

exports.curtirPublicacao = async (req, res) => {
    try {
        const publicacaoId = req.params.id;
        const { usuario_id } = req.body;

        if (!usuario_id) {
            return res.status(400).json({ mensagem: "Usuário obrigatório." });
        }

        const [curtida] = await db.query(
            "SELECT id_curtida FROM curtidas WHERE usuario_id = ? AND publicacao_id = ?",
            [usuario_id, publicacaoId]
        );

        let curtido = true;

        if (curtida.length > 0) {
            await db.query("DELETE FROM curtidas WHERE id_curtida = ?", [curtida[0].id_curtida]);
            curtido = false;
        } else {
            await db.query("INSERT INTO curtidas (usuario_id, publicacao_id, data_hora) VALUES (?, ?, NOW())", [
                usuario_id,
                publicacaoId
            ]);
        }

        const [[total]] = await db.query(
            "SELECT COUNT(*) AS total FROM curtidas WHERE publicacao_id = ?",
            [publicacaoId]
        );

        res.json({
            mensagem: curtido ? "Curtida realizada" : "Curtida removida",
            curtido,
            total_curtidas: Number(total.total)
        });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao curtir publicação.", erro: err.message });
    }
};

exports.getPerfil = async (req, res) => {
    try {
        const [result] = await db.query(
            `
                SELECT
                    usuarios.id,
                    usuarios.nome,
                    usuarios.email,
                    usuarios.foto,
                    usuarios.foto_tipo,
                    usuarios.bairro_id,
                    bairros.nome_bairro,
                    (
                        SELECT COUNT(*)
                        FROM publicacoes
                        WHERE publicacoes.usuario_id = usuarios.id
                    ) AS total_publicacoes,
                    (
                        SELECT COUNT(*)
                        FROM curtidas
                        INNER JOIN publicacoes ON publicacoes.id_publicacao = curtidas.publicacao_id
                        WHERE publicacoes.usuario_id = usuarios.id
                    ) AS total_curtidas_recebidas
                FROM usuarios
                LEFT JOIN bairros ON bairros.id_bairro = usuarios.bairro_id
                WHERE usuarios.id = ?
            `,
            [req.params.id]
        );

        if (result.length === 0) {
            return res.status(404).json({ mensagem: "Usuário não encontrado." });
        }

        const usuario = result[0];
        res.json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            bairro_id: usuario.bairro_id,
            nome_bairro: usuario.nome_bairro,
            foto: blobParaDataUrl(usuario.foto, usuario.foto_tipo),
            total_publicacoes: Number(usuario.total_publicacoes || 0),
            total_curtidas_recebidas: Number(usuario.total_curtidas_recebidas || 0)
        });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao buscar perfil.", erro: err.message });
    }
};
