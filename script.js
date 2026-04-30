/* ═══════════════════════════════════════════════════
   WORDQUEST — script.js
   Full Word Search Puzzle Game
   No external libraries required.
═══════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────
   WORD BANK  (difficulty → levels → word arrays)
───────────────────────────────────────────────── */
const WORD_BANK = {
  easy: [
    ['CAT', 'DOG', 'SUN', 'MAP', 'CUP', 'JAR'],
    ['HAT', 'BAT', 'RAT', 'SAT', 'MAT', 'FAT'],
    ['HEN', 'PEN', 'TEN', 'MEN', 'BEN', 'ZEN'],
    ['TOP', 'HOP', 'POP', 'MOP', 'COP', 'BOP'],
    ['FIG', 'BIG', 'DIG', 'JIG', 'PIG', 'RIG'],
  ],
  medium: [
    ['APPLE', 'MANGO', 'GRAPE', 'PEACH', 'MELON', 'BERRY', 'LEMON'],
    ['OCEAN', 'RIVER', 'BEACH', 'STORM', 'CLOUD', 'FROST', 'BLAZE'],
    ['TIGER', 'ZEBRA', 'PANDA', 'EAGLE', 'SHARK', 'BISON', 'OTTER'],
    ['PIZZA', 'PASTA', 'BREAD', 'CREAM', 'SAUCE', 'OLIVE', 'BASIL'],
    ['PIANO', 'FLUTE', 'VIOLA', 'DRUMS', 'BANJO', 'ORGAN', 'HARP'],
  ],
  hard: [
    ['ELEPHANT', 'TRIANGLE', 'MOUNTAIN', 'CALENDAR', 'UMBRELLA', 'FEATHERS'],
    ['HYDROGEN', 'NITROGEN', 'CHEMICAL', 'MOLECULE', 'ELECTRON', 'PROTON'],
    ['COMPUTER', 'KEYBOARD', 'INTERNET', 'DATABASE', 'SOFTWARE', 'PROGRAM'],
    ['SATURDAY', 'THURSDAY', 'FEBRUARY', 'DECEMBER', 'MIDNIGHT', 'TWILIGHT'],
    ['SYMPHONY', 'MUSICIAN', 'OVERTURE', 'BASSLINE', 'HARMONY', 'TREMOLO'],
  ],
};

/* ─────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────── */
const CONFIG = {
  easy:   { size: 8,  pointsPerWord: 100, coinPerLevel: 30 },
  medium: { size: 10, pointsPerWord: 150, coinPerLevel: 50 },
  hard:   { size: 12, pointsPerWord: 220, coinPerLevel: 80 },
  maxLevels: 5,
  hintCost: 10,
  timeBonusThreshold: 60,   // seconds — under this gives bonus
  timeBonusCoins: 15,
  dailyRewardBase: 50,
  streakBonusPerDay: 10,
};

/* ─────────────────────────────────────────────────
   GAME STATE
───────────────────────────────────────────────── */
let state = {
  difficulty: 'easy',
  level: 0,         // 0-indexed level within difficulty
  coins: 0,
  totalScore: 0,
  currentScore: 0,
  dailyStreak: 0,
  lastLoginDate: null,

  // Grid
  gridSize: 8,
  grid: [],         // 2D char array
  wordPlacements: [], // { word, cells: [{r,c}] }
  foundWords: new Set(),
  wordsForLevel: [],

  // Selection
  isDragging: false,
  selStart: null,   // {r, c}
  selEnd: null,     // {r, c}
  selectedCells: [],// [{r,c}]
  foundCells: new Set(), // "r,c" strings

  // Timer
  timerSeconds: 0,
  timerInterval: null,

  // Hint
  hintActive: false,
};

