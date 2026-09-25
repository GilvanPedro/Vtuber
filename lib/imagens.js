// Gera as versões otimizadas (WEBP) de cada imagem enviada.
//   card   -> usada na lista e na home (cards de ~250px, com folga para telas retina)
//   mini   -> miniatura quadrada da lista do painel admin
//   perfil -> imagem grande da página da vtuber
import sharp from 'sharp';

const VARIANTES = {
    card: [
        { tipo: 'card', largura: 600, altura: 600, fit: 'inside', qualidade: 82 },
        { tipo: 'mini', largura: 128, altura: 128, fit: 'cover', qualidade: 75 }
    ],
    perfil: [
        { tipo: 'perfil', largura: 1000, altura: 1250, fit: 'inside', qualidade: 82 }
    ]
};

// Recebe { base64 } da imagem original e devolve [{ tipo, mime, base64 }, ...]
export async function gerarVariantes(origem, imagem) {
    const entrada = Buffer.from(imagem.base64, 'base64');
    return Promise.all(VARIANTES[origem].map(async v => {
        const dados = await sharp(entrada, { animated: false })
            .rotate()
            .resize(v.largura, v.altura, { fit: v.fit, position: 'top', withoutEnlargement: true })
            .webp({ quality: v.qualidade, effort: 4 })
            .toBuffer();
        return { tipo: v.tipo, mime: 'image/webp', base64: dados.toString('base64') };
    }));
}
