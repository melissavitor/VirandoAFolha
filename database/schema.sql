-- =====================================================================
-- Virando a Folha - Brinquedoteca Barreiro
-- schema.sql (MySQL 8.0) - baseado no Projeto Lógico, Fase 2 (corrigido)
-- Rode o arquivo INTEIRO (raio / Ctrl+Shift+Enter no Workbench).
-- ATENÇÃO: recria o banco do zero (apaga o que existir em "brinquedoteca").
-- =====================================================================

DROP DATABASE IF EXISTS brinquedoteca;
CREATE DATABASE brinquedoteca CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE brinquedoteca;

-- ---------------------------------------------------------------------
-- PESSOA (superclasse de RESPONSAVEL e FUNCIONARIO)
-- ---------------------------------------------------------------------
CREATE TABLE PESSOA (
  cpf             CHAR(11)     NOT NULL,
  primeiro_nome   VARCHAR(50)  NOT NULL,
  sobrenome       VARCHAR(100) NOT NULL,
  sexo            CHAR(1)      NOT NULL,
  data_nascimento DATE         NOT NULL,
  rua             VARCHAR(100) NOT NULL,
  numero          VARCHAR(10)  NOT NULL,
  bairro          VARCHAR(60)  NOT NULL,
  cidade          VARCHAR(60)  NOT NULL,
  PRIMARY KEY (cpf),
  CONSTRAINT ck_pessoa_cpf  CHECK (cpf REGEXP '^[0-9]{11}$'),
  CONSTRAINT ck_pessoa_sexo CHECK (sexo IN ('M','F','O'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TELEFONE_PESSOA (atributo multivalorado de PESSOA)
-- ---------------------------------------------------------------------
CREATE TABLE TELEFONE_PESSOA (
  cpf      CHAR(11)    NOT NULL,
  telefone VARCHAR(15) NOT NULL,
  PRIMARY KEY (cpf, telefone),
  CONSTRAINT fk_telpessoa_pessoa FOREIGN KEY (cpf) REFERENCES PESSOA (cpf)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_telpessoa_tel CHECK (telefone REGEXP '^[0-9]{1,15}$')
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- RESPONSAVEL (especializacao de PESSOA)
-- ---------------------------------------------------------------------
CREATE TABLE RESPONSAVEL (
  cod_responsavel INT      NOT NULL AUTO_INCREMENT,
  data_cadastro   DATE     NOT NULL DEFAULT (CURRENT_DATE),
  cpf             CHAR(11) NOT NULL,
  PRIMARY KEY (cod_responsavel),
  UNIQUE KEY uq_responsavel_cpf (cpf),
  CONSTRAINT fk_responsavel_pessoa FOREIGN KEY (cpf) REFERENCES PESSOA (cpf)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- FUNCIONARIO (especializacao de PESSOA, com autorrelacionamento)
-- ---------------------------------------------------------------------
CREATE TABLE FUNCIONARIO (
  cod_funcionario INT         NOT NULL AUTO_INCREMENT,
  data_cadastro   DATE        NOT NULL DEFAULT (CURRENT_DATE),
  funcao          VARCHAR(50) NOT NULL,
  cpf             CHAR(11)    NOT NULL,
  cod_supervisor  INT         NULL DEFAULT NULL,
  PRIMARY KEY (cod_funcionario),
  UNIQUE KEY uq_funcionario_cpf (cpf),
  CONSTRAINT fk_funcionario_pessoa FOREIGN KEY (cpf) REFERENCES PESSOA (cpf)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_funcionario_supervisor FOREIGN KEY (cod_supervisor) REFERENCES FUNCIONARIO (cod_funcionario)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
-- (supervisor <> proprio funcionario e controlado por trigger, mais abaixo)

-- ---------------------------------------------------------------------
-- RECEPCIONISTA e MONITOR (especializacoes sobrepostas de FUNCIONARIO)
-- ---------------------------------------------------------------------
CREATE TABLE RECEPCIONISTA (
  cod_recepcionista INT NOT NULL AUTO_INCREMENT,
  cod_funcionario   INT NOT NULL,
  PRIMARY KEY (cod_recepcionista),
  UNIQUE KEY uq_recepcionista_func (cod_funcionario),
  CONSTRAINT fk_recepcionista_func FOREIGN KEY (cod_funcionario) REFERENCES FUNCIONARIO (cod_funcionario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE MONITOR (
  cod_monitor     INT NOT NULL AUTO_INCREMENT,
  cod_funcionario INT NOT NULL,
  PRIMARY KEY (cod_monitor),
  UNIQUE KEY uq_monitor_func (cod_funcionario),
  CONSTRAINT fk_monitor_func FOREIGN KEY (cod_funcionario) REFERENCES FUNCIONARIO (cod_funcionario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- CRIANCA (entidade fraca de RESPONSAVEL)
-- PK = (cod_responsavel, num_sequencial). Se o num_sequencial nao for
-- informado no INSERT, um trigger numera automaticamente (1, 2, 3...).
-- ---------------------------------------------------------------------
CREATE TABLE CRIANCA (
  cod_responsavel INT          NOT NULL,
  num_sequencial  INT          NOT NULL DEFAULT 0,
  nome            VARCHAR(100) NOT NULL,
  data_nascimento DATE         NOT NULL,
  observacoes     VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (cod_responsavel, num_sequencial),
  CONSTRAINT fk_crianca_responsavel FOREIGN KEY (cod_responsavel) REFERENCES RESPONSAVEL (cod_responsavel)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- RESPONSAVEL_ADICIONAL (2o responsavel, opcional, de uma crianca)
-- Regras (adicional <> principal e maximo de 1 adicional): triggers.
-- ---------------------------------------------------------------------
CREATE TABLE RESPONSAVEL_ADICIONAL (
  cod_responsavel           INT NOT NULL,
  num_sequencial            INT NOT NULL,
  cod_responsavel_adicional INT NOT NULL,
  PRIMARY KEY (cod_responsavel, num_sequencial, cod_responsavel_adicional),
  CONSTRAINT fk_respadic_crianca FOREIGN KEY (cod_responsavel, num_sequencial)
    REFERENCES CRIANCA (cod_responsavel, num_sequencial)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_respadic_responsavel FOREIGN KEY (cod_responsavel_adicional)
    REFERENCES RESPONSAVEL (cod_responsavel)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ATENDIMENTO (entrada e saida de uma crianca)
-- hora_saida fica NULL enquanto a crianca esta na brinquedoteca.
-- ACRESCIMO: coluna "pago" (confirmar pagamento, do BPMN TO-BE).
-- ---------------------------------------------------------------------
CREATE TABLE ATENDIMENTO (
  cod_atendimento   INT     NOT NULL AUTO_INCREMENT,
  data              DATE    NOT NULL DEFAULT (CURRENT_DATE),
  hora_entrada      TIME    NOT NULL,
  hora_saida        TIME    NULL DEFAULT NULL,
  cod_responsavel   INT     NOT NULL,
  num_sequencial    INT     NOT NULL,
  cod_recepcionista INT     NOT NULL,
  pago              BOOLEAN NOT NULL DEFAULT FALSE,   -- ACRESCIMO
  PRIMARY KEY (cod_atendimento),
  CONSTRAINT fk_atend_crianca FOREIGN KEY (cod_responsavel, num_sequencial)
    REFERENCES CRIANCA (cod_responsavel, num_sequencial)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_atend_recepcionista FOREIGN KEY (cod_recepcionista)
    REFERENCES RECEPCIONISTA (cod_recepcionista)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_atend_saida CHECK (hora_saida IS NULL OR hora_saida > hora_entrada)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ACOMPANHA (N:N entre MONITOR e ATENDIMENTO)
-- ---------------------------------------------------------------------
CREATE TABLE ACOMPANHA (
  cod_atendimento INT NOT NULL,
  cod_monitor     INT NOT NULL,
  PRIMARY KEY (cod_atendimento, cod_monitor),
  CONSTRAINT fk_acompanha_atend FOREIGN KEY (cod_atendimento) REFERENCES ATENDIMENTO (cod_atendimento)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_acompanha_monitor FOREIGN KEY (cod_monitor) REFERENCES MONITOR (cod_monitor)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- EVENTO (festas e atividades tematicas)
-- ACRESCIMO: coluna "status" (orcamento aprovado ou nao, do BPMN TO-BE).
-- ---------------------------------------------------------------------
CREATE TABLE EVENTO (
  cod_evento      INT          NOT NULL AUTO_INCREMENT,
  data            DATE         NOT NULL,
  horario         TIME         NOT NULL,
  qtd_convidados  INT          NOT NULL,
  rua             VARCHAR(100) NOT NULL,
  numero          VARCHAR(10)  NOT NULL,
  bairro          VARCHAR(60)  NOT NULL,
  cidade          VARCHAR(60)  NOT NULL,
  cod_responsavel INT          NOT NULL,
  status          ENUM('ORCAMENTO','CONFIRMADO','CANCELADO') NOT NULL DEFAULT 'ORCAMENTO',  -- ACRESCIMO
  PRIMARY KEY (cod_evento),
  CONSTRAINT fk_evento_responsavel FOREIGN KEY (cod_responsavel) REFERENCES RESPONSAVEL (cod_responsavel)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_evento_convidados CHECK (qtd_convidados > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- FICHA_BRIEFING (1:1 com EVENTO)
-- ---------------------------------------------------------------------
CREATE TABLE FICHA_BRIEFING (
  cod_briefing INT          NOT NULL AUTO_INCREMENT,
  tema         VARCHAR(100) NOT NULL,
  observacoes  VARCHAR(255) NULL DEFAULT NULL,
  cod_evento   INT          NOT NULL,
  PRIMARY KEY (cod_briefing),
  UNIQUE KEY uq_briefing_evento (cod_evento),
  CONSTRAINT fk_briefing_evento FOREIGN KEY (cod_evento) REFERENCES EVENTO (cod_evento)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- SERVICO (catalogo)
-- ---------------------------------------------------------------------
CREATE TABLE SERVICO (
  cod_servico INT           NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(100)  NOT NULL,
  descricao   VARCHAR(255)  NULL DEFAULT NULL,
  valor       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (cod_servico),
  UNIQUE KEY uq_servico_nome (nome),
  CONSTRAINT ck_servico_valor CHECK (valor >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- PARTICIPACAO (N:N entre FUNCIONARIO e EVENTO)
-- ---------------------------------------------------------------------
CREATE TABLE PARTICIPACAO (
  cod_funcionario INT         NOT NULL,
  cod_evento      INT         NOT NULL,
  funcao_evento   VARCHAR(50) NOT NULL,
  horario_atuacao TIME        NOT NULL,
  PRIMARY KEY (cod_funcionario, cod_evento),
  CONSTRAINT fk_partic_funcionario FOREIGN KEY (cod_funcionario) REFERENCES FUNCIONARIO (cod_funcionario)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_partic_evento FOREIGN KEY (cod_evento) REFERENCES EVENTO (cod_evento)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- CONTRATACAO (N:N entre EVENTO e SERVICO)
-- ---------------------------------------------------------------------
CREATE TABLE CONTRATACAO (
  cod_evento    INT           NOT NULL,
  cod_servico   INT           NOT NULL,
  quantidade    INT           NOT NULL DEFAULT 1,
  valor_servico DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (cod_evento, cod_servico),
  CONSTRAINT fk_contrat_evento FOREIGN KEY (cod_evento) REFERENCES EVENTO (cod_evento)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_contrat_servico FOREIGN KEY (cod_servico) REFERENCES SERVICO (cod_servico)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_contrat_qtd   CHECK (quantidade > 0),
  CONSTRAINT ck_contrat_valor CHECK (valor_servico >= 0)
) ENGINE=InnoDB;

-- =====================================================================
-- ACRESCIMOS (nao estao no Projeto Logico; vieram do BPMN TO-BE)
-- =====================================================================

-- Configuracoes do sistema (ex.: valor da hora para calcular a cobranca
-- do atendimento: valor = horas de permanencia x valor_hora)
CREATE TABLE CONFIGURACAO (
  chave VARCHAR(50)   NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (chave)
) ENGINE=InnoDB;

-- Acesso ao sistema (login): CPF + senha guardada em hash (nunca a senha pura).
-- perfil: ADMIN = coordenacao, FUNCIONARIO = equipe, RESPONSAVEL = cliente que criou conta no site.
-- Apagou a PESSOA, o acesso dela vai junto (CASCADE).
CREATE TABLE ACESSO (
  cpf        CHAR(11)     NOT NULL,
  senha_hash VARCHAR(200) NOT NULL,
  perfil     VARCHAR(12)  NOT NULL,
  PRIMARY KEY (cpf),
  CONSTRAINT fk_acesso_pessoa FOREIGN KEY (cpf) REFERENCES PESSOA (cpf) ON DELETE CASCADE,
  CONSTRAINT ck_acesso_perfil CHECK (perfil IN ('ADMIN', 'FUNCIONARIO', 'RESPONSAVEL'))
) ENGINE=InnoDB;

-- Checklists pre e pos-evento
CREATE TABLE CHECKLIST_EVENTO (
  cod_checklist INT          NOT NULL AUTO_INCREMENT,
  cod_evento    INT          NOT NULL,
  tipo          ENUM('PRE','POS') NOT NULL,
  item          VARCHAR(150) NOT NULL,
  concluido     BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (cod_checklist),
  CONSTRAINT fk_checklist_evento FOREIGN KEY (cod_evento) REFERENCES EVENTO (cod_evento)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- TRIGGERS (regras que o CHECK do MySQL nao consegue fazer)
-- No Workbench o DELIMITER abaixo funciona normalmente.
-- =====================================================================
DELIMITER $$

-- Data de nascimento nao pode estar no futuro (PESSOA)
CREATE TRIGGER trg_pessoa_bi BEFORE INSERT ON PESSOA FOR EACH ROW
BEGIN
  IF NEW.data_nascimento > CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Data de nascimento nao pode ser futura.';
  END IF;
END$$

CREATE TRIGGER trg_pessoa_bu BEFORE UPDATE ON PESSOA FOR EACH ROW
BEGIN
  IF NEW.data_nascimento > CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Data de nascimento nao pode ser futura.';
  END IF;
END$$

-- Disjuncao: uma pessoa nao pode ser RESPONSAVEL e FUNCIONARIO ao mesmo tempo
CREATE TRIGGER trg_responsavel_bi BEFORE INSERT ON RESPONSAVEL FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM FUNCIONARIO WHERE cpf = NEW.cpf) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta pessoa ja e funcionario e nao pode ser responsavel.';
  END IF;
END$$

CREATE TRIGGER trg_funcionario_bi BEFORE INSERT ON FUNCIONARIO FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM RESPONSAVEL WHERE cpf = NEW.cpf) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta pessoa ja e responsavel e nao pode ser funcionario.';
  END IF;
  IF NEW.cod_supervisor IS NOT NULL AND NEW.cod_supervisor = NEW.cod_funcionario THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Funcionario nao pode supervisionar a si mesmo.';
  END IF;
END$$

CREATE TRIGGER trg_funcionario_bu BEFORE UPDATE ON FUNCIONARIO FOR EACH ROW
BEGIN
  IF NEW.cod_supervisor IS NOT NULL AND NEW.cod_supervisor = NEW.cod_funcionario THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Funcionario nao pode supervisionar a si mesmo.';
  END IF;
END$$

-- CRIANCA: numera automaticamente (1, 2, 3...) por responsavel quando
-- o num_sequencial nao e informado; e impede data de nascimento futura
CREATE TRIGGER trg_crianca_bi BEFORE INSERT ON CRIANCA FOR EACH ROW
BEGIN
  IF NEW.num_sequencial IS NULL OR NEW.num_sequencial = 0 THEN
    SET NEW.num_sequencial = (SELECT COALESCE(MAX(num_sequencial), 0) + 1
                              FROM CRIANCA WHERE cod_responsavel = NEW.cod_responsavel);
  END IF;
  IF NEW.data_nascimento > CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Data de nascimento da crianca nao pode ser futura.';
  END IF;
END$$

CREATE TRIGGER trg_crianca_bu BEFORE UPDATE ON CRIANCA FOR EACH ROW
BEGIN
  IF NEW.data_nascimento > CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Data de nascimento da crianca nao pode ser futura.';
  END IF;
END$$

-- RESPONSAVEL_ADICIONAL: o adicional deve ser outra pessoa que o principal
-- e cada crianca so pode ter 1 adicional (maximo de 2 responsaveis)
CREATE TRIGGER trg_respadic_bi BEFORE INSERT ON RESPONSAVEL_ADICIONAL FOR EACH ROW
BEGIN
  IF NEW.cod_responsavel_adicional = NEW.cod_responsavel THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O responsavel adicional deve ser diferente do principal.';
  END IF;
  IF EXISTS (SELECT 1 FROM RESPONSAVEL_ADICIONAL
             WHERE cod_responsavel = NEW.cod_responsavel
               AND num_sequencial  = NEW.num_sequencial) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A crianca ja possui 2 responsaveis (limite maximo).';
  END IF;
END$$

CREATE TRIGGER trg_respadic_bu BEFORE UPDATE ON RESPONSAVEL_ADICIONAL FOR EACH ROW
BEGIN
  IF NEW.cod_responsavel_adicional = NEW.cod_responsavel THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O responsavel adicional deve ser diferente do principal.';
  END IF;
END$$

-- ATENDIMENTO: data nao pode ser futura
CREATE TRIGGER trg_atendimento_bi BEFORE INSERT ON ATENDIMENTO FOR EACH ROW
BEGIN
  IF NEW.data > CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Data do atendimento nao pode ser futura.';
  END IF;
END$$

-- Cadastro de crianca exige ao menos 1 responsavel: ja garantido pela
-- propria chave (cod_responsavel faz parte da PK de CRIANCA).

DELIMITER ;