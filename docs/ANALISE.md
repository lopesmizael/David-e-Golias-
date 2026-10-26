# Engenharia reversa — "Jogo Cristão - Davi e Golias"

Fonte: vídeo de gameplay <https://youtu.be/G35ON6CDmLE> (13min07s, canal enderman3000).

## Como a análise foi feita

O YouTube bloqueou o download do vídeo no ambiente de nuvem (verificação anti-bot),
mas os **storyboards** (miniaturas que o player usa na barra de progresso) estavam
acessíveis. Foram extraídos 160 quadros de 160×90 px — um a cada ~4,9 s — cobrindo
o vídeo inteiro, além da miniatura em 1280×720. Toda a análise abaixo vem desses
quadros. As imagens do jogo original **não** estão no repositório (direitos autorais);
toda a arte da reconstrução é original, feita com geometria procedural.

> O REA (morluto/rea) analisa *binários* (APK/EXE/Electron/.NET). Ele não lê vídeo.
> Se você tiver o APK original, dá para rodar o REA nele para confirmar os números
> (vida, dano, preços) — este documento marca com **(estimado)** o que foi inferido
> só pelo vídeo.

## Identificação

| Item | Observação |
|---|---|
| Plataforma | Mobile (Android), paisagem 16:9, controles por toque |
| Engine | 3D em tempo real, estilo low-poly/cartoon — muito provavelmente Unity |
| Idioma | Português (BR) |
| Câmera | Terceira pessoa, atrás e acima do Davi, fixa no eixo da arena |

## Linha do tempo do vídeo (aprox.)

| Tempo | Tela |
|---|---|
| 0:00 | Placa "TUTORIAL" no pasto (árvores, ovelhas) |
| 0:05–1:30 | Tutorial 1: atirar com a funda; aviso "COMPRE MAIS PEDRAS!" quando a munição acaba |
| ~0:50 | **Loja**: melhorar a funda / comprar pedras; dica "Melhore sempre a funda ou compre pedras" |
| ~0:55 | **Mapa**: trilha com 6 fases (ícones dourados) |
| ~1:50 | "Parabéns" → **Pontuação** "Você fez: 1273 pontos!" → **Escolha seu prêmio** (grade 3×2 de cartas viradas) |
| ~2:20 | Tutorial 2: tela de história "proteger as ovelhas do urso"; urso aparece e é derrubado |
| ~3:00 | Pontuação 1488 → prêmio → Mapa "CARREGANDO..." |
| ~3:10 | **Nível 2 — COMBATE**: deserto com mesas de pedra, tendas, exército filisteu atrás de uma cerca |
| 3:10–8:00 | Ondas de soldados saem da fileira e avançam; explosões de pó ao acertar |
| ~6:40 | Tela de baú/tesouro com o Davi |
| ~7:50 | Game over: **"Não desista"** — oferta para continuar (quiz de perguntas / vidas extras) |
| ~8:10 | "Parabéns" (arte do Davi com a funda) → Mapa |
| ~8:20 | **Pausa** (menu de madeira) e nova fase de combate, cenário de tarde/noite |
| 9:30–12:00 | **Golias** com escudo dourado; dica "MUDE PARA PEDRA DE FOGO!" |
| ~12:10 | Câmera lenta seguindo a pedra até o Golias (kill cam) |
| ~12:15 | **"Vitória"** — Golias caído; prêmio; Mapa |

## Loop de jogo

```
Mapa → (história/intro) → Escudo "Nível N" + placa "COMBATE" → Jogo
  → vitória: Parabéns → Pontuação → Escolha seu prêmio → Mapa
  → derrota: Não desista (quiz → continua) ou volta ao Mapa
Loja e Pausa acessíveis a partir do HUD.
```

## HUD (quadro de jogo)

- **Topo, esquerda → direita:** retrato do Davi + barra de vida vermelha; painel verde
  (pontos); painel amarelo (moedas); barra vermelho/azul (progresso da onda/inimigos
  restantes **(estimado)**); painel escuro (tempo **(estimado)**).
- **Topo, direita:** botões redondos (pausa, loja).
- **Baixo, esquerda:** duas pedras-botão com setas — mover para esquerda/direita.
- **Baixo, direita:** botão grande da funda (atirar) + botões menores de tipo de pedra;
  contador "x5" de munição.
- Faixa de mensagem central-baixa: "COMPRE MAIS PEDRAS!", "VOCÊ DERRUBOU O URSO",
  "MUDE PARA PEDRA DE FOGO!".

## Mecânicas inferidas