/* ─────────────────────────────────────────────────
   DOM REFS
───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const DOM = {
  diffScreen:       $('difficulty-screen'),
  gameScreen:       $('game-screen'),
  gridContainer:    $('grid-container'),
  wordList:         $('word-list'),
  wordsFound:       $('words-found'),
  wordsTotal:       $('words-total'),
  statCoins:        $('stat-coins'),
  statScore:        $('stat-score'),
  statTimer:        $('stat-timer'),
  topbarDiff:       $('topbar-diff'),
  topbarLevel:      $('topbar-level'),
  // Daily reward popup
  dailyOverlay:     $('daily-reward-overlay'),
  dailyStreakText:  $('daily-streak-text'),
  dailyAmount:      $('daily-reward-amount'),
  claimRewardBtn:   $('claim-reward-btn'),
  // Level complete popup
  levelCompleteOverlay: $('level-complete-overlay'),
  popupScore:       $('popup-score'),
  popupTime:        $('popup-time'),
  popupCoins:       $('popup-coins'),
  nextLevelBtn:     $('next-level-btn'),
  // Hint popup
  hintOverlay:      $('hint-overlay'),
  hintConfirmBtn:   $('hint-confirm-btn'),
  hintCancelBtn:    $('hint-cancel-btn'),
  // Home stats
  homeCoins:        $('home-coins'),
  homeScore:        $('home-score'),
  homeStreak:       $('home-streak'),
  easyProgress:     $('easy-progress'),
  mediumProgress:   $('medium-progress'),
  hardProgress:     $('hard-progress'),
  // Buttons
  backBtn:          $('back-btn'),
  hintBtn:          $('hint-btn'),
  restartBtn:       $('restart-btn'),
  // Particle canvas
  canvas:           $('particle-canvas'),
};

/* ─────────────────────────────────────────────────
   AUDIO ENGINE  (Web Audio API — no files needed)
───────────────────────────────────────────────── */
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * Play a simple tone sequence.
 * @param {Array<[freq, dur, delay]>} notes
 */
function playTone(notes) {
  try {
    const ac = getAudio();
    notes.forEach(([freq, dur, delay = 0]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ac.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(ac.currentTime + delay);
      osc.stop(ac.currentTime + delay + dur + 0.05);
    });
  } catch (_) { /* audio not available */ }
}

const SFX = {
  wordFound:   () => playTone([[523,0.12,0],[659,0.12,0.13],[784,0.2,0.26]]),
  levelDone:   () => playTone([[523,0.1,0],[659,0.1,0.1],[784,0.1,0.2],[1046,0.35,0.3]]),
  wrong:       () => playTone([[220,0.15,0],[196,0.2,0.12]]),
  select:      () => playTone([[600,0.05,0]]),
  coin:        () => playTone([[880,0.08,0],[1100,0.12,0.09]]),
};

/* ─────────────────────────────────────────────────
   PERSISTENCE (localStorage)
───────────────────────────────────────────────── */
const SAVE_KEY = 'wordquest_save_v2';

function saveState() {
  const save = {
    coins:       state.coins,
    totalScore:  state.totalScore,
    dailyStreak: state.dailyStreak,
    lastLoginDate: state.lastLoginDate,
    levels: {
      easy:   state.difficulty === 'easy'   ? state.level : (loadRaw()?.levels?.easy   ?? 0),
      medium: state.difficulty === 'medium' ? state.level : (loadRaw()?.levels?.medium ?? 0),
      hard:   state.difficulty === 'hard'   ? state.level : (loadRaw()?.levels?.hard   ?? 0),
    },
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function loadRaw() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

function loadSavedState() {
  const save = loadRaw();
  if (!save) return;
  state.coins       = save.coins       || 0;
  state.totalScore  = save.totalScore  || 0;
  state.dailyStreak = save.dailyStreak || 0;
  state.lastLoginDate = save.lastLoginDate || null;
}

function getLevelForDiff(diff) {
  const save = loadRaw();
  return save?.levels?.[diff] ?? 0;
}

/* ─────────────────────────────────────────────────
   DAILY REWARD
───────────────────────────────────────────────── */
/**
 * handleDailyReward — checks login date, updates streak,
 * awards coins, shows popup.
 */
function handleDailyReward() {
  const today = new Date().toDateString();
  if (state.lastLoginDate === today) return; // already claimed today

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (state.lastLoginDate === yesterday) {
    state.dailyStreak++;  // consecutive day
  } else {
    state.dailyStreak = 1; // reset streak
  }
  state.lastLoginDate = today;

  const reward = CONFIG.dailyRewardBase + (state.dailyStreak - 1) * CONFIG.streakBonusPerDay;
  state.coins += reward;
  saveState();

  // Show popup
  DOM.dailyStreakText.textContent = `Day ${state.dailyStreak} Streak! 🔥`;
  DOM.dailyAmount.textContent = `+${reward}`;
  DOM.dailyOverlay.classList.remove('hidden');
  SFX.coin();
}

DOM.claimRewardBtn.addEventListener('click', () => {
  DOM.dailyOverlay.classList.add('hidden');
});

/* ─────────────────────────────────────────────────
   HOME SCREEN
───────────────────────────────────────────────── */
function showHomeScreen() {
  stopTimer();
  DOM.gameScreen.classList.add('hidden');
  DOM.diffScreen.classList.remove('hidden');
  updateHomeStats();
}

function updateHomeStats() {
  DOM.homeCoins.textContent  = state.coins;
  DOM.homeScore.textContent  = state.totalScore;
  DOM.homeStreak.textContent = state.dailyStreak;

  const fmt = (diff) => {
    const lvl = getLevelForDiff(diff);
    return `Level ${lvl + 1} / ${CONFIG.maxLevels}`;
  };
  DOM.easyProgress.textContent   = fmt('easy');
  DOM.mediumProgress.textContent = fmt('medium');
  DOM.hardProgress.textContent   = fmt('hard');
}

document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => {
    const diff = card.dataset.diff;
    startGame(diff);
  });
});

