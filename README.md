# Vtuber

Bem-vindo ao repositório **Vtuber**!  
Este projeto é uma coleção de páginas web dedicadas a diferentes VTubers, com informações, imagens e estilos personalizados para cada personagem.

## Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Rodando localmente](#rodando-localmente)
- [Publicando na internet](#publicando-na-internet-neon--vercel-grátis)
- [Idiomas](#idiomas-pt--en)
- [Painel admin](#painel-admin)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Contribuição](#contribuição)
- [Licença](#licença)

---

## Sobre o Projeto

Este projeto foi criado para apresentar perfis de VTubers em páginas HTML individuais e estilizadas. Cada arquivo HTML representa um personagem, com informações, imagens e visual customizado.

## Estrutura de Pastas

```
/
├── index.html                  # Página inicial
├── README.md
├── LICENSE
├── html/
│   ├── vtubers.html            # Lista com busca, filtros e paginação
│   ├── vtuber.html             # Perfil de qualquer VTuber (vtuber.html?id=<id>)
│   ├── admin.html              # Painel para cadastrar/editar/excluir (acessível em /admin)
│   ├── about.html              # Sobre o autor
│   ├── formularioentrar.html   # Formulário para indicar uma VTuber
│   └── formulariosair.html     # Formulário para solicitar remoção
├── css/style.css               # Estilo único do site (inclui responsividade)
├── js/
│   ├── vtubers-data.js         # Filtros, acesso à API e card de VTuber
│   ├── lista.js                # Busca, filtros e paginação da lista
│   ├── script.js               # Menu mobile, home e página de perfil
│   ├── admin.js                # Painel admin
│   └── i18n.js                 # Textos do site em português e inglês + seletor PT | EN
├── api/                        # Funções serverless (Vercel) que falam com o banco
├── lib/                        # Código compartilhado da API (banco, login, validação)
├── db/
│   ├── schema.sql              # Tabelas do banco
│   └── seed.json               # VTubers iniciais (importadas com `npm run seed`)
├── scripts/                    # Servidor local (`npm run dev`) e seed
└── img/                        # Logo, foto do About e imagens originais usadas no seed
```

Os dados e imagens das VTubers ficam num banco **Neon (Postgres)**. O navegador nunca acessa o banco
diretamente: ele chama as rotas em `/api`, que rodam na Vercel e guardam a conexão em segredo.

## Rodando localmente

Requer Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000  (painel em http://localhost:3000/admin)
```

Sem `DATABASE_URL`, o `npm run dev` usa um banco temporário em memória já com as VTubers do seed
(a senha do painel é `admin`). Para usar o Neon de verdade, copie `.env.example` para `.env` e preencha.

## Publicando na internet (Neon + Vercel, grátis)

1. **Banco:** crie uma conta em [neon.tech](https://neon.tech), crie um projeto e copie a *connection string*
   (Dashboard → **Connect**).
2. **Importar as VTubers atuais:** crie o arquivo `.env` (a partir do `.env.example`) com `DATABASE_URL` e rode:
   ```bash
   npm run seed
   ```
   Isso cria as tabelas e envia as 16 VTubers com bio, redes, vídeos e imagens. Pode rodar de novo sem duplicar.
3. **Site:** suba o código para o GitHub, crie uma conta em [vercel.com](https://vercel.com) e importe o repositório
   (**Add New → Project**). Não precisa configurar build.
4. Em **Settings → Environment Variables** do projeto na Vercel, adicione:
   - `DATABASE_URL` — a mesma do passo 1
   - `ADMIN_PASSWORD` — a senha do painel (use uma senha forte)
   - `SESSION_SECRET` — texto aleatório de 32+ caracteres
     (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
5. Faça um novo deploy (**Deployments → Redeploy**). O site fica em `https://<projeto>.vercel.app`
   e o painel em `https://<projeto>.vercel.app/admin`.

## Idiomas (PT / EN)

O visitante escolhe o idioma no botão **PT | EN** do cabeçalho (a escolha fica salva no navegador; na
primeira visita vale o idioma do navegador). Os textos fixos ficam em `js/i18n.js`: para mudar ou adicionar
um texto, edite as duas versões (`pt` e `en`) e use `data-i18n="chave"` no HTML ou `t('chave')` no JS.
A bio de cada VTuber é cadastrada nos dois idiomas no painel; sem a versão em inglês, o site mostra a em
português com um aviso.

## Atualizando o banco

Quando o `db/schema.sql` ganhar tabelas ou colunas novas, rode `npm run migrar` (só adiciona, não apaga dados).

## Painel admin

Em `/admin`, depois de entrar com a senha, você pode:

- **Buscar** VTubers por nome ou identificador;
- **Cadastrar** uma nova (nome, cor, categorias, bio, redes, vídeos do YouTube e imagens de card e perfil);
- **Editar** qualquer campo, inclusive trocar imagens e reordenar vídeos;
- **Excluir**, confirmando ao digitar o identificador da VTuber.

O servidor converte cada imagem enviada para WEBP em três tamanhos: card (lista), miniatura (lista do painel) e perfil.
Se houver imagens antigas no banco em outro formato, rode `npm run otimizar-imagens` para convertê-las. Na bio, separe
parágrafos com uma linha em branco, use `**texto**` para negrito e `==texto==` para destacar na cor da VTuber.
Alterações aparecem no site em até 1 minuto (cache da CDN).

## Tecnologias Utilizadas

- **HTML5, CSS3 e JavaScript** — Front-end, sem framework
- **Vercel Functions (Node.js)** — API em `/api`
- **Neon (PostgreSQL)** — Banco com dados e imagens das VTubers
- **PGlite** — Postgres em memória para desenvolvimento local

## Contribuição

Sinta-se à vontade para contribuir!  
Sugestões, correções, novas páginas de VTubers ou melhorias de design são bem-vindas.

1. Faça um fork do projeto.
2. Crie uma branch para sua feature/correção:  
   `git checkout -b minha-feature`
3. Commit suas mudanças:  
   `git commit -m 'Adiciona nova feature'`
4. Faça push para sua branch:  
   `git push origin minha-feature`
5. Abra um Pull Request.

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

Feito com 💜 por [GilvanPedro](https://github.com/GilvanPedro)
