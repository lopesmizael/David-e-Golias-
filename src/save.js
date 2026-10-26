// Progresso salvo no navegador. Toda leitura/escrita é protegida: em modo privado
// o localStorage pode falhar e o jogo deve continuar funcionando.
const KEY = 'davi-e-golias-save-v1';

export function defaultSave() {
  return {
    unlocked: 1,
    coins: 150,
    stones: { comum: 5, ferro: 0, fogo: 0 }, // como no vídeo: começa com x5
    upgrades: { forca: 0, recarga: 0, vida: 0 },
    best: {},
    difficulty: 'normal',
    music: true,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const d = defaultSave();
    const s = JSON.parse(raw);
    return {
      ...d, ...s,
      stones: { ...d.stones, ...s.stones },
      upgrades: { ...d.upgrades, ...s.upgrades },
      best: { ...d.best, ...s.best },
    };
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* sem armazenamento */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return defaultSave();
}
