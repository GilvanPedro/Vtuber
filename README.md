# Vtuber Search

**Encontre sua próxima Vtuber favorita.** O Vtuber Search é um catálogo de Vtubers independentes e menos
conhecidas, com busca, filtros, perfis completos e um painel para cadastrar tudo sem mexer no código.

🔗 **Site:** https://vtuber-search.vercel.app  ·  🔐 **Painel:** https://vtuber-search.vercel.app/admin

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Como funciona](#como-funciona)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Rodando localmente](#rodando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Publicando (Neon + Vercel)](#publicando-neon--vercel)
- [Scripts](#scripts)
- [Banco de dados](#banco-de-dados)
- [Guias rápidos](#guias-rápidos)
- [Tecnologias](#tecnologias)
- [Contribuição](#contribuição)
- [Licença](#licença)

---

## Funcionalidades

### Para quem visita

- **Catálogo** com busca pelo nome (ignora acentos) e filtros combináveis de **conteúdo, horário, plataforma e idioma**.
- **Ordenação** por mais recentes, nome (A–Z), **mais seguidores** e **menos seguidores** (Twitch + YouTube + Kick somados;
  quem não tem conta numa plataforma conta como 0 nela).
- **Paginação** de 6 linhas por página; só os cards da página atual são carregados. A busca, os filtros, a ordem e a
  página ficam na URL, então dá para compartilhar o link.
- **Perfil de cada Vtuber** com arte, bio, tags, horários, redes sociais e:
  - **seguidores na Twitch e na Kick e inscritos no YouTube**, atualizados sozinhos;
  - **horários das lives** convertidos para o fuso de quem visita;
  - **Momentos do criador**: vídeos, lives e Shorts do YouTube e clipes/vídeos da Twitch no mesmo lugar.
- **Português ou inglês** (botão PT | EN) e **fuso horário** (Brasil, EUA Leste, EUA Pacífico ou Europa), escolhidos
  no cabeçalho e salvos no navegador. Na primeira visita, o site usa o idioma e o fuso do navegador.
- **Estou com sorte**: um dado 3D cai na tela com som, quica, brilha e abre o perfil de uma Vtuber aleatória
  (no catálogo, o sorteio respeita a busca e os filtros).
- **Indicar uma Vtuber** ou **pedir remoção** por formulários.

### No painel (`/admin`)

- Login com senha; busca rápida na lista, com miniaturas.
- **Cadastrar, editar e excluir** Vtubers (a exclusão pede para digitar o identificador).
- **Imagens** de card e de perfil: o servidor gera as versões otimizadas em WEBP.
- **Bio em duas abas** (🇧🇷 Português / 🇺🇸 English).
- **Tags de conteúdo, plataformas e idiomas** cadastráveis na hora, com bloqueio de nomes repetidos (ignora acentos e
  maiúsculas).
- **Horários por fuso**: marque o período (manhã, tarde, noite, madrugada) em um fuso e os outros são convertidos
  sozinhos; qualquer fuso pode ser ajustado à mão. Também dá para cadastrar a **agenda exata** (dias e horas).
- **Redes sociais** (Twitch, YouTube, X, Kick, Instagram e um campo para cada plataforma nova marcada).
- **Momentos do criador**: cole o link e o tipo (vídeo, Shorts, clipe ou VOD) é identificado automaticamente.
- Ao salvar, o site público é atualizado na hora (o cache da CDN é limpo).

---

## Como funciona

```
 Navegador ──► páginas estáticas (HTML/CSS/JS)          ──┐
    │                                                     │  Vercel
    └──────► /api/*  (Vercel Functions, Node.js) ─────────┘
                 │         │
                 │         ├──► Twitch API / YouTube Data API / Kick  (seguidores e inscritos)
                 ▼
            Neon (PostgreSQL): vtubers, imagens, tags
```

- **O navegador nunca acessa o banco diretamente.** As senhas e chaves ficam só nas variáveis de ambiente da Vercel.
- **Cache:** as respostas públicas (`/api/vtubers`, `/api/tags`, `/api/estatisticas`) ficam na CDN da Vercel com a tag
  `dados-publicos`. O painel apaga essa tag ao salvar, então as mudanças aparecem na hora sem que cada visita precise
  acordar o banco.
- **Seguidores/inscritos** (Twitch, YouTube e Kick) são guardados no banco e atualizados:
  - ao abrir o perfil (com cache de 15 minutos);
  - ao montar a lista do catálogo (busca os que faltam ou têm mais de 20 h);
  - ao salvar a Vtuber no painel;
  - todo dia às 6h de Brasília, pelo Cron Job da Vercel.

  Se uma API falhar, o último número salvo é mantido.
- **Imagens** ficam no banco, em WEBP, em três tamanhos: `card` (lista), `mini` (painel) e `perfil`. As URLs levam a
  versão da imagem, então podem ficar em cache para sempre.

---

## Estrutura de pastas

```
/
├── index.html                  # Home (hero, "Estou com sorte", 6 recém-adicionadas)
├── html/
│   ├── vtubers.html            # Catálogo: busca, filtros, ordenação e paginação
│   ├── vtuber.html             # Perfil de qualquer Vtuber (vtuber.html?id=<id>)
│   ├── admin.html              # Painel (também em /admin)
│   ├── about.html              # Sobre o autor
│   ├── formularioentrar.html   # Indicar uma Vtuber
│   └── formulariosair.html     # Pedir remoção
├── css/style.css               # Estilo único do site (inclui responsividade)
├── js/
│   ├── i18n.js                 # Textos em PT/EN e botão PT | EN
│   ├── fusos.js                # Fusos horários e seletor do cabeçalho
│   ├── vtubers-data.js         # Filtros, acesso à API, card, conversão de horários e seguidores
│   ├── script.js               # Menu, home, "Estou com sorte" e perfil
│   ├── sons.js                 # Sons do dado (gerados com a Web Audio API)
│   ├── lista.js                # Catálogo
│   └── admin.js                # Painel
├── api/                        # Rotas (Vercel Functions)
│   ├── vtubers.js  tags.js  imagem.js  estatisticas.js     # públicas
│   ├── login.js  logout.js  sessao.js                        # sessão do painel
│   ├── admin/vtubers.js  admin/tags.js                       # painel (exigem login)
│   └── cron/estatisticas.js                                  # atualização diária (exige CRON_SECRET)
├── lib/                        # Código do servidor
│   ├── db.js                   # Conexão (Neon ou PGlite local) e transações
│   ├── vtubers.js              # Consultas e gravações de Vtubers e imagens
│   ├── validar.js              # Validação dos dados do painel e dos links de vídeo
│   ├── tags.js                 # Tags, plataformas e idiomas (sem repetição)
│   ├── estatisticas.js         # Twitch / YouTube / Kick
│   ├── imagens.js              # Conversão para WEBP (sharp)
│   ├── cache.js                # Cabeçalhos e limpeza do cache da CDN
│   ├── auth.js  admin.js  http.js
├── db/
│   ├── schema.sql              # Tabelas (pode rodar várias vezes; só adiciona o que falta)
│   └── seed.json               # 16 Vtubers iniciais
├── scripts/                    # Servidor local, seed, migração e utilitários (ver "Scripts")
├── img/                        # Logo, foto do About e imagens originais usadas no seed
├── vercel.json                 # Rota /admin, cabeçalhos e Cron Job
└── .env.example                # Modelo das variáveis de ambiente
```

---

## Rodando localmente

Requer **Node.js 20+**.

```bash
npm install
npm run dev        # http://localhost:3000  (painel em http://localhost:3000/admin)
```

- **Sem `.env`:** usa um banco temporário em memória (PGlite) já com as 16 Vtubers do seed. A senha do painel é
  `admin`, e tudo some ao parar o servidor.
- **Com o Neon:** copie `.env.example` para `.env` e preencha. Atenção: aí o painel local altera o banco de verdade.

---

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string do Neon (Dashboard → **Connect**). Cole só a URL, uma vez, sem aspas. |
| `ADMIN_PASSWORD` | ✅ | Senha do painel. |
| `SESSION_SECRET` | ✅ | Texto aleatório de 32+ caracteres que assina o login do painel. |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | opcional | Seguidores da Twitch. Crie um app em [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) (OAuth Redirect URL `http://localhost`). |
| `YOUTUBE_API_KEY` | opcional | Inscritos do YouTube. No Google Cloud, ative a **YouTube Data API v3** e crie uma **Chave de API** (não um "ID do cliente OAuth"). |
| `CRON_SECRET` | opcional | Protege a atualização diária de seguidores. Só é usada na Vercel. |

Para gerar textos aleatórios (`SESSION_SECRET`, `CRON_SECRET`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sem as chaves da Twitch ou do YouTube, o contador daquela plataforma simplesmente não aparece. A **Kick não precisa de chave**:
a API oficial dela não informa seguidores, então o site usa a rota que o próprio kick.com usa. Por não ser oficial, ela pode
mudar; se falhar, o último número salvo é mantido.

---

## Publicando (Neon + Vercel)

Tudo cabe nos planos gratuitos.

1. **Banco:** crie um projeto em [neon.tech](https://neon.tech) (só o banco; não precisa de object storage) e copie a
   connection string.
2. **Importe as Vtubers iniciais:** preencha `DATABASE_URL` no `.env` e rode `npm run seed`. Pode rodar de novo sem
   duplicar.
3. **Site:** importe o repositório em [vercel.com](https://vercel.com) (**Add New → Project**). Em *Application Preset*,
   escolha **Other**; não há build.
4. Em **Settings → Environment Variables**, cadastre as variáveis da tabela acima para **Production**.
5. Em **Settings → Functions**, escolha uma região perto do banco (ex.: `iad1` para Neon em us-east).
6. Faça **Redeploy**. Variáveis novas só valem a partir do próximo deploy.
7. **Opcional:** em **Settings → Cron Jobs**, clique em **Run** na `/api/cron/estatisticas` para preencher os
   seguidores de todas de uma vez (depois ela roda sozinha todo dia).

> **Não deixe o Neon "acordado" com pings:** o plano grátis tem cerca de 400 h/mês de banco ligado. O cache da CDN já faz
> os visitantes não esperarem o banco acordar.

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local (site + API) em `http://localhost:3000`. |
| `npm run seed` | Cria as tabelas e importa as Vtubers de `db/seed.json`, com as imagens de `img/`. |
| `npm run migrar` | Aplica o `db/schema.sql` no banco (só adiciona tabelas/colunas que faltam; não apaga dados). |
| `npm run otimizar-imagens` | Converte as imagens já salvas para WEBP e gera as miniaturas do painel. |
| `npm run atualizar-estatisticas` | Atualiza agora os seguidores/inscritos de todas as Vtubers no banco. |
| `npm run testar-estatisticas -- <links>` | Testa o acesso à Twitch, ao YouTube e à Kick com links reais. |

---

## Banco de dados

Definido em `db/schema.sql`. Sempre que ele mudar, rode `npm run migrar`.

| Tabela | Conteúdo |
|---|---|
| `vtubers` | Nome, cor, bio (PT/EN), tags, plataformas, idiomas, horários (por fuso) e agenda, redes, momentos do criador, seguidores (Twitch/Kick) e inscritos (YouTube). |
| `imagens` | Imagens em WEBP (`card`, `mini`, `perfil`) de cada Vtuber. |
| `tags` | Opções cadastráveis pelo painel, por grupo: `tags` (conteúdo), `plataforma` e `idioma`, com nomes em PT e EN. |

---

## Guias rápidos

**Formatação da bio:** separe parágrafos com uma linha em branco, use `**texto**` para **negrito** e `==texto==` para
destacar na cor da Vtuber.

**Links aceitos em "Momentos do criador":** `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/shorts/…`,
`youtube.com/live/…`, `clips.twitch.tv/…`, `twitch.tv/<canal>/clip/…` e `twitch.tv/videos/…`.

**Links do YouTube para os inscritos:** prefira o formato com **@** (`youtube.com/@canal`). Links antigos (`/c/nome`) são
tentados como `@nome`; se o canal mudou de @, atualize o link no painel.

**Mudar ou adicionar um texto do site:** edite as duas versões (`pt` e `en`) em `js/i18n.js` e use `data-i18n="chave"`
no HTML ou `t('chave')` no JavaScript.

**Adicionar um fuso horário:** inclua o fuso (ex.: `Asia/Tokyo`) em `FUSOS` nos arquivos `js/fusos.js` e `lib/validar.js`.

---

## Tecnologias

- **HTML, CSS e JavaScript** puros no front-end (sem framework), com [Boxicons](https://boxicons.com)
- **Vercel Functions (Node.js)** para a API, com CDN, cache por tags e Cron Jobs
- **Neon (PostgreSQL)** como banco de dados, pelo driver `@neondatabase/serverless`
- **sharp** para converter as imagens para WEBP
- **Twitch Helix API**, **YouTube Data API v3** e a rota pública do kick.com para seguidores e inscritos
- **PGlite** (Postgres em memória) para desenvolvimento local
- **Web Audio API** para os sons do dado

---

## Contribuição

Sugestões, correções e melhorias são bem-vindas!

1. Faça um fork do projeto.
2. Crie uma branch: `git checkout -b minha-feature`
3. Faça commit das mudanças: `git commit -m "Adiciona minha feature"`
4. Envie: `git push origin minha-feature`
5. Abra um Pull Request.

Para indicar uma Vtuber ou pedir a remoção de um perfil, use os formulários do próprio site.

---

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).

---

Feito com 💜 por [GilvanPedro](https://github.com/GilvanPedro)
