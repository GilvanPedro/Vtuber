// Público: GET /api/tags -> [{ id, pt, en }] (mesmo cache da lista de vtubers)
import { json, rota } from '../lib/http.js';
import { listarTags } from '../lib/tags.js';

const CACHE = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=604800' };

export const GET = rota(async () => json(await listarTags(), 200, CACHE));
