-- Vtubers exibidas no site
CREATE TABLE IF NOT EXISTS vtubers (
    id            TEXT PRIMARY KEY,               -- slug usado na URL (ex.: 'toshiruz')
    nome          TEXT NOT NULL,
    cor           TEXT NOT NULL DEFAULT '#e45fd9', -- cor de destaque do perfil
    tags          JSONB NOT NULL DEFAULT '[]',
    horario       JSONB NOT NULL DEFAULT '[]',
    plataforma    JSONB NOT NULL DEFAULT '[]',
    idioma        JSONB NOT NULL DEFAULT '[]',
    bio           TEXT NOT NULL DEFAULT '',        -- parágrafos separados por linha em branco; **negrito** e ==destaque==
    redes         JSONB NOT NULL DEFAULT '{}',     -- { twitch, youtube, x, kick }
    videos        JSONB NOT NULL DEFAULT '[]',     -- [{ id: '<id do YouTube>', vertical: bool }]
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Imagens de cada vtuber: 'card' (lista/home) e 'perfil' (página da vtuber)
CREATE TABLE IF NOT EXISTS imagens (
    vtuber_id     TEXT NOT NULL REFERENCES vtubers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tipo          TEXT NOT NULL CHECK (tipo IN ('card', 'perfil')),
    mime          TEXT NOT NULL,
    dados         BYTEA NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (vtuber_id, tipo)
);
