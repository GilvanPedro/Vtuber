// Envia (ou troca) uma imagem do próprio site para o banco.
// Uso: npm run imagem-do-site -- <nome> <arquivo>     ex.: npm run imagem-do-site -- logo ./logo.png
// "logo" é salva em PNG (serve também de ícone da aba); as outras em WEBP. Depois de trocar uma imagem,
// aumente o "&v=" nas URLs /api/site-imagem?nome=<nome> dos HTML para os navegadores buscarem a nova.
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
if (existsSync('.env')) process.loadEnvFile('.env');

const [nome, arquivo] = process.argv.slice(2);
if (!nome || !arquivo || !/^[a-z0-9-]{1,40}$/.test(nome)) {
    console.error('Uso: npm run imagem-do-site -- <nome> <arquivo>   (nome: letras minúsculas, números e hífens)');
    process.exit(1);
}
if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL no .env.');
    process.exit(1);
}

const { aplicarSchema } = await import('./semear.js');
const { salvarImagemDoSite } = await import('../lib/vtubers.js');
await aplicarSchema();

const original = readFileSync(arquivo);
const imagem = sharp(original).resize(1000, 1000, { fit: 'inside', withoutEnlargement: true });
const [mime, dados] = nome === 'logo'
    ? ['image/png', await imagem.png({ compressionLevel: 9, palette: true }).toBuffer()]
    : ['image/webp', await imagem.webp({ quality: 85 }).toBuffer()];
await salvarImagemDoSite(nome, mime, dados.toString('base64'));
console.log(`"${nome}" salva no banco (${mime}, ${(original.length / 1024).toFixed(0)} KB -> ${(dados.length / 1024).toFixed(0)} KB).`);
