const db = require("../config/db"); 
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {
    try {
        const { nome, email, senha, bairro_id } = req.body;
        const foto = req.file ? req.file.buffer : null;
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        
        const sql = `INSERT INTO usuarios (nome, email, senha, foto, bairro_id, data_hora) VALUES (?, ?, ?, ?, ?, NOW())`;
        await db.query(sql, [nome, email, senhaCriptografada, foto, bairro_id]);
        
        res.json({ mensagem: "Usuário cadastrado" });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const sql = `SELECT * FROM usuarios WHERE email = ?`;
        const [result] = await db.query(sql, [email]);

        if (result.length === 0) return res.status(401).json({ mensagem: "Usuário não encontrado" });

        const usuario = result[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) return res.status(401).json({ mensagem: "Senha incorreta" });

        res.json({ mensagem: "Login realizado", usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }});
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.getBairros = async (req, res) => {
    try {
        const [result] = await db.query(`SELECT * FROM bairros`);
        res.json(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.getPublicacoes = async (req, res) => {
    try {
        const bairro_id = req.query.bairro_id;
        
        let sql = `
            SELECT publicacoes.*, usuarios.nome 
            FROM publicacoes
            INNER JOIN usuarios ON usuarios.id = publicacoes.usuario_id
        `;
        const params = [];

        if (bairro_id) {
            sql += ` WHERE publicacoes.bairro_id = ?`;
            params.push(bairro_id);
        }
        
        sql += ` ORDER BY publicacoes.id_publicacao DESC`;

        const [result] = await db.query(sql, params);
        res.json(result);
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.criarPublicacao = async (req, res) => {
    try {
        const { titulo, info_A, info_B, info_C, usuario_id, bairro_id } = req.body;
        const sql = `INSERT INTO publicacoes (titulo, info_A, info_B, info_C, usuario_id, bairro_id, data_hora) VALUES (?, ?, ?, ?, ?, ?, NOW())`;
        await db.query(sql, [titulo, info_A, info_B, info_C, usuario_id, bairro_id]);
        res.json({ mensagem: "Publicação criada" });
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.criarComentario = async (req, res) => {
    try {
        const { texto, usuario_id, publicacao_id } = req.body; 
        const sql = `INSERT INTO comentarios (conteudo, usuario_id, publicacao_id) VALUES (?, ?, ?)`;
        await db.query(sql, [texto, usuario_id, publicacao_id]);
        res.json({ mensagem: "Comentário criado" });
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.curtirPublicacao = async (req, res) => {
    try {
        const publicacao_id = req.params.id;
        const { usuario_id } = req.body;
        const sql = `INSERT INTO curtidas (usuario_id, publicacao_id) VALUES (?, ?)`;
        await db.query(sql, [usuario_id, publicacao_id]);
        res.json({ mensagem: "Curtida realizada" });
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.getPerfil = async (req, res) => {
    try {
        const id = req.params.id;
        const sql = `
            SELECT usuarios.id, usuarios.nome, usuarios.email, usuarios.foto, bairros.nome_bairro
            FROM usuarios
            INNER JOIN bairros ON bairros.id_bairro = usuarios.bairro_id
            WHERE usuarios.id = ?
        `;
        const [result] = await db.query(sql, [id]);
        
        if (result.length > 0 && result[0].foto) {
            result[0].foto = result[0].foto.toString('base64');
        }
        res.json(result[0]);
    } catch (err) {
        res.status(500).json(err);
    }
};