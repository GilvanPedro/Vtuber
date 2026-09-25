-- Vtubers exibidas no site
CREATE TABLE IF NOT EXISTS vtubers (
    id            TEXT PRIMARY KEY,               -- slug usado na URL (ex.: 'toshiruz')
    nome          TEXT NOT NULL,
    cor           TEXT NOT NULL DEFAULT '#e45fd9', -- cor de destaque do perfil
    tags          JSONB NOT NULL DEFAULT '[]',
    horario       JSONB NOT NULL DEFAULT '[]',
    plataforma    JSONB NOT NULL DEFAULT '[]',
    idioma        JSONB NOT NULL DEFAULT '[]',
    bio           TEXT NOT NULL DEFAULT '',        -- em português; parágrafos separados por linha em branco; **negrito** e ==destaque==
    bio_en        TEXT NOT NULL DEFAULT '',        -- mesma bio em inglês (vazia = site mostra a versão em português)
    redes         JSONB NOT NULL DEFAULT '{}',     -- { twitch, youtube, x, kick }
    videos        JSONB NOT NULL DEFAULT '[]',     -- [{ id: '<id do YouTube>', vertical: bool }]
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Imagens de cada vtuber (WEBP): 'card' (lista/home), 'mini' (lista do admin) e 'perfil' (página da vtuber)
CREATE TABLE IF NOT EXISTS imagens (
    vtuber_id     TEXT NOT NULL REFERENCES vtubers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tipo          TEXT NOT NULL,
    mime          TEXT NOT NULL,
    dados         BYTEA NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (vtuber_id, tipo)
);

-- Tipos de imagem aceitos (recriada para bancos criados antes do tipo 'mini')
ALTER TABLE imagens DROP CONSTRAINT IF EXISTS imagens_tipo_check;
ALTER TABLE imagens ADD CONSTRAINT imagens_tipo_check CHECK (tipo IN ('card', 'mini', 'perfil'));

-- Bio em inglês (adicionada depois; não altera dados existentes)
ALTER TABLE vtubers ADD COLUMN IF NOT EXISTS bio_en TEXT NOT NULL DEFAULT '';

-- Tags de conteúdo (cadastráveis pelo painel). O id é gerado a partir do nome em português.
CREATE TABLE IF NOT EXISTS tags (
    id        TEXT PRIMARY KEY,
    nome_pt   TEXT NOT NULL,
    nome_en   TEXT NOT NULL,
    ordem     INT GENERATED ALWAYS AS IDENTITY,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Segurança extra contra nomes repetidos (a validação completa, sem acentos, fica em lib/tags.js)
CREATE UNIQUE INDEX IF NOT EXISTS tags_nome_pt_unico ON tags (lower(nome_pt));
CREATE UNIQUE INDEX IF NOT EXISTS tags_nome_en_unico ON tags (lower(nome_en));

-- Tags iniciais
INSERT INTO tags (id, nome_pt, nome_en) VALUES
    ('just-chatting', 'Just Chatting', 'Just Chatting'),
    ('gameplay', 'Gameplay', 'Gameplay'),
    ('react', 'React', 'React'),
    ('asmr', 'ASMR', 'ASMR'),
    ('musica', 'Música', 'Music'),
    ('arte', 'Arte', 'Art')
ON CONFLICT (id) DO NOTHING;
