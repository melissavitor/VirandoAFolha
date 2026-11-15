-- =====================================================================
-- Virando a Folha - Brinquedoteca Barreiro
-- seed.sql - dados de exemplo (TODOS FICTICIOS) para testes e prints
-- Rode DEPOIS do schema.sql.
-- =====================================================================

USE brinquedoteca;

-- ---------------------------------------------------------------------
-- PESSOA (3 responsaveis + 4 funcionarios)
-- ---------------------------------------------------------------------
INSERT INTO PESSOA (cpf, primeiro_nome, sobrenome, sexo, data_nascimento, rua, numero, bairro, cidade) VALUES
('11122233301', 'Ana',      'Souza Lima',      'F', '1988-03-14', 'Rua das Acacias',        '120', 'Barreiro',        'Belo Horizonte'),
('11122233302', 'Carlos',   'Pereira Santos',  'M', '1985-07-22', 'Avenida Afonso Vaz',     '45',  'Barreiro',        'Belo Horizonte'),
('11122233303', 'Fernanda', 'Oliveira Costa',  'F', '1992-11-05', 'Rua Mariano de Abreu',  '310', 'Milionarios',     'Belo Horizonte'),
('22233344401', 'Beatriz',  'Almeida Rocha',   'F', '1980-01-30', 'Rua Francisco Sales',   '88',  'Barreiro',        'Belo Horizonte'),
('22233344402', 'Joao',     'Marques Ribeiro', 'M', '1998-09-12', 'Rua dos Ipes',          '17',  'Tirol',           'Belo Horizonte'),
('22233344403', 'Camila',   'Duarte Nunes',    'F', '2000-04-18', 'Rua Bom Jesus',         '202', 'Flavio Marques Lisboa', 'Belo Horizonte'),
('22233344404', 'Rafael',   'Teixeira Gomes',  'M', '1995-12-03', 'Avenida Tereza Cristina','560','Barreiro de Baixo','Belo Horizonte');

INSERT INTO TELEFONE_PESSOA (cpf, telefone) VALUES
('11122233301', '31988880001'),
('11122233301', '3133330001'),
('11122233302', '31988880002'),
('11122233303', '31988880003'),
('22233344401', '31988880011'),
('22233344402', '31988880012'),
('22233344403', '31988880013'),
('22233344404', '31988880014');

-- ---------------------------------------------------------------------
-- RESPONSAVEL (cod 1, 2, 3)
-- ---------------------------------------------------------------------
INSERT INTO RESPONSAVEL (cod_responsavel, data_cadastro, cpf) VALUES
(1, '2026-09-01', '11122233301'),
(2, '2026-09-10', '11122233302'),
(3, '2026-10-05', '11122233303');

-- ---------------------------------------------------------------------
-- FUNCIONARIO (cod 1..4). A coordenadora (1) supervisiona os demais.
-- ---------------------------------------------------------------------
INSERT INTO FUNCIONARIO (cod_funcionario, data_cadastro, funcao, cpf, cod_supervisor) VALUES
(1, '2025-02-03', 'Coordenadora',  '22233344401', NULL),
(2, '2025-03-10', 'Recepcionista', '22233344402', 1),
(3, '2025-06-16', 'Monitora',      '22233344403', 1),
(4, '2026-01-12', 'Monitor',       '22233344404', 1);

-- Recepcionistas e monitores (a coordenadora atua nos dois papeis: sobreposicao)
INSERT INTO RECEPCIONISTA (cod_recepcionista, cod_funcionario) VALUES
(1, 2),
(2, 1);

INSERT INTO MONITOR (cod_monitor, cod_funcionario) VALUES
(1, 3),
(2, 4),
(3, 1);

-- ---------------------------------------------------------------------
-- CRIANCA (num_sequencial automatico pelo trigger: 1, 2... por responsavel)
-- ---------------------------------------------------------------------
INSERT INTO CRIANCA (cod_responsavel, nome, data_nascimento, observacoes) VALUES
(1, 'Miguel Souza Lima',      '2020-05-20', 'Alergia a amendoim'),
(1, 'Helena Souza Lima',      '2022-08-09', NULL),
(2, 'Arthur Pereira Santos',  '2019-02-11', 'Usa oculos'),
(3, 'Laura Oliveira Costa',   '2021-12-01', NULL);

INSERT INTO TELEFONE_CRIANCA (cod_responsavel, num_sequencial, telefone) VALUES
(1, 1, '31988880001'),
(2, 1, '31988880002'),
(3, 1, '31988880003');

-- Segundo responsavel (opcional): Carlos tambem responde pelo Miguel
INSERT INTO RESPONSAVEL_ADICIONAL (cod_responsavel, num_sequencial, cod_responsavel_adicional) VALUES
(1, 1, 2);

-- ---------------------------------------------------------------------
-- ATENDIMENTO (o ultimo ainda esta em andamento: hora_saida NULL)
-- ---------------------------------------------------------------------
INSERT INTO ATENDIMENTO (cod_atendimento, data, hora_entrada, hora_saida, cod_responsavel, num_sequencial, cod_recepcionista, pago) VALUES
(1, '2026-11-07', '14:00:00', '16:00:00', 1, 1, 1, TRUE),
(2, '2026-11-07', '14:30:00', '17:00:00', 2, 1, 1, TRUE),
(3, '2026-11-12', '15:00:00', '16:30:00', 3, 1, 2, FALSE),
(4, '2026-11-14', '09:00:00', NULL,       1, 2, 1, FALSE);