- Davi só se move **lateralmente**; inimigos vêm do fundo da arena em direção a ele.
- O tiro é um projétil com arco (pedra), com nuvem de poeira no impacto.
- Munição finita, comprada na loja com moedas ganhas nas fases.
- Tipos de pedra: comum, **ferro** (mais dano) e **fogo** (atravessa o escudo do Golias,
  efeito de partículas laranja).
- Melhorias da funda (força/recarga). Preços vistos na loja: $100, $200, $100.
- Soldados atacam à distância (lanças) e corpo a corpo ao chegar perto.
- Chefe: Golias com escudo — pedras comuns não causam dano no escudo.
- Prêmio pós-fase: escolher 1 de 6 cartas.
- Continue após derrota respondendo a uma pergunta bíblica.

## Fases (mapa com 6 nós)

| # | Nome | Cenário | Objetivo |
|---|---|---|---|
| 1 | Tutorial — A funda | Pasto | Acertar alvos (jarros) |
| 2 | Tutorial — O urso | Pasto | Proteger as ovelhas do urso |
| 3 | O leão | Pasto (fim de tarde) | Proteger as ovelhas do leão (1 Sm 17:34-36) |
| 4 | Combate | Deserto | Derrotar a onda de soldados filisteus |
| 5 | Combate — escudeiros | Deserto (tarde) | Soldados com escudo |
| 6 | Golias | Vale de Elá | Derrotar o gigante (pedra de fogo no escudo) |

As fases 3 e 5 não aparecem claramente no vídeo; foram completadas para fechar os 6 nós
do mapa.

## Segunda análise (quadro a quadro, ampliada)

Os 160 quadros do storyboard foram recortados e ampliados um a um para ler textos e
números. Novos achados e o que foi implementado a partir deles:

### HUD — significado de cada painel

| Painel (esq. → dir.) | Leitura no vídeo | Na reconstrução |
|---|---|---|
| Retrato + barra | Vida do Davi (vermelha cheia no início, quase preta perto do game over) | Barra de vida |
| Verde | Pontos da fase | ★ pontos |
| Amarelo com moeda | Moedas | ● moedas |
| **Coração vermelho + barra** | **Vidas extras** (o "Não desista" oferece "duas vidas extras") | ❤ vidas — novo |
| **Troféu** | **Recorde** | 🏆 recorde da fase — novo |
| Baixo-direita "x5" | Munição restante | Contador por tipo de pedra |

### Textos lidos

- Tutorial 1: o aviso "COMPRE MAIS PEDRAS!" aparece **várias vezes seguidas**, até o
  jogador abrir a loja → o tutorial começa com **poucas pedras (x5)** de propósito,
  para ensinar a loja.
- Loja: "Melhore sempre a funda ou compre pedras".
- História entre tutoriais: "No próximo tutorial você deverá proteger as ovelhas do urso."
- Combate: "VOCÊ QUEBROU O ESCUDO!" (soldados com escudo redondo já no Nível 2).
- Golias: texto flutuante sobre ele ao ser atingido, e "MUDE PARA PEDRA DE FOGO!".
- Game over: **"Não desista — Responda o quiz de perguntas e continue com duas vidas extras."**
- Tela com Davi agachado junto a um riacho, um baú e várias pedras no chão (entre fases) →
  referência às cinco pedras lisas (1 Sm 17:40).
- Pausa com dois botões; mapa com "CARREGANDO..." ao entrar numa fase.

### Implementado nesta rodada

- **Vidas extras** separadas da barra de vida (Fácil 2, Normal 1, Difícil 0). Ao zerar a
  vida, gasta uma vida e continua na hora.
- **Quiz do "Não desista"** com 3 perguntas sorteadas (banco de 18, alternativas
  embaralhadas); acertando 2, Davi volta com vida cheia **e +2 vidas**, como no vídeo.
- **Tutorial ensina a loja**: começa com x5 pedras e 7 jarros; sem pedras, o aviso se
  repete e o botão da loja pisca. As pedras grátis do riacho só aparecem se faltar
  moeda (para a fase nunca travar).
- **Textos flutuantes** sobre os inimigos ("Acertou!", "Escudo!", "Bloqueou!",
  "Na testa! x2", "+pontos").
- **Recorde (troféu)** no HUD.
- **Riacho antes do Golias**: escolher 5 pedras lisas entre ásperas → 5 pedras de fogo.

Melhorias de jogabilidade que não estão no vídeo, mas ajudam no celular:

- **Alvo vermelho no chão** mostrando onde a lança vai cair (dá tempo de desviar).
- **Combo**: acertos seguidos multiplicam os pontos (x1,5 a cada 3 acertos, até x3);
  errar uma pedra zera o combo.
