// Público: GET /api/imagem?id=<id>&tipo=card|mini|perfil&v=<versão>
// A URL muda a cada nova imagem (parâmetro v), então pode ficar em cache "para sempre".
import { erro, rota } from '../lib/http.js';
import { lerImagem } from '../lib/vtubers.js';

export const GET = rota(async request => {
    const params = new URL(request.url).searchParams;
    const tipo = params.get('tipo');
    if (!['card', 'mini', 'perfil'].includes(tipo)) return erro('Tipo inválido.', 400);

    const imagem = await lerImagem(params.get('id') || '', tipo);
    if (!imagem) return erro('Imagem não encontrada.', 404);

    return new Response(imagem.dados, {
        headers: {
            'Content-Type': imagem.mime,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff'
        }
    });
});