INSERT INTO ACOMPANHA (cod_atendimento, cod_monitor) VALUES
(1, 1),
(2, 1),
(2, 2),
(3, 2),
(4, 1);

-- ---------------------------------------------------------------------
-- SERVICO (catalogo)
-- ---------------------------------------------------------------------
INSERT INTO SERVICO (cod_servico, nome, descricao, valor) VALUES
(1, 'Decoracao tematica', 'Decoracao completa do espaco conforme o tema', 350.00),
(2, 'Recreacao',          'Recreadores para brincadeiras dirigidas',      450.00),
(3, 'Animacao',           'Personagem e musica ao vivo',                  600.00),
(4, 'Buffet infantil',    'Salgados, doces e bebidas por convidado',       35.00),
(5, 'Fotografia',         'Cobertura fotografica da festa',               300.00);

-- ---------------------------------------------------------------------
-- EVENTO (um confirmado, um em orcamento, um cancelado)
-- ---------------------------------------------------------------------
INSERT INTO EVENTO (cod_evento, data, horario, qtd_convidados, rua, numero, bairro, cidade, cod_responsavel, status) VALUES
(1, '2026-12-05', '15:00:00', 25, 'Rua das Acacias',       '120', 'Barreiro',    'Belo Horizonte', 1, 'CONFIRMADO'),
(2, '2026-12-19', '14:00:00', 40, 'Avenida Afonso Vaz',    '45',  'Barreiro',    'Belo Horizonte', 2, 'ORCAMENTO'),
(3, '2026-11-28', '16:00:00', 15, 'Rua Mariano de Abreu',  '310', 'Milionarios', 'Belo Horizonte', 3, 'CANCELADO');

INSERT INTO FICHA_BRIEFING (tema, observacoes, cod_evento) VALUES
('Fundo do Mar',  'Bolo sem amendoim; convidados de 3 a 6 anos', 1),
('Super-herois',  'Chegada surpresa do personagem as 14h30',     2);

INSERT INTO PARTICIPACAO (cod_funcionario, cod_evento, funcao_evento, horario_atuacao) VALUES
(1, 1, 'Coordenacao', '14:00:00'),
(3, 1, 'Recreacao',   '14:30:00'),
(4, 1, 'Recreacao',   '14:30:00'),
(1, 2, 'Coordenacao', '13:00:00');

-- valor_servico = valor praticado naquele evento (pode diferir do catalogo)
INSERT INTO CONTRATACAO (cod_evento, cod_servico, quantidade, valor_servico) VALUES
(1, 1, 1, 350.00),
(1, 2, 1, 450.00),
(1, 4, 25, 33.00),
(2, 1, 1, 350.00),
(2, 3, 1, 600.00),
(2, 4, 40, 35.00);

-- ---------------------------------------------------------------------
-- ACRESCIMOS: valor da hora e checklists
-- ---------------------------------------------------------------------
INSERT INTO CONFIGURACAO (chave, valor) VALUES
('valor_hora', 25.00);

INSERT INTO CHECKLIST_EVENTO (cod_evento, tipo, item, concluido) VALUES
(1, 'PRE', 'Conferir decoracao e mesas',            TRUE),
(1, 'PRE', 'Conferir lista de convidados',          TRUE),
(1, 'PRE', 'Separar brinquedos e materiais',        FALSE),
(1, 'POS', 'Recolher decoracao',                    FALSE),
(1, 'POS', 'Higienizar o espaco',                   FALSE),
(2, 'PRE', 'Confirmar chegada do personagem',       FALSE);

-- ---------------------------------------------------------------------
-- ACESSO: login dos 4 funcionarios do seed (senha de todos: folha123).
-- O que esta gravado e o HASH da senha, nao a senha. Troque depois em Funcionarios.
-- ---------------------------------------------------------------------
INSERT INTO ACESSO (cpf, senha_hash, perfil) VALUES
('22233344401', '333c1d8ff34ed78935522fae90942997:1fc36e834eb5e4aad90d8ab2f084b4dad61c48ba06df2e232ef0eda3b9ac4e52ca0c9466c054bfd109f9688d56e08a336818fbca40ee51efca06683bd75df8be', 'ADMIN'),
('22233344402', '333c1d8ff34ed78935522fae90942997:1fc36e834eb5e4aad90d8ab2f084b4dad61c48ba06df2e232ef0eda3b9ac4e52ca0c9466c054bfd109f9688d56e08a336818fbca40ee51efca06683bd75df8be', 'FUNCIONARIO'),
('22233344403', '333c1d8ff34ed78935522fae90942997:1fc36e834eb5e4aad90d8ab2f084b4dad61c48ba06df2e232ef0eda3b9ac4e52ca0c9466c054bfd109f9688d56e08a336818fbca40ee51efca06683bd75df8be', 'FUNCIONARIO'),
('22233344404', '333c1d8ff34ed78935522fae90942997:1fc36e834eb5e4aad90d8ab2f084b4dad61c48ba06df2e232ef0eda3b9ac4e52ca0c9466c054bfd109f9688d56e08a336818fbca40ee51efca06683bd75df8be', 'FUNCIONARIO');