DOM.backBtn.addEventListener('click', showHomeScreen);

/* ─────────────────────────────────────────────────
   GRID GENERATION
───────────────────────────────────────────────── */
const DIRECTIONS = [
  [0,1],   // →  horizontal
  [1,0],   // ↓  vertical
  [1,1],   // ↘  diagonal
  [-1,1],  // ↗  diagonal
  [0,-1],  // ←  reverse horizontal
  [-1,0],  // ↑  reverse vertical
  [-1,-1], // ↖  reverse diagonal
  [1,-1],  // ↙  reverse diagonal
];

/**
 * generateGrid — creates an empty grid and places all words.
 * Returns true if all words placed, false on total failure (retries handled by caller).
 */
function generateGrid() {
  const size = CONFIG[state.difficulty].size;
  state.gridSize = size;

  // Init empty grid
  state.grid = Array.from({ length: size }, () => Array(size).fill(''));
  state.wordPlacements = [];

  placeWords();

  // Fill blanks with random letters
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!state.grid[r][c]) {
        state.grid[r][c] = ALPHA[Math.floor(Math.random() * 26)];
      }
    }
  }
}

/**
 * placeWords — attempts to place each word randomly in the grid.
 * Words that can't fit after many tries are skipped (grid is filled with
 * as many as possible).
 */
function placeWords() {
  const size = state.gridSize;
  const words = [...state.wordsForLevel];

  // Shuffle words for variety
  shuffle(words);

  for (const word of words) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 200) {
      attempts++;
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const [dr, dc] = dir;

      // Random start
      const r0 = Math.floor(Math.random() * size);
      const c0 = Math.floor(Math.random() * size);

      // Check bounds
      const r1 = r0 + dr * (word.length - 1);
      const c1 = c0 + dc * (word.length - 1);
      if (r1 < 0 || r1 >= size || c1 < 0 || c1 >= size) continue;

      // Check cells
      let canPlace = true;
      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        const existing = state.grid[r][c];
        if (existing && existing !== word[i]) { canPlace = false; break; }
        cells.push({ r, c });
      }

      if (canPlace) {
        // Write word
        cells.forEach(({ r, c }, i) => { state.grid[r][c] = word[i]; });
        state.wordPlacements.push({ word, cells });
        placed = true;
      }
    }
    // If word couldn't be placed after 200 attempts, skip it
  }

  // Update wordsForLevel to only include placed words
  state.wordsForLevel = state.wordPlacements.map(p => p.word);
}

/* ─────────────────────────────────────────────────
   RENDER GRID
───────────────────────────────────────────────── */
function renderGrid() {
  const container = DOM.gridContainer;
  container.innerHTML = '';
  const size = state.gridSize;

  container.style.gridTemplateColumns = `repeat(${size}, var(--cell-size))`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = state.grid[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;

      // Restore found state
      if (state.foundCells.has(`${r},${c}`)) {
        cell.classList.add('found');
      }

      container.appendChild(cell);
    }
  }
}

/**
 * renderWordList — populates the word list sidebar.
 */
function renderWordList() {
  DOM.wordList.innerHTML = '';
  for (const word of state.wordsForLevel) {
    const li = document.createElement('li');
    li.className = 'word-list__item';
    li.id = `word-${word}`;
    li.textContent = word;
    if (state.foundWords.has(word)) li.classList.add('found');
    DOM.wordList.appendChild(li);
  }
  DOM.wordsFound.textContent = state.foundWords.size;
  DOM.wordsTotal.textContent = state.wordsForLevel.length;
}

