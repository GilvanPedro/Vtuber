// Público: GET /api/site-imagem?nome=<nome>&v=<versão> -> imagem do próprio site (logo, foto do About).
// As páginas usam a URL com "v"; ao trocar a imagem, aumente o "v" nos HTML para os navegadores buscarem a nova.
import { erro, rota } from '../lib/http.js';
import { lerImagemDoSite } from '../lib/vtubers.js';

export const GET = rota(async request => {
    const nome = new URL(request.url).searchParams.get('nome') || '';
    if (!/^[a-z0-9-]{1,40}$/.test(nome)) return erro('Nome inválido.', 400);
    const imagem = await lerImagemDoSite(nome);
    if (!imagem) return erro('Imagem não encontrada.', 404);
    return new Response(imagem.dados, {
        headers: {
            'Content-Type': imagem.mime,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff'
        }
    });
});
