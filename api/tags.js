// Público: GET /api/tags -> [{ grupo, id, pt, en }] (mesmo cache da lista de vtubers)
import { json, rota } from '../lib/http.js';
import { listarTags } from '../lib/tags.js';
import { CACHE_PUBLICO as CACHE } from '../lib/cache.js';

export const GET = rota(async () => json(await listarTags(), 200, CACHE));
