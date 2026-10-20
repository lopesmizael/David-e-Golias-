// Dados do jogo: fases, loja, tipos de pedra e perguntas do quiz.

export const STONES = {
  comum: { name: 'Pedra', damage: 1, color: 0x9a948a, price: 60, pack: 10, pierce: false },
  ferro: { name: 'Pedra de Ferro', damage: 2, color: 0x5d6670, price: 100, pack: 5, pierce: false },
  fogo: { name: 'Pedra de Fogo', damage: 3, color: 0xff7a1a, price: 200, pack: 3, pierce: true },
};

export const UPGRADES = {
  forca: { name: 'Funda: força', desc: 'Pedras mais rápidas e longas', base: 100, max: 3 },
  recarga: { name: 'Funda: recarga', desc: 'Atira com menos espera', base: 100, max: 3 },
  vida: { name: 'Coragem', desc: '+1 coração de vida', base: 150, max: 2 },
};

// scene: 'pasto' | 'pasto-tarde' | 'deserto' | 'deserto-tarde' | 'vale'
// waves: lista de [tempo_s, tipo, x] — x em -1..1 (posição lateral relativa)
export const LEVELS = [
  {
    id: 1, name: 'A funda', tag: 'TUTORIAL', scene: 'pasto',
    story: 'Davi cuidava das ovelhas do seu pai, Jessé. Treine a funda acertando os jarros!',
    goal: 'Acerte todos os jarros',
    tip: 'Toque/clique na tela para mirar e atirar. Use ◀ ▶ (ou A/D) para andar.',
    sheep: 3, protectSheep: false,
    waves: [[0, 'jarro', -0.6], [0, 'jarro', 0], [0, 'jarro', 0.6], [0, 'jarro', -0.3], [0, 'jarro', 0.3]],
  },
  {
    id: 2, name: 'O urso', tag: 'TUTORIAL', scene: 'pasto',
    story: 'Um urso apareceu para atacar o rebanho! Proteja as ovelhas.',
    goal: 'Não deixe o urso pegar as ovelhas',
    tip: 'Se o urso chegar até uma ovelha, ela foge assustada.',
    sheep: 4, protectSheep: true,
    waves: [[1, 'urso', 0], [9, 'urso', -0.7], [16, 'urso', 0.7]],
  },
  {
    id: 3, name: 'O leão', tag: 'PROTEJA', scene: 'pasto-tarde',
    story: 'O Senhor livrou Davi das garras do leão e do urso. Agora vem o leão — ele é rápido!',
    goal: 'Proteja as ovelhas do leão',
    tip: 'Pedras de ferro causam o dobro de dano.',
    sheep: 4, protectSheep: true,
    waves: [[1, 'leao', 0], [7, 'urso', -0.6], [13, 'leao', 0.6], [19, 'leao', -0.2]],
  },
  {
    id: 4, name: 'Combate', tag: 'COMBATE', scene: 'deserto',
    story: 'O exército filisteu acampou no vale. Os soldados avançam — defenda o acampamento de Israel!',
    goal: 'Derrote os soldados filisteus',
    tip: 'Desvie das lanças andando para os lados.',
    sheep: 0, protectSheep: false,
    waves: [[1, 'soldado', -0.5], [4, 'soldado', 0.5], [8, 'soldado', 0], [11, 'soldado', -0.8],
      [13, 'soldado', 0.8], [17, 'soldado', -0.3], [19, 'soldado', 0.3], [23, 'soldado', 0]],
  },
  {
    id: 5, name: 'Escudeiros', tag: 'COMBATE', scene: 'deserto-tarde',
    story: 'Agora vêm os escudeiros. O escudo segura pedras comuns por alguns golpes.',
    goal: 'Derrote os escudeiros',
    tip: 'Pedras de ferro e de fogo quebram escudos mais rápido.',
    sheep: 0, protectSheep: false,
    waves: [[1, 'soldado', 0], [4, 'escudeiro', -0.5], [8, 'soldado', 0.7], [10, 'escudeiro', 0.4],
      [14, 'soldado', -0.7], [16, 'escudeiro', 0], [20, 'soldado', 0.5], [22, 'escudeiro', -0.4], [26, 'escudeiro', 0.6]],
  },
  {
    id: 6, name: 'Golias', tag: 'COMBATE', scene: 'vale',
    story: 'Você vem contra mim com espada e lança, mas eu vou contra você em nome do Senhor! (1 Samuel 17:45)',
    goal: 'Derrote o gigante Golias',
    tip: 'Quando Golias erguer o escudo, mude para a PEDRA DE FOGO!',
    sheep: 0, protectSheep: false,
    waves: [[1, 'golias', 0]],
  },
];

export const QUIZ = [
  { q: 'Qual era a profissão de Davi antes de enfrentar Golias?', a: ['Pastor de ovelhas', 'Soldado', 'Pescador'], c: 0 },
  { q: 'Quantas pedras Davi pegou no riacho?', a: ['Três', 'Cinco', 'Sete'], c: 1 },
  { q: 'Qual era o nome do pai de Davi?', a: ['Saul', 'Abraão', 'Jessé'], c: 2 },
  { q: 'De que povo era Golias?', a: ['Filisteu', 'Egípcio', 'Babilônio'], c: 0 },
  { q: 'Qual rei de Israel ofereceu sua armadura a Davi?', a: ['Salomão', 'Saul', 'Josias'], c: 1 },
  { q: 'Que animais Davi enfrentou para proteger o rebanho?', a: ['Lobo e cobra', 'Leão e urso', 'Javali e raposa'], c: 1 },
  { q: 'Em que livro da Bíblia está a história de Davi e Golias?', a: ['1 Samuel', 'Gênesis', 'Juízes'], c: 0 },
  { q: 'Em que vale aconteceu a batalha?', a: ['Vale do Jordão', 'Vale de Elá', 'Vale de Hinom'], c: 1 },
];

// Prêmios das 6 cartas
export const PRIZES = [
  { label: '+50 moedas', coins: 50 },
  { label: '+100 moedas', coins: 100 },
  { label: '+5 pedras', stone: 'comum', n: 5 },
  { label: '+3 pedras de ferro', stone: 'ferro', n: 3 },
  { label: '+1 pedra de fogo', stone: 'fogo', n: 1 },
  { label: '+200 moedas', coins: 200 },
];
