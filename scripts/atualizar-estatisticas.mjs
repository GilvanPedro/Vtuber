// Atualiza agora os seguidores/inscritos de todas as vtubers no banco (o mesmo que a tarefa diária faz).
// Uso: npm run atualizar-estatisticas   (usa DATABASE_URL e as chaves da Twitch/YouTube do .env)
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL no .env.');
    process.exit(1);
}
const { vtubersComRedes } = await import('../lib/vtubers.js');
const { atualizarEstatisticas } = await import('../lib/estatisticas.js');

const fmt = v => (v == null ? '—' : v.toLocaleString('pt-BR'));
for (const vt of await vtubersComRedes()) {
    const r = await atualizarEstatisticas(vt.id, vt.redes);
    const aviso = Object.entries(r.falhas).filter(([p, f]) => f && vt.redes[p]).map(([p]) => `falhou ${p}`).join(', ');
    console.log(`${vt.id.padEnd(22)} Twitch ${fmt(r.twitch).padStart(10)}   YouTube ${fmt(r.youtube).padStart(12)}   Kick ${fmt(r.kick).padStart(10)}   ${aviso}`);
}
