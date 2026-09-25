// Cache das respostas públicas na CDN da Vercel.
// As respostas levam a tag "dados-publicos"; o painel apaga essa tag sempre que muda algo,
// então a próxima visita já busca os dados novos (sem esperar o cache vencer).
import { dangerouslyDeleteByTag } from '@vercel/functions';

const TAG_DADOS = 'dados-publicos';

// Como o painel limpa o cache ao salvar, a resposta pode ficar guardada por bastante tempo:
// menos visitas precisam acordar o Neon.
export const CACHE_PUBLICO = {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    'Vercel-Cache-Tag': TAG_DADOS
};

export async function limparCachePublico() {
    try {
        await dangerouslyDeleteByTag(TAG_DADOS);
    } catch (e) {
        // Não impede o salvamento; no pior caso a mudança aparece quando o cache vencer.
        console.error('Não foi possível limpar o cache da CDN:', e);
    }
}
