const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {

    try {

        const {
            nome,
            email,
            senha,
            bairro_id
        } = req.body;

        const foto = req.file ? req.file.buffer : null;

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const sql = `
            INSERT INTO usuarios
            (nome, email, senha, foto, bairro_id, data_hora)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        db.query(
            sql,
            [nome, email, senhaCriptografada, foto, bairro_id],
            (err, result) => {

                if (err) {
                    console.log(err);
                    return res.status(500).json(err);
                }

                res.json({
                    mensagem: "Usuário cadastrado"
                });
            }
        );

    } catch (error) {

        res.status(500).json(error);

    }

};

exports.login = (req, res) => {

    const { email, senha } = req.body;

    const sql = `
        SELECT * FROM usuarios
        WHERE email = ?
    `;

    db.query(sql, [email], async (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        if (result.length === 0) {
            return res.status(401).json({
                mensagem: "Usuário não encontrado"
            });
        }

        const usuario = result[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {

            return res.status(401).json({
                mensagem: "Senha incorreta"
            });

        }

        res.json({
            mensagem: "Login realizado",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    });

};

exports.getPublicacoes = (req, res) => {

    const sql = `
        SELECT
            publicacoes.*,
            usuarios.nome
        FROM publicacoes
        INNER JOIN usuarios
        ON usuarios.id = publicacoes.usuario_id
        ORDER BY publicacoes.id DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(result);

    });

};

exports.criarPublicacao = (req, res) => {

    const {
        titulo,
        info_A,
        info_B,
        info_C,
        usuario_id,
        bairro_id
    } = req.body;

    const sql = `
        INSERT INTO publicacoes
        (
            titulo,
            info_A,
            info_B,
            info_C,
            usuario_id,
            bairro_id,
            data_hora
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(
        sql,
        [
            titulo,
            info_A,
            info_B,
            info_C,
            usuario_id,
            bairro_id
        ],
        (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensagem: "Publicação criada"
            });

        }
    );

};

exports.criarComentario = (req, res) => {

    const {
        texto,
        usuario_id,
        publicacao_id
    } = req.body;

    const sql = `
        INSERT INTO comentarios
        (
            conteudo,
            usuario_id,
            publicacao_id
        )
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [
            conteudo,
            usuario_id,
            publicacao_id
        ],
        (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensagem: "Comentário criado"
            });

        }
    );

};

exports.curtirPublicacao = (req, res) => {

    const publicacao_id = req.params.id;

    const { usuario_id } = req.body;

    const sql = `
        INSERT INTO curtidas
        (
            usuario_id,
            publicacao_id
        )
        VALUES (?, ?)
    `;

    db.query(
        sql,
        [usuario_id, publicacao_id],
        (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensagem: "Curtida realizada"
            });

        }
    );

};

exports.getPerfil = (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT
            usuarios.id,
            usuarios.nome,
            usuarios.email,
            usuarios.foto,
            bairros.nome_bairro
        FROM usuarios
        INNER JOIN bairros
        ON bairros.id_bairro = usuarios.bairro_id
        WHERE usuarios.id = ?
    `;
        

    db.query(sql, [id], (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(result[0]);

    });

    const[result] = await.db.query(sql,[id]);
        
        if(result[0].foto) {
            result[0].foto = result[0].foto.toString('base64');
        }
        return result[0];
};

exports.getBairros = (req, res) => {
    const sql = `SELECT * FROM bairros`;

    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(result);
    });
};