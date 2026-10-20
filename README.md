# Davi e Golias

Reconstrução jogável (web, 3D) do jogo mobile **"Jogo Cristão - Davi e Golias"**, feita por
engenharia reversa do vídeo de gameplay <https://youtu.be/G35ON6CDmLE>.

A análise completa (linha do tempo do vídeo, HUD, telas, mecânicas e fases) está em
[`docs/ANALISE.md`](docs/ANALISE.md). Toda a arte é original e procedural (Three.js);
nenhum asset do jogo original foi usado.

## Como jogar

Sirva a pasta por HTTP (módulos ES não carregam via `file://`):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Também funciona direto no GitHub Pages (sem build, sem dependências — o Three.js está em `vendor/`).

| Ação | Teclado / mouse | Toque |
|---|---|---|
| Andar | A/D ou ◀ ▶ | botões de pedra ◀ ▶ |
| Mirar e atirar | clique no alvo | toque no alvo |
| Atirar no alvo mais próximo | Espaço | botão ATIRAR |
| Trocar pedra | 1 / 2 / 3 | botões de pedra à direita |
| Pausa | Esc / P | ❚❚ |

## O que foi reconstruído

- Mapa com 6 fases: A funda (tutorial), O urso, O leão, Combate, Escudeiros, Golias
- Intro de fase com escudo "Nível N" e placa (TUTORIAL / COMBATE)
- HUD: vida, pontos, moedas, progresso da onda, tempo, loja e pausa
- Pedra comum, de ferro e de fogo (a de fogo atravessa o escudo do Golias)
- Loja: pacotes de pedras e melhorias da funda (força, recarga) e de vida
- Aviso "Compre mais pedras!" quando a munição acaba
- Proteger as ovelhas do urso e do leão
- Soldados filisteus que avançam e lançam lanças; escudeiros com escudo que quebra
- Chefe Golias com fases (andar / erguer escudo / lançar), tiro na testa causa dano dobrado, câmera lenta no golpe final
- Fim de fase: Parabéns → Pontuação → Escolha seu prêmio (6 cartas)
- Derrota: "Não desista!" com quiz bíblico para continuar
- Progresso salvo no navegador

## Estrutura

```
index.html      telas e HUD
style.css       visual (madeira, fitas, escudo)
src/main.js     loop, estados, física das pedras, IA dos inimigos, câmera, UI
src/models.js   personagens low-poly (Davi, ovelha, urso, leão, soldado, Golias)
src/world.js    cenários (pasto, deserto, vale de Elá)
src/data.js     fases, loja, pedras, perguntas, prêmios
src/audio.js    efeitos sonoros sintetizados (WebAudio)
src/save.js     salvar/carregar progresso
docs/ANALISE.md engenharia reversa do vídeo
```