/* ─────────────────────────────────────────────────
   SELECTION (Mouse + Touch)
───────────────────────────────────────────────── */

/**
 * getCell — returns the cell element at (r, c).
 */
function getCell(r, c) {
  return DOM.gridContainer.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

/**
 * getCellFromEvent — resolves a touch/mouse event to a cell element.
 */
function getCellFromEvent(e) {
  const touch = e.touches ? e.touches[0] : e;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (el && el.classList.contains('cell')) return el;
  return null;
}

/**
 * getLineCells — returns all cells forming a straight line from start to end.
 * Returns [] if not a valid straight line.
 */
function getLineCells(start, end) {
  const dr = end.r - start.r;
  const dc = end.c - start.c;
  const len = Math.max(Math.abs(dr), Math.abs(dc));

  if (len === 0) return [{ r: start.r, c: start.c }];

  // Must be horizontal, vertical or 45° diagonal
  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

  // Validate angle
  if (Math.abs(dr) !== 0 && Math.abs(dc) !== 0 && Math.abs(dr) !== Math.abs(dc)) return [];

  const cells = [];
  for (let i = 0; i <= len; i++) {
    cells.push({ r: start.r + stepR * i, c: start.c + stepC * i });
  }
  return cells;
}

function startSelection(r, c) {
  state.isDragging = true;
  state.selStart = { r, c };
  state.selEnd   = { r, c };
  state.selectedCells = [{ r, c }];
  SFX.select();
  highlightSelected();
}

function updateSelection(r, c) {
  if (!state.isDragging) return;
  state.selEnd = { r, c };
  state.selectedCells = getLineCells(state.selStart, state.selEnd);
  highlightSelected();
}

function endSelection() {
  if (!state.isDragging) return;
  state.isDragging = false;
  checkWord();
  clearSelection();
}

function highlightSelected() {
  // Clear all selected cells first
  DOM.gridContainer.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
  // Apply to current selection
  for (const { r, c } of state.selectedCells) {
    const cell = getCell(r, c);
    if (cell && !cell.classList.contains('found')) {
      cell.classList.add('selected');
    }
  }
}

function clearSelection() {
  DOM.gridContainer.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
  state.selectedCells = [];
}

/* handleSelection — main entry point for cell pointer events */
function handleSelection(e) {
  e.preventDefault();
  const el = getCellFromEvent(e);
  if (!el) return;
  const r = parseInt(el.dataset.r);
  const c = parseInt(el.dataset.c);

  if (e.type === 'mousedown' || e.type === 'touchstart') {
    startSelection(r, c);
  } else if (e.type === 'mousemove' || e.type === 'touchmove') {
    updateSelection(r, c);
  } else if (e.type === 'mouseup' || e.type === 'touchend') {
    endSelection();
  }
}

// Attach events to grid container
['mousedown','mousemove','mouseup','touchstart','touchmove','touchend'].forEach(evt => {
  DOM.gridContainer.addEventListener(evt, handleSelection, { passive: false });
});
// End drag outside grid
document.addEventListener('mouseup', () => { if (state.isDragging) endSelection(); });

/* ─────────────────────────────────────────────────
   WORD CHECKING
───────────────────────────────────────────────── */
/**
 * checkWord — compares selected cells against all word placements.
 * If match found: marks cells, updates score, checks level completion.
 * If no match: flashes red.
 */
function checkWord() {
  if (state.selectedCells.length < 2) return;

  const selectedKey = state.selectedCells.map(c => `${c.r},${c.c}`).join('|');

  for (const { word, cells } of state.wordPlacements) {
    if (state.foundWords.has(word)) continue;

    // Forward match
    const fwdKey = cells.map(c => `${c.r},${c.c}`).join('|');
    // Reverse match (word can be selected backwards)
    const revKey = [...cells].reverse().map(c => `${c.r},${c.c}`).join('|');

    if (selectedKey === fwdKey || selectedKey === revKey) {
      // MATCH!
      markWordFound(word, cells);
      return;
    }
  }

  // No match — flash wrong
  for (const { r, c } of state.selectedCells) {
    const cell = getCell(r, c);
    if (cell) {
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 400);
    }
  }
  SFX.wrong();
}

/**
 * markWordFound — updates state and UI after a correct word is found.
 */
