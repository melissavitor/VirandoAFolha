-- =====================================================================
-- Virando a Folha - Brinquedoteca Barreiro
-- consultas.sql - Atividade 3 (10 consultas)
-- Rode DEPOIS do schema.sql, seed.sql e seed_complemento.sql.
-- Execute uma consulta por vez (selecione o bloco e use Ctrl+Enter)
-- para tirar o print de cada resultado.
-- =====================================================================

USE brinquedoteca;

-- ---------------------------------------------------------------------
-- 1) DISTINCT + BETWEEN + ORDER BY (com 2 JOINs)
-- Enunciado: Listar, sem repeticao, os nomes dos servicos contratados em
-- eventos realizados em dezembro de 2026, em ordem alfabetica.
-- ---------------------------------------------------------------------
SELECT DISTINCT s.nome AS servico
FROM SERVICO s
JOIN CONTRATACAO c ON c.cod_servico = s.cod_servico
JOIN EVENTO e      ON e.cod_evento  = c.cod_evento
WHERE e.data BETWEEN '2026-12-01' AND '2026-12-31'
ORDER BY s.nome;

-- ---------------------------------------------------------------------
-- 2) LEFT JOIN
-- Enunciado: Listar todos os eventos e os servicos contratados em cada um,
-- mostrando tambem os eventos que ainda nao contrataram nenhum servico.
-- ---------------------------------------------------------------------
SELECT e.cod_evento, e.data, e.status, c.cod_servico, c.quantidade
FROM EVENTO e
LEFT JOIN CONTRATACAO c ON c.cod_evento = e.cod_evento
ORDER BY e.cod_evento, c.cod_servico;

-- ---------------------------------------------------------------------
-- 3) RIGHT JOIN
-- Enunciado: Listar todos os servicos do catalogo e os eventos que os
-- contrataram, mostrando tambem os servicos que nunca foram contratados.
-- ---------------------------------------------------------------------
SELECT s.cod_servico, s.nome AS servico, c.cod_evento
FROM CONTRATACAO c
RIGHT JOIN SERVICO s ON s.cod_servico = c.cod_servico
ORDER BY s.cod_servico, c.cod_evento;

-- ---------------------------------------------------------------------
-- 4) IS NULL (com 1 JOIN)
-- Enunciado: Listar os atendimentos em andamento (sem hora de saida
-- registrada), com o nome da crianca atendida.
-- ---------------------------------------------------------------------
SELECT a.cod_atendimento, a.data, a.hora_entrada, c.nome AS crianca
FROM ATENDIMENTO a
JOIN CRIANCA c ON c.cod_responsavel = a.cod_responsavel
              AND c.num_sequencial  = a.num_sequencial
WHERE a.hora_saida IS NULL;

-- ---------------------------------------------------------------------
-- 5) AND + OR (com 2 JOINs)
-- Enunciado: Listar os eventos confirmados ou em orcamento que tenham mais
-- de 20 convidados, com o nome do responsavel.
-- ---------------------------------------------------------------------
SELECT e.cod_evento, e.data, e.qtd_convidados, e.status,
       CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS responsavel
FROM EVENTO e
JOIN RESPONSAVEL r ON r.cod_responsavel = e.cod_responsavel
JOIN PESSOA p      ON p.cpf = r.cpf
WHERE (e.status = 'CONFIRMADO' OR e.status = 'ORCAMENTO')
  AND e.qtd_convidados > 20
ORDER BY e.data;

-- ---------------------------------------------------------------------
-- 6) LIKE
-- Enunciado: Listar as criancas cujo nome contem "Lima".
-- ---------------------------------------------------------------------
SELECT nome, data_nascimento
FROM CRIANCA
WHERE nome LIKE '%Lima%'
ORDER BY nome;

-- ---------------------------------------------------------------------
-- 7) GROUP BY (funcao de agrupamento SUM)
-- Enunciado: Calcular o valor total contratado em cada evento
-- (quantidade x valor praticado de cada servico).
-- ---------------------------------------------------------------------
SELECT cod_evento, SUM(quantidade * valor_servico) AS valor_total
FROM CONTRATACAO
GROUP BY cod_evento
ORDER BY cod_evento;

-- ---------------------------------------------------------------------
-- 8) HAVING (com 2 JOINs)
-- Enunciado: Listar os responsaveis que possuem mais de uma crianca
-- cadastrada, com a quantidade de criancas.
-- ---------------------------------------------------------------------
SELECT r.cod_responsavel,
       CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS responsavel,
       COUNT(*) AS qtd_criancas
FROM RESPONSAVEL r
JOIN PESSOA p  ON p.cpf = r.cpf
JOIN CRIANCA c ON c.cod_responsavel = r.cod_responsavel
GROUP BY r.cod_responsavel, p.primeiro_nome, p.sobrenome
HAVING COUNT(*) > 1;

-- ---------------------------------------------------------------------
-- 9a) SUBQUERY SEM CORRELACAO
-- Enunciado: Listar os servicos cujo valor e maior que o valor medio
-- de todos os servicos do catalogo.
-- ---------------------------------------------------------------------
SELECT nome, valor
FROM SERVICO
WHERE valor > (SELECT AVG(valor) FROM SERVICO)
ORDER BY valor DESC;

-- ---------------------------------------------------------------------
-- 9b) SUBQUERY COM CORRELACAO (com 1 JOIN)
-- Enunciado: Para cada funcionario, mostrar o nome e em quantos eventos
-- ele participa da equipe.
-- ---------------------------------------------------------------------
SELECT f.cod_funcionario, p.primeiro_nome, f.funcao,
       (SELECT COUNT(*)
          FROM PARTICIPACAO pa
         WHERE pa.cod_funcionario = f.cod_funcionario) AS qtd_eventos
FROM FUNCIONARIO f
JOIN PESSOA p ON p.cpf = f.cpf
ORDER BY f.cod_funcionario;