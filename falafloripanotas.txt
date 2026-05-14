CREATE DATABASE IF NOT EXISTS falafloripa;
USE falafloripa;

CREATE TABLE IF NOT EXISTS bairros (
    id_bairro INT NOT NULL AUTO_INCREMENT,
    nome_bairro VARCHAR(100) NOT NULL,
    regiao VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_bairro)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    foto_url VARCHAR(255),
    data_hora DATETIME,
    bairro_id INT, -- Corrigido para INT para o relacionamento
    PRIMARY KEY (id),
    CONSTRAINT fk_usuario_bairro FOREIGN KEY (bairro_id) REFERENCES bairros (id_bairro)
);

CREATE TABLE IF NOT EXISTS publicacoes (
    id INT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    info_A TEXT,
    info_B TEXT,
    info_C TEXT,
    data_hora DATETIME,
    usuario_id INT NOT NULL,
    bairro_id INT,
    PRIMARY KEY (id),
    CONSTRAINT fk_publicacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_publicacao_bairro FOREIGN KEY (bairro_id) REFERENCES bairros (id_bairro)
);

CREATE TABLE IF NOT EXISTS curtidas (
    id INT NOT NULL AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    publicacao_id INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_curtida_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_curtida_publicacao FOREIGN KEY (publicacao_id) REFERENCES publicacoes (id)
);

CREATE TABLE IF NOT EXISTS comentarios (
    id INT NOT NULL AUTO_INCREMENT,
    texto TEXT NOT NULL,
    usuario_id INT NOT NULL,
    publicacao_id INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_comentario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_comentario_publicacao FOREIGN KEY (publicacao_id) REFERENCES publicacoes (id)
);

INSERT INTO bairros (nome_bairro, regiao) VALUES 
('Canasvieiras', 'norte'),
('Ingleses', 'norte'),
('Campeche', 'sul'),
('Tapera', 'sul'),
('Lagoa da Conceição', 'leste'),
('Barra da Lagoa', 'leste'),
('Centro Floripa', 'centro'),
('Trindade', 'centro'),
('Coqueiros', 'oeste_continente'),
('Estreito', 'oeste_continente');

INSERT INTO usuarios (id, nome, email, senha, foto_url, data_hora, bairro_id) VALUES 
(1, 'Prof. Santiago', 'professorsantiago@senai.com', '12345', 'profsant.png', '2026-05-04 13:45:01', 7),
(2, 'Prof. Wigor', 'professorwigor@senai.com', '12345', 'profwigor.png', '2026-05-04 13:45:01', 8),
(3, 'Prof. Luan', 'professorluan@senai.com', '12345', 'prof.luan', '2026-05-04 13:45:01', 1);

INSERT INTO publicacoes (id, titulo, info_A, info_B, info_C, data_hora, usuario_id, bairro_id) VALUES 
(1, 'nome tipo A', 'aaa', '111', '0,01', '2026-05-04 13:45:01', 1, 7),
(2, 'nome tipo B', 'bbb', '222', '0,01', '2026-05-05 13:45:01', 2, 8),
(3, 'nome tipo C', 'ccc', '333', '0,01', '2026-05-06 13:45:01', 3, 1);