function markWordFound(word, cells) {
  state.foundWords.add(word);

  // Mark cells as found (persist color)
  for (const { r, c } of cells) {
    state.foundCells.add(`${r},${c}`);
    const cell = getCell(r, c);
    if (cell) {
      cell.classList.remove('selected');
      cell.classList.add('found');
    }
  }

  // Strike through word in list
  const li = $(`word-${word}`);
  if (li) li.classList.add('found');

  // Score
  updateScore(CONFIG[state.difficulty].pointsPerWord);
  DOM.wordsFound.textContent = state.foundWords.size;

  // Celebratory particle burst
  const lastCell = getCell(cells[cells.length - 1].r, cells[cells.length - 1].c);
  if (lastCell) {
    const rect = lastCell.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  // Score float UI
  showScoreFloat(`+${CONFIG[state.difficulty].pointsPerWord}`, cells[0]);

  SFX.wordFound();

  // Check level completion
  if (state.foundWords.size === state.wordsForLevel.length) {
    setTimeout(completeLevel, 600);
  }
}

/* ─────────────────────────────────────────────────
   SCORE & COINS
───────────────────────────────────────────────── */
/**
 * updateScore — adds points to current and total score, updates UI.
 */
function updateScore(points) {
  state.currentScore += points;
  state.totalScore  += points;
  DOM.statScore.textContent = state.currentScore;
}

function updateCoins(amount) {
  state.coins += amount;
  DOM.statCoins.textContent = state.coins;
}

function showScoreFloat(text, cell) {
  const domCell = getCell(cell.r, cell.c);
  if (!domCell) return;
  const rect = domCell.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'score-float';
  el.textContent = text;
  el.style.left = rect.left + 'px';
  el.style.top  = rect.top  + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ─────────────────────────────────────────────────
   LEVEL COMPLETE
───────────────────────────────────────────────── */
function completeLevel() {
  stopTimer();
  SFX.levelDone();
  spawnConfetti();

  const elapsed = state.timerSeconds;
  const baseCoins = CONFIG[state.difficulty].coinPerLevel;
  let bonusCoins = 0;
  if (elapsed <= CONFIG.timeBonusThreshold) {
    bonusCoins = CONFIG.timeBonusCoins;
  }
  const totalCoins = baseCoins + bonusCoins;

  updateCoins(totalCoins);
  saveState();

  // Advance level (wrap around)
  const nextLevel = (state.level + 1) % CONFIG.maxLevels;
  // Persist for this difficulty
  const save = loadRaw() || {};
  if (!save.levels) save.levels = {};
  save.levels[state.difficulty] = nextLevel;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, coins: state.coins, totalScore: state.totalScore }));

  // Populate popup
  DOM.popupScore.textContent = state.currentScore;
  DOM.popupTime.textContent  = formatTime(elapsed);
  DOM.popupCoins.textContent = `+${totalCoins}${bonusCoins ? ` (⚡+${bonusCoins} speed bonus!)` : ''} 🪙`;
  DOM.levelCompleteOverlay.classList.remove('hidden');
}

DOM.nextLevelBtn.addEventListener('click', () => {
  DOM.levelCompleteOverlay.classList.add('hidden');
  const nextLevel = (state.level + 1) % CONFIG.maxLevels;
  startGame(state.difficulty, nextLevel);
});

