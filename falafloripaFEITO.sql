CREATE DATABASE IF NOT EXISTS falafloripafeito
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE falafloripafeito;

CREATE TABLE IF NOT EXISTS bairros (
    id_bairro INT NOT NULL AUTO_INCREMENT,
    nome_bairro VARCHAR(100) NOT NULL,
    regiao VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_bairro),
    UNIQUE KEY uq_bairros_nome_regiao (nome_bairro, regiao)
);

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
);

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
);

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
);

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
);

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
(10, 'Estreito', 'oeste_continente');

INSERT IGNORE INTO usuarios (id, nome, email, senha, data_hora, bairro_id) VALUES
(1, 'Prof. Santiago', 'professorsantiago@senai.com', '12345', '2026-05-04 13:45:01', 7),
(2, 'Prof. Wygor', 'professorwygor@senai.com', '12345', '2026-05-04 13:45:01', 8),
(3, 'Prof. Luan', 'professorluan@senai.com', '12345', '2026-05-04 13:45:01', 1);

INSERT IGNORE INTO publicacoes (id_publicacao, titulo, info_A, info_B, info_C, data_hora, usuario_id, bairro_id) VALUES
(1, 'Mutirão no Centro', 'Organização de conversa comunitária para mapear melhorias no centro da cidade.', '+55 (48) 99123-1111', 'Prioridade alta', '2026-05-04 13:45:01', 1, 7),
(2, 'Rota segura na Trindade', 'Registro de ponto com pouca iluminação e sugestão de rota mais segura para estudantes.', '+55 (48) 99222-2222', 'Em análise', '2026-05-04 13:45:01', 2, 8),
(3, 'Apoio em Canasvieiras', 'Pedido de apoio para divulgar uma ação local com moradores e comerciantes.', '+55 (48) 99333-3333', 'Aberto', '2026-05-04 13:45:01', 3, 1);

SELECT * FROM usuarios;
SELECT * FROM bairros;
SELECT * FROM publicacoes;
