/*
 * Sons do "Estou com sorte", gerados na hora com a Web Audio API (sem arquivos de áudio).
 *   rolarDado(): estalos do dado girando + batida no chão + quique (sincronizado com a animação do CSS)
 *   sorte():     acorde brilhante quando o nome da vtuber sorteada aparece
 * O AudioContext só é criado dentro do clique, então o navegador deixa tocar sem pedir permissão.
 */
const SonsDoDado = (() => {
    let contexto = null;
    let ruido = null;

    function obterContexto() {
        if (!contexto) {
            const Contexto = window.AudioContext || window.webkitAudioContext;
            if (!Contexto) return null;
            contexto = new Contexto();
        }
        if (contexto.state === 'suspended') contexto.resume();
        return contexto;
    }

    // Ruído branco curto, reaproveitado por todos os estalos
    function bufferDeRuido(ctx) {
        if (ruido?.sampleRate === ctx.sampleRate) return ruido;
        ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
        const dados = ruido.getChannelData(0);
        for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
        return ruido;
    }

    // Estalo seco (dado de plástico batendo): ruído filtrado com decaimento rápido
    function estalo(ctx, saida, quando, volume = 0.5) {
        const fonte = ctx.createBufferSource();
        fonte.buffer = bufferDeRuido(ctx);
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.frequency.value = 1800 + Math.random() * 2600;
        filtro.Q.value = 6;
        const ganho = ctx.createGain();
        ganho.gain.setValueAtTime(0.0001, quando);
        ganho.gain.exponentialRampToValueAtTime(volume, quando + 0.002);
        ganho.gain.exponentialRampToValueAtTime(0.0001, quando + 0.035 + Math.random() * 0.02);
        fonte.connect(filtro).connect(ganho).connect(saida);
        fonte.start(quando, Math.random() * 0.15, 0.08);
    }

    // Batida no chão: tom grave caindo + um estalo mais forte por cima
    function batida(ctx, saida, quando, volume = 1) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(170, quando);
        osc.frequency.exponentialRampToValueAtTime(55, quando + 0.14);
        const ganho = ctx.createGain();
        ganho.gain.setValueAtTime(0.0001, quando);
        ganho.gain.exponentialRampToValueAtTime(0.9 * volume, quando + 0.004);
        ganho.gain.exponentialRampToValueAtTime(0.0001, quando + 0.18);
        osc.connect(ganho).connect(saida);
        osc.start(quando);
        osc.stop(quando + 0.2);
        estalo(ctx, saida, quando, 0.8 * volume);
        estalo(ctx, saida, quando + 0.012, 0.5 * volume);
    }

    // Tempos em segundos, iguais às porcentagens das animações em style.css (duração 1,15s):
    // queda até 52% (0,6s), quique até 86% (0,99s).
    function agendarRolagem(ctx, saida, inicio) {
        // Dado girando no ar: estalos cada vez mais próximos até bater no chão
        for (let t = 0.05; t < 0.56; t += 0.045 + Math.random() * 0.05) {
            estalo(ctx, saida, inicio + t, 0.9 + (t / 0.56) * 0.9);
        }
        batida(ctx, saida, inicio + 0.598, 1);
        // Quicando: alguns estalos soltos
        for (const t of [0.66, 0.73, 0.82, 0.9]) estalo(ctx, saida, inicio + t + Math.random() * 0.02, 0.9);
        batida(ctx, saida, inicio + 0.989, 0.55);
        estalo(ctx, saida, inicio + 1.06, 0.6);
    }

    // Nota de sininho: seno + harmônico, ataque rápido e cauda longa
    function sino(ctx, saida, frequencia, quando, volume, duracao = 1.1) {
        for (const [multiplicador, peso, tipo] of [[1, 1, 'sine'], [2, 0.35, 'triangle'], [3.01, 0.12, 'sine']]) {
            const osc = ctx.createOscillator();
            osc.type = tipo;
            osc.frequency.value = frequencia * multiplicador;
            const ganho = ctx.createGain();
            ganho.gain.setValueAtTime(0.0001, quando);
            ganho.gain.exponentialRampToValueAtTime(volume * peso, quando + 0.006);
            ganho.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
            osc.connect(ganho).connect(saida);
            osc.start(quando);
            osc.stop(quando + duracao + 0.05);
        }
    }

    function agendarSorte(ctx, saida, inicio) {
        // Dó maior subindo (C6 E6 G6 C7) + acorde final sustentado
        [1046.5, 1318.5, 1568, 2093].forEach((f, i) => sino(ctx, saida, f, inicio + i * 0.07, 0.28));
        [1046.5, 1318.5, 1568].forEach(f => sino(ctx, saida, f, inicio + 0.3, 0.12, 1.4));
        // Brilhos agudos aleatórios
        for (let i = 0; i < 6; i++) sino(ctx, saida, 3000 + Math.random() * 2500, inicio + 0.12 + i * 0.06, 0.05, 0.25);
    }

    // Saída com volume geral e um compressor leve para não estourar
    function saidaPrincipal(ctx) {
        const volume = ctx.createGain();
        volume.gain.value = 0.35;
        const compressor = ctx.createDynamicsCompressor();
        volume.connect(compressor).connect(ctx.destination);
        return volume;
    }

    return {
        rolarDado() {
            const ctx = obterContexto();
            if (ctx) agendarRolagem(ctx, saidaPrincipal(ctx), ctx.currentTime + 0.02);
        },
        sorte() {
            const ctx = obterContexto();
            if (ctx) agendarSorte(ctx, saidaPrincipal(ctx), ctx.currentTime + 0.01);
        },
        // Para testes: renderiza a sequência completa num contexto offline
        agendarTudo(ctx, inicioSorte) {
            const saida = saidaPrincipal(ctx);
            agendarRolagem(ctx, saida, 0.02);
            agendarSorte(ctx, saida, inicioSorte);
        }
    };
})();
