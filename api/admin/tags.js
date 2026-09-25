// Admin (precisa estar logado):
//   GET  /api/admin/tags          -> lista (sem cache)
//   POST /api/admin/tags { pt, en } -> cria uma tag de conteúdo; devolve a lista atualizada
import { json } from '../../lib/http.js';
import { protegida, SEM_CACHE } from '../../lib/admin.js';
import { listarTags, criarTag } from '../../lib/tags.js';

export const GET = protegida(async () => json(await listarTags(), 200, SEM_CACHE));

export const POST = protegida(async request => {
    const tag = await criarTag(await request.json().catch(() => null));
    return json({ tag, tags: await listarTags() }, 201, SEM_CACHE);
});
