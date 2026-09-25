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
    redes         JSONB NOT NULL DEFAULT '{}',     -- { twitch, youtube, x, kick, instagram }
    videos        JSONB NOT NULL DEFAULT '[]',     -- momentos do criador: [{ tipo: youtube|twitch-clip|twitch-video, id, vertical }]
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

-- Agenda de lives: [{ dias: [0-6, 0 = domingo], inicio: 'HH:MM', fim: 'HH:MM' | null }]
-- com os horários no fuso da própria vtuber (coluna fuso); o site converte para o fuso de quem visita.
ALTER TABLE vtubers ADD COLUMN IF NOT EXISTS agenda JSONB NOT NULL DEFAULT '[]';
ALTER TABLE vtubers ADD COLUMN IF NOT EXISTS fuso TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Opções cadastráveis pelo painel, separadas por grupo:
--   'tags' (conteúdo), 'plataforma' e 'idioma'. O id é gerado a partir do nome em português.
CREATE TABLE IF NOT EXISTS tags (
    grupo     TEXT NOT NULL DEFAULT 'tags',
    id        TEXT NOT NULL,
    nome_pt   TEXT NOT NULL,
    nome_en   TEXT NOT NULL,
    ordem     INT GENERATED ALWAYS AS IDENTITY,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (grupo, id)
);

-- Bancos criados antes dos grupos: adiciona a coluna e troca a chave/índices para valer por grupo
ALTER TABLE tags ADD COLUMN IF NOT EXISTS grupo TEXT NOT NULL DEFAULT 'tags';
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_pkey;
ALTER TABLE tags ADD PRIMARY KEY (grupo, id);
DROP INDEX IF EXISTS tags_nome_pt_unico;
DROP INDEX IF EXISTS tags_nome_en_unico;
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_grupo_check;
ALTER TABLE tags ADD CONSTRAINT tags_grupo_check CHECK (grupo IN ('tags', 'plataforma', 'idioma'));

-- Segurança extra contra nomes repetidos no mesmo grupo (a validação completa, sem acentos, fica em lib/tags.js)
CREATE UNIQUE INDEX IF NOT EXISTS tags_grupo_nome_pt_unico ON tags (grupo, lower(nome_pt));
CREATE UNIQUE INDEX IF NOT EXISTS tags_grupo_nome_en_unico ON tags (grupo, lower(nome_en));

-- Opções iniciais
INSERT INTO tags (grupo, id, nome_pt, nome_en) VALUES
    ('tags', 'just-chatting', 'Just Chatting', 'Just Chatting'),
    ('tags', 'gameplay', 'Gameplay', 'Gameplay'),
    ('tags', 'react', 'React', 'React'),
    ('tags', 'asmr', 'ASMR', 'ASMR'),
    ('tags', 'musica', 'Música', 'Music'),
    ('tags', 'arte', 'Arte', 'Art'),
    ('plataforma', 'twitch', 'Twitch', 'Twitch'),
    ('plataforma', 'youtube', 'YouTube', 'YouTube'),
    ('plataforma', 'kick', 'Kick', 'Kick'),
    ('idioma', 'portugues', 'Português', 'Portuguese'),
    ('idioma', 'ingles', 'Inglês', 'English')
ON CONFLICT (grupo, id) DO NOTHING;