/* ─────────────────────────────────────────────────
   TIMER
───────────────────────────────────────────────── */
function startTimer() {
  state.timerSeconds = 0;
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    DOM.statTimer.textContent = formatTime(state.timerSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────────
   HINT SYSTEM
───────────────────────────────────────────────── */
DOM.hintBtn.addEventListener('click', () => {
  if (state.coins < CONFIG.hintCost) {
    // Flash hint button red briefly
    DOM.hintBtn.style.color = '#f43f5e';
    setTimeout(() => { DOM.hintBtn.style.color = ''; }, 1000);
    return;
  }
  DOM.hintOverlay.classList.remove('hidden');
});

DOM.hintCancelBtn.addEventListener('click', () => {
  DOM.hintOverlay.classList.add('hidden');
});

DOM.hintConfirmBtn.addEventListener('click', () => {
  DOM.hintOverlay.classList.add('hidden');
  useHint();
});

/**
 * useHint — picks a random unfound word, highlights it for 3 seconds.
 */
function useHint() {
  const unfound = state.wordPlacements.filter(p => !state.foundWords.has(p.word));
  if (!unfound.length) return;

  updateCoins(-CONFIG.hintCost);
  saveState();

  const pick = unfound[Math.floor(Math.random() * unfound.length)];

  // Highlight cells
  for (const { r, c } of pick.cells) {
    const cell = getCell(r, c);
    if (cell) cell.classList.add('hint');
  }
  // Highlight word in list
  const li = $(`word-${pick.word}`);
  if (li) li.classList.add('hint-glow');

  // Remove after 3s
  setTimeout(() => {
    for (const { r, c } of pick.cells) {
      const cell = getCell(r, c);
      if (cell && !cell.classList.contains('found')) cell.classList.remove('hint');
    }
    if (li) li.classList.remove('hint-glow');
  }, 3000);
}

/* ─────────────────────────────────────────────────
   RESTART
───────────────────────────────────────────────── */
DOM.restartBtn.addEventListener('click', () => {
  startGame(state.difficulty, state.level);
});

/* ─────────────────────────────────────────────────
   START GAME
───────────────────────────────────────────────── */
/**
 * startGame — initialises a new game for given difficulty and level.
 * @param {string} diff  'easy' | 'medium' | 'hard'
 * @param {number} level 0-indexed
 */
function startGame(diff, level) {
  // Determine level
  if (level === undefined) level = getLevelForDiff(diff);

  state.difficulty   = diff;
  state.level        = level;
  state.foundWords   = new Set();
  state.foundCells   = new Set();
  state.selectedCells= [];
  state.isDragging   = false;
  state.currentScore = 0;
  state.hintActive   = false;

  // Clamp level to available
  const clampedLevel = level % CONFIG.maxLevels;
  state.wordsForLevel = [...WORD_BANK[diff][clampedLevel]];

  // Generate grid (retry up to 5 times if needed)
  let attempts = 0;
  do {
    generateGrid();
    attempts++;
  } while (state.wordsForLevel.length === 0 && attempts < 5);

  // Switch screens
  DOM.diffScreen.classList.add('hidden');
  DOM.gameScreen.classList.remove('hidden');

  // Update topbar
  const DIFF_LABELS = { easy: '🌱 Easy', medium: '🔥 Medium', hard: '💀 Hard' };
  DOM.topbarDiff.textContent  = DIFF_LABELS[diff];
  DOM.topbarLevel.textContent = `Level ${clampedLevel + 1}`;
  DOM.statCoins.textContent   = state.coins;
  DOM.statScore.textContent   = 0;
  DOM.statTimer.textContent   = '0:00';

  renderGrid();
  renderWordList();
  stopTimer();
  startTimer();
}

/* ─────────────────────────────────────────────────
   PARTICLE SYSTEM
───────────────────────────────────────────────── */
const canvas = DOM.canvas;
const ctx2d   = canvas.getContext('2d');
let particles = [];
let rafId     = null;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/**
 * spawnParticles — small burst at (x, y) for word-found effect.
 */
function spawnParticles(x, y) {
  const colors = ['#f5c842','#f5842e','#4ade80','#60a5fa','#f43f5e','#a78bfa'];
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      size: 3 + Math.random() * 4,
      decay: 0.025 + Math.random() * 0.02,
    });
  }
  if (!rafId) animateParticles();
}

/**
 * spawnConfetti — larger burst for level complete.
 */
function spawnConfetti() {
  const colors = ['#f5c842','#f5842e','#4ade80','#60a5fa','#f43f5e','#a78bfa','#fff'];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 3,
      vx: (Math.random() - 0.5) * 14,
      vy: -5 - Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      size: 5 + Math.random() * 7,
      decay: 0.008 + Math.random() * 0.012,
      gravity: 0.25,
    });
  }
  if (!rafId) animateParticles();
}

function animateParticles() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0);

  for (const p of particles) {
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += p.gravity || 0.05;
    p.life -= p.decay;

    ctx2d.globalAlpha = Math.max(0, p.life);
    ctx2d.fillStyle   = p.color;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx2d.fill();
  }
  ctx2d.globalAlpha = 1;

  if (particles.length > 0) {
    rafId = requestAnimationFrame(animateParticles);
  } else {
    rafId = null;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* ─────────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────────── */
/**
 * shuffle — Fisher-Yates in-place array shuffle.
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ─────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────── */
function init() {
  loadSavedState();
  handleDailyReward();
  updateHomeStats();
}

init();
