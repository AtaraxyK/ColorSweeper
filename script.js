const STORAGE_KEY = 'color-sweeper-preset-store-v1';
const SOUND_PREF_KEY = 'color-sweeper-sound-enabled-v1';
const EMPTY_CELL = -1;
const EXPORT_VERSION = 1;

const BUILTIN_PRESETS = [
  {
    id: 'builtin-easy',
    kind: 'builtin',
    name: '쉬움',
    config: {
      stagesPerPlay: 7,
      initialColorCount: 3,
      initialBoardSize: 5,
      colorIncreaseEvery: 1,
      colorIncreaseAmount: 1,
      boardIncreaseEvery: 3,
      boardIncreaseAmount: 1,
      maxColorCount: 7,
      maxBoardSize: 8,
      initialMoves: 10,
      stageClearMoveBonus: 3,
      boardGrowMoveBonus: 1,
    },
  },
  {
    id: 'builtin-normal-ish',
    kind: 'builtin',
    name: '그럭저럭',
    config: {
      stagesPerPlay: 6,
      initialColorCount: 4,
      initialBoardSize: 5,
      colorIncreaseEvery: 1,
      colorIncreaseAmount: 1,
      boardIncreaseEvery: 3,
      boardIncreaseAmount: 1,
      maxColorCount: 8,
      maxBoardSize: 9,
      initialMoves: 10,
      stageClearMoveBonus: 3,
      boardGrowMoveBonus: 1,
    },
  },
  {
    id: 'builtin-hard',
    kind: 'builtin',
    name: '어려움',
    config: {
      stagesPerPlay: 5,
      initialColorCount: 5,
      initialBoardSize: 7,
      colorIncreaseEvery: 1,
      colorIncreaseAmount: 1,
      boardIncreaseEvery: 3,
      boardIncreaseAmount: 1,
      maxColorCount: 9,
      maxBoardSize: 10,
      initialMoves: 12,
      stageClearMoveBonus: 4,
      boardGrowMoveBonus: 1,
    },
  },
  {
    id: 'builtin-very-hard',
    kind: 'builtin',
    name: '많이 어려움',
    config: {
      stagesPerPlay: 4,
      initialColorCount: 6,
      initialBoardSize: 8,
      colorIncreaseEvery: 1,
      colorIncreaseAmount: 1,
      boardIncreaseEvery: 3,
      boardIncreaseAmount: 1,
      maxColorCount: 10,
      maxBoardSize: 11,
      initialMoves: 13,
      stageClearMoveBonus: 4,
      boardGrowMoveBonus: 1,
    },
  },
  {
    id: 'builtin-brutal',
    kind: 'builtin',
    name: '정말 많이 어려움',
    config: {
      stagesPerPlay: 3,
      initialColorCount: 7,
      initialBoardSize: 10,
      colorIncreaseEvery: 1,
      colorIncreaseAmount: 1,
      boardIncreaseEvery: 3,
      boardIncreaseAmount: 1,
      maxColorCount: 11,
      maxBoardSize: 12,
      initialMoves: 14,
      stageClearMoveBonus: 5,
      boardGrowMoveBonus: 2,
    },
  },
];

const PALETTE = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#22c55e',
  '#e11d48', '#0ea5e9', '#d97706', '#65a30d', '#7c3aed', '#0f766e',
];

const el = {
  setupScreen: document.getElementById('setup-screen'),
  playScreen: document.getElementById('play-screen'),
  builtinPresetList: document.getElementById('builtin-preset-list'),
  customPresetList: document.getElementById('custom-preset-list'),
  customPresetEmpty: document.getElementById('custom-preset-empty'),
  selectedPresetBadge: document.getElementById('selected-preset-badge'),
  configSummary: document.getElementById('config-summary'),
  toggleDetailsBtn: document.getElementById('toggle-details-btn'),
  detailsPanel: document.getElementById('details-panel'),
  startGameBtn: document.getElementById('start-game-btn'),
  exportBtn: document.getElementById('export-btn'),
  importBtn: document.getElementById('import-btn'),
  clipboardCard: document.getElementById('clipboard-card'),
  clipboardTextarea: document.getElementById('clipboard-textarea'),
  closeClipboardBtn: document.getElementById('close-clipboard-btn'),
  copyTextareaBtn: document.getElementById('copy-textarea-btn'),
  applyTextareaBtn: document.getElementById('apply-textarea-btn'),
  savePresetBtn: document.getElementById('save-preset-btn'),
  saveAsNewBtn: document.getElementById('save-as-new-btn'),
  presetNameInput: document.getElementById('preset-name-input'),
  stagesPerPlayInput: document.getElementById('stages-per-play-input'),
  initialColorCountInput: document.getElementById('initial-color-count-input'),
  initialBoardSizeInput: document.getElementById('initial-board-size-input'),
  colorIncreaseEveryInput: document.getElementById('color-increase-every-input'),
  colorIncreaseAmountInput: document.getElementById('color-increase-amount-input'),
  boardIncreaseEveryInput: document.getElementById('board-increase-every-input'),
  boardIncreaseAmountInput: document.getElementById('board-increase-amount-input'),
  maxColorCountInput: document.getElementById('max-color-count-input'),
  maxBoardSizeInput: document.getElementById('max-board-size-input'),
  initialMovesInput: document.getElementById('initial-moves-input'),
  stageClearMoveBonusInput: document.getElementById('stage-clear-move-bonus-input'),
  boardGrowMoveBonusInput: document.getElementById('board-grow-move-bonus-input'),
  giveUpBtn: document.getElementById('give-up-btn'),
  moveCounter: document.getElementById('move-counter'),
  stageIndicator: document.getElementById('stage-indicator'),
  boardInfo: document.getElementById('board-info'),
  boardStatus: document.getElementById('board-status'),
  board: document.getElementById('board'),
  colorToolbar: document.getElementById('color-toolbar'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayMessage: document.getElementById('overlay-message'),
  overlayActionBtn: document.getElementById('overlay-action-btn'),
  toggleSoundBtn: document.getElementById('toggle-sound-btn'),
  playSoundToggleBtn: document.getElementById('play-sound-toggle-btn'),
};

const appState = {
  customPresets: [],
  lastSelectedPresetRef: null,
  selectedPresetRef: null,
  selectedConfig: null,
  detailsOpen: false,
  soundEnabled: true,
  currentRun: null,
  overlayHandler: null,
};

const audioState = {
  start: null,
  colorPick: null,
  success: null,
  fail: null,
};

function init() {
  loadSoundPreference();
  loadStoredPresetData();
  setupAudio();
  bindEvents();
  renderBuiltinPresets();
  renderCustomPresets();
  applyLastSelectedPresetOnBoot();
  updateAllUi();
}

function setupAudio() {
  audioState.start = createAudio('./assets/audio/ui_click.mp3');
  audioState.colorPick = createAudio('./assets/audio/color_pick.mp3');
  audioState.success = createAudio('./assets/audio/success.mp3');
  audioState.fail = createAudio('./assets/audio/fail.mp3');
}

function createAudio(src) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}

function bindEvents() {
  el.toggleDetailsBtn.addEventListener('click', () => {
    appState.detailsOpen = !appState.detailsOpen;
    updateDetailsVisibility();
  });

  const inputs = [
    el.presetNameInput,
    el.stagesPerPlayInput,
    el.initialColorCountInput,
    el.initialBoardSizeInput,
    el.colorIncreaseEveryInput,
    el.colorIncreaseAmountInput,
    el.boardIncreaseEveryInput,
    el.boardIncreaseAmountInput,
    el.maxColorCountInput,
    el.maxBoardSizeInput,
    el.initialMovesInput,
    el.stageClearMoveBonusInput,
    el.boardGrowMoveBonusInput,
  ];

  inputs.forEach((input) => {
    input.addEventListener('input', onConfigInputChanged);
  });

  el.savePresetBtn.addEventListener('click', onSavePresetClicked);
  el.saveAsNewBtn.addEventListener('click', onSaveAsNewClicked);
  el.startGameBtn.addEventListener('click', startGameFromSelectedConfig);
  el.exportBtn.addEventListener('click', onExportDataClicked);
  el.importBtn.addEventListener('click', onImportDataClicked);
  el.closeClipboardBtn.addEventListener('click', () => {
    el.clipboardCard.classList.add('hidden');
  });
  el.copyTextareaBtn.addEventListener('click', async () => {
    const text = el.clipboardTextarea.value.trim();
    if (!text) {
      window.alert('복사할 데이터가 없습니다.');
      return;
    }
    await copyTextToClipboard(text, true);
  });
  el.applyTextareaBtn.addEventListener('click', () => {
    importPresetDataFromText(el.clipboardTextarea.value);
  });
  el.giveUpBtn.addEventListener('click', onGiveUpClicked);
  el.overlayActionBtn.addEventListener('click', () => {
    hideOverlay();
    if (typeof appState.overlayHandler === 'function') {
      const handler = appState.overlayHandler;
      appState.overlayHandler = null;
      handler();
    }
  });
  el.toggleSoundBtn.addEventListener('click', toggleSound);
  el.playSoundToggleBtn.addEventListener('click', toggleSound);
}

function onConfigInputChanged() {
  const config = readConfigFromInputs();
  const sanitized = sanitizeConfig(config);
  appState.selectedConfig = sanitized;
  if (appState.selectedPresetRef) {
    appState.selectedPresetRef = { ...appState.selectedPresetRef, tempModified: true };
  } else {
    appState.selectedPresetRef = {
      id: `temp-${Date.now()}`,
      kind: 'temp',
      name: sanitized.presetName || '임시 설정',
      tempModified: true,
    };
  }
  updateSummary();
  updateStartButtonState();
  updateSelectedBadges();
}

function loadStoredPresetData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      appState.customPresets = [];
      appState.lastSelectedPresetRef = null;
      return;
    }
    const parsed = JSON.parse(raw);
    appState.customPresets = Array.isArray(parsed.customPresets)
      ? parsed.customPresets.map(normalizeCustomPreset).filter(Boolean)
      : [];
    appState.lastSelectedPresetRef = parsed.lastSelectedPresetRef || null;
  } catch (error) {
    console.error('저장된 프리셋 데이터를 불러오지 못했습니다.', error);
    appState.customPresets = [];
    appState.lastSelectedPresetRef = null;
  }
}

function loadSoundPreference() {
  try {
    const stored = localStorage.getItem(SOUND_PREF_KEY);
    appState.soundEnabled = stored === null ? true : stored === '1';
  } catch (error) {
    appState.soundEnabled = true;
  }
}

function saveSoundPreference() {
  try {
    localStorage.setItem(SOUND_PREF_KEY, appState.soundEnabled ? '1' : '0');
  } catch (error) {
    console.warn('사운드 설정 저장에 실패했습니다.', error);
  }
}

function savePresetStorage() {
  const payload = {
    version: EXPORT_VERSION,
    customPresets: appState.customPresets,
    lastSelectedPresetRef: appState.lastSelectedPresetRef,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function applyLastSelectedPresetOnBoot() {
  let targetPreset = null;
  if (appState.lastSelectedPresetRef) {
    targetPreset = getPresetByRef(appState.lastSelectedPresetRef);
  }
  if (!targetPreset) {
    targetPreset = BUILTIN_PRESETS[0];
  }
  if (targetPreset) {
    selectPreset(targetPreset, false);
  }
}

function updateAllUi() {
  updateSoundButtons();
  updateSelectedBadges();
  updateSummary();
  updateDetailsVisibility();
  updateStartButtonState();
  updateExportButtonVisibility();
}

function renderBuiltinPresets() {
  el.builtinPresetList.innerHTML = '';
  BUILTIN_PRESETS.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-btn';
    button.dataset.presetId = preset.id;
    button.innerHTML = `
      <strong>${escapeHtml(preset.name)}</strong>
      <small>${preset.config.initialBoardSize}x${preset.config.initialBoardSize} · ${preset.config.initialColorCount}색 시작</small>
    `;
    button.addEventListener('click', () => selectPreset(preset, true));
    el.builtinPresetList.appendChild(button);
  });
}

function renderCustomPresets() {
  el.customPresetList.innerHTML = '';
  const hasCustom = appState.customPresets.length > 0;
  el.customPresetEmpty.classList.toggle('hidden', hasCustom);

  appState.customPresets.forEach((preset) => {
    const li = document.createElement('li');
    li.className = 'custom-preset-item';
    li.dataset.presetId = preset.id;

    const mainButton = document.createElement('button');
    mainButton.type = 'button';
    mainButton.className = 'custom-preset-main';
    mainButton.innerHTML = `
      <strong>${escapeHtml(preset.name)}</strong>
      <small>${preset.config.initialBoardSize}x${preset.config.initialBoardSize} · ${preset.config.initialColorCount}색 시작 · ${preset.config.stagesPerPlay}스테이지</small>
    `;
    mainButton.addEventListener('click', () => selectPreset(preset, true));

    const actions = document.createElement('div');
    actions.className = 'custom-preset-actions';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'secondary-btn';
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteCustomPreset(preset.id);
    });

    actions.appendChild(deleteButton);
    li.appendChild(mainButton);
    li.appendChild(actions);
    el.customPresetList.appendChild(li);
  });

  updateSelectedBadges();
}

function selectPreset(preset, rememberSelection) {
  appState.selectedPresetRef = {
    id: preset.id,
    kind: preset.kind || 'custom',
    tempModified: false,
    name: preset.name,
  };
  appState.selectedConfig = cloneConfig({ ...preset.config, presetName: preset.name });
  writeConfigToInputs(appState.selectedConfig);

  if (rememberSelection) {
    appState.lastSelectedPresetRef = {
      id: preset.id,
      kind: preset.kind || 'custom',
    };
    savePresetStorage();
  }

  updateSelectedBadges();
  updateSummary();
  updateStartButtonState();
}

function writeConfigToInputs(config) {
  el.presetNameInput.value = config.presetName || '';
  el.stagesPerPlayInput.value = config.stagesPerPlay;
  el.initialColorCountInput.value = config.initialColorCount;
  el.initialBoardSizeInput.value = config.initialBoardSize;
  el.colorIncreaseEveryInput.value = config.colorIncreaseEvery;
  el.colorIncreaseAmountInput.value = config.colorIncreaseAmount;
  el.boardIncreaseEveryInput.value = config.boardIncreaseEvery;
  el.boardIncreaseAmountInput.value = config.boardIncreaseAmount;
  el.maxColorCountInput.value = config.maxColorCount;
  el.maxBoardSizeInput.value = config.maxBoardSize;
  el.initialMovesInput.value = config.initialMoves;
  el.stageClearMoveBonusInput.value = config.stageClearMoveBonus;
  el.boardGrowMoveBonusInput.value = config.boardGrowMoveBonus;
}

function readConfigFromInputs() {
  return {
    presetName: el.presetNameInput.value.trim(),
    stagesPerPlay: Number(el.stagesPerPlayInput.value),
    initialColorCount: Number(el.initialColorCountInput.value),
    initialBoardSize: Number(el.initialBoardSizeInput.value),
    colorIncreaseEvery: Number(el.colorIncreaseEveryInput.value),
    colorIncreaseAmount: Number(el.colorIncreaseAmountInput.value),
    boardIncreaseEvery: Number(el.boardIncreaseEveryInput.value),
    boardIncreaseAmount: Number(el.boardIncreaseAmountInput.value),
    maxColorCount: Number(el.maxColorCountInput.value),
    maxBoardSize: Number(el.maxBoardSizeInput.value),
    initialMoves: Number(el.initialMovesInput.value),
    stageClearMoveBonus: Number(el.stageClearMoveBonusInput.value),
    boardGrowMoveBonus: Number(el.boardGrowMoveBonusInput.value),
  };
}

function sanitizeConfig(config) {
  const sanitized = {
    presetName: config.presetName || '',
    stagesPerPlay: clampInt(config.stagesPerPlay, 1, 99, 5),
    initialColorCount: clampInt(config.initialColorCount, 2, PALETTE.length, 3),
    initialBoardSize: clampInt(config.initialBoardSize, 3, 20, 5),
    colorIncreaseEvery: clampInt(config.colorIncreaseEvery, 1, 20, 1),
    colorIncreaseAmount: clampInt(config.colorIncreaseAmount, 0, 10, 1),
    boardIncreaseEvery: clampInt(config.boardIncreaseEvery, 1, 20, 3),
    boardIncreaseAmount: clampInt(config.boardIncreaseAmount, 0, 5, 1),
    maxColorCount: clampInt(config.maxColorCount, 2, PALETTE.length, 7),
    maxBoardSize: clampInt(config.maxBoardSize, 3, 25, 8),
    initialMoves: clampInt(config.initialMoves, 1, 99, 10),
    stageClearMoveBonus: clampInt(config.stageClearMoveBonus, 0, 50, 3),
    boardGrowMoveBonus: clampInt(config.boardGrowMoveBonus, 0, 50, 1),
  };

  sanitized.maxColorCount = Math.max(sanitized.maxColorCount, sanitized.initialColorCount);
  sanitized.maxBoardSize = Math.max(sanitized.maxBoardSize, sanitized.initialBoardSize);
  return sanitized;
}

function validateConfig(config) {
  if (!config) {
    return { valid: false, message: '프리셋을 먼저 선택하거나 설정해 주세요.' };
  }
  if (!config.presetName.trim()) {
    return { valid: false, message: '프리셋 이름을 입력해 주세요.' };
  }
  if (config.initialColorCount > config.maxColorCount) {
    return { valid: false, message: '초기 색상 수는 최대 색상 수보다 클 수 없습니다.' };
  }
  if (config.initialBoardSize > config.maxBoardSize) {
    return { valid: false, message: '초기 칸 수는 최대 칸 수보다 클 수 없습니다.' };
  }
  if (config.initialColorCount > PALETTE.length) {
    return { valid: false, message: `최대 지원 색상 수는 ${PALETTE.length}개입니다.` };
  }
  return { valid: true, message: '' };
}

function updateSummary() {
  if (!appState.selectedConfig) {
    el.configSummary.innerHTML = '프리셋을 선택하면 요약이 표시됩니다.';
    return;
  }
  const config = sanitizeConfig(appState.selectedConfig);
  el.configSummary.innerHTML = `
    <div class="summary-grid">
      <div><small>프리셋 이름</small><strong>${escapeHtml(config.presetName || '이름 없음')}</strong></div>
      <div><small>스테이지 수</small><strong>${config.stagesPerPlay}</strong></div>
      <div><small>초기 색상 / 최대</small><strong>${config.initialColorCount} / ${config.maxColorCount}</strong></div>
      <div><small>초기 칸 수 / 최대</small><strong>${config.initialBoardSize} / ${config.maxBoardSize}</strong></div>
      <div><small>색상 증가</small><strong>${config.colorIncreaseEvery}스테이지마다 +${config.colorIncreaseAmount}</strong></div>
      <div><small>칸 수 증가</small><strong>${config.boardIncreaseEvery}스테이지마다 +${config.boardIncreaseAmount}</strong></div>
      <div><small>시작 선택 횟수</small><strong>${config.initialMoves}</strong></div>
      <div><small>클리어 보너스</small><strong>+${config.stageClearMoveBonus}${config.boardGrowMoveBonus ? ` / 보드확장 +${config.boardGrowMoveBonus}` : ''}</strong></div>
    </div>
  `;
}

function updateDetailsVisibility() {
  el.detailsPanel.classList.toggle('hidden', !appState.detailsOpen);
  el.toggleDetailsBtn.textContent = appState.detailsOpen ? '세부 설정 접기' : '세부 설정 펼치기';
}

function updateStartButtonState() {
  const config = appState.selectedConfig ? sanitizeConfig(appState.selectedConfig) : null;
  const validation = validateConfig(config);
  el.startGameBtn.disabled = !validation.valid;
  if (!validation.valid && config) {
    el.boardStatus.textContent = validation.message;
  }
}

function updateExportButtonVisibility() {
  el.exportBtn.classList.toggle('hidden', !hasExportablePresetData());
}

function updateSelectedBadges() {
  const selectedId = appState.selectedPresetRef?.id || null;
  document.querySelectorAll('.preset-btn, .custom-preset-item').forEach((node) => {
    node.classList.toggle('selected', node.dataset.presetId === selectedId);
  });

  if (!appState.selectedConfig) {
    el.selectedPresetBadge.textContent = '선택 없음';
    el.selectedPresetBadge.classList.add('subtle');
    return;
  }

  const isModified = Boolean(appState.selectedPresetRef?.tempModified);
  const name = appState.selectedConfig.presetName || appState.selectedPresetRef?.name || '임시 설정';
  el.selectedPresetBadge.textContent = isModified ? `${name} (임시 수정됨)` : name;
  el.selectedPresetBadge.classList.toggle('subtle', false);
}

function onSavePresetClicked() {
  if (!appState.selectedConfig) {
    window.alert('저장할 프리셋이 없습니다.');
    return;
  }

  const config = sanitizeConfig(readConfigFromInputs());
  const validation = validateConfig(config);
  if (!validation.valid) {
    window.alert(validation.message);
    return;
  }

  const ref = appState.selectedPresetRef;
  if (ref && ref.kind === 'custom') {
    const overwrite = window.confirm('현재 사용자 프리셋을 덮어쓸까요? 취소를 누르면 새 프리셋으로 저장합니다.');
    if (overwrite) {
      overwriteCustomPreset(ref.id, config);
    } else {
      createCustomPreset(config);
    }
    return;
  }

  createCustomPreset(config);
}

function onSaveAsNewClicked() {
  if (!appState.selectedConfig) {
    window.alert('저장할 프리셋이 없습니다.');
    return;
  }
  const config = sanitizeConfig(readConfigFromInputs());
  const validation = validateConfig(config);
  if (!validation.valid) {
    window.alert(validation.message);
    return;
  }
  createCustomPreset(config);
}

function createCustomPreset(config) {
  const preset = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'custom',
    name: config.presetName.trim(),
    config: cloneConfig(config),
  };
  appState.customPresets.unshift(preset);
  appState.lastSelectedPresetRef = { id: preset.id, kind: 'custom' };
  savePresetStorage();
  renderCustomPresets();
  selectPreset(preset, false);
  savePresetStorage();
  updateExportButtonVisibility();
  window.alert('프리셋을 저장했습니다.');
}

function overwriteCustomPreset(id, config) {
  const target = appState.customPresets.find((item) => item.id === id);
  if (!target) {
    createCustomPreset(config);
    return;
  }
  target.name = config.presetName.trim();
  target.config = cloneConfig(config);
  appState.lastSelectedPresetRef = { id: target.id, kind: 'custom' };
  savePresetStorage();
  renderCustomPresets();
  selectPreset(target, false);
  savePresetStorage();
  updateExportButtonVisibility();
  window.alert('프리셋을 덮어썼습니다.');
}

function deleteCustomPreset(id) {
  const target = appState.customPresets.find((item) => item.id === id);
  if (!target) {
    return;
  }
  const ok = window.confirm(`'${target.name}' 프리셋을 삭제할까요?`);
  if (!ok) {
    return;
  }
  appState.customPresets = appState.customPresets.filter((item) => item.id !== id);
  if (appState.lastSelectedPresetRef?.id === id) {
    appState.lastSelectedPresetRef = null;
  }
  if (appState.selectedPresetRef?.id === id) {
    appState.selectedPresetRef = null;
    appState.selectedConfig = null;
  }
  savePresetStorage();
  renderCustomPresets();
  if (!appState.selectedConfig) {
    applyLastSelectedPresetOnBoot();
  }
  updateAllUi();
}

function getPresetByRef(ref) {
  if (!ref) return null;
  if (ref.kind === 'builtin') {
    return BUILTIN_PRESETS.find((item) => item.id === ref.id) || null;
  }
  return appState.customPresets.find((item) => item.id === ref.id) || null;
}

function hasExportablePresetData() {
  return appState.customPresets.length > 0 || Boolean(appState.lastSelectedPresetRef);
}

function buildExportPayload() {
  return {
    version: EXPORT_VERSION,
    customPresets: appState.customPresets,
    lastSelectedPresetRef: appState.lastSelectedPresetRef,
  };
}

async function onExportDataClicked() {
  if (!hasExportablePresetData()) {
    window.alert('복사할 저장 데이터가 없습니다.');
    return;
  }
  const text = JSON.stringify(buildExportPayload());
  el.clipboardTextarea.value = text;
  el.clipboardCard.classList.remove('hidden');
  await copyTextToClipboard(text, false);
}

async function onImportDataClicked() {
  el.clipboardCard.classList.remove('hidden');
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      window.alert('클립보드에 텍스트가 없습니다. 아래 칸에 직접 붙여넣어도 됩니다.');
      return;
    }
    el.clipboardTextarea.value = text;
    importPresetDataFromText(text);
  } catch (error) {
    console.warn('클립보드 읽기에 실패했습니다.', error);
    window.alert('클립보드 읽기 권한이 없거나 브라우저에서 제한되었습니다. 아래 입력칸에 데이터를 직접 붙여넣어 적용해 주세요.');
  }
}

async function copyTextToClipboard(text, showSuccessAlert) {
  try {
    await navigator.clipboard.writeText(text);
    if (showSuccessAlert) {
      window.alert('클립보드에 복사했습니다.');
    }
  } catch (error) {
    console.warn('클립보드 복사에 실패했습니다.', error);
    window.alert('클립보드 복사에 실패했습니다. 아래 텍스트를 직접 복사해 주세요.');
  }
}

function importPresetDataFromText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    window.alert('불러올 저장 데이터가 없습니다.');
    return;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const customPresets = Array.isArray(parsed.customPresets)
      ? parsed.customPresets.map(normalizeCustomPreset).filter(Boolean)
      : [];
    const lastSelectedPresetRef = parsed.lastSelectedPresetRef || null;

    appState.customPresets = dedupePresetIds(customPresets);
    appState.lastSelectedPresetRef = lastSelectedPresetRef;
    savePresetStorage();
    renderCustomPresets();
    applyLastSelectedPresetOnBoot();
    updateAllUi();
    window.alert('저장 데이터를 불러왔습니다.');
  } catch (error) {
    console.error('저장 데이터 불러오기에 실패했습니다.', error);
    window.alert('저장 데이터 형식이 올바르지 않습니다.');
  }
}

function normalizeCustomPreset(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const name = String(raw.name || raw.config?.presetName || '사용자 프리셋').trim();
  const config = sanitizeConfig({
    ...raw.config,
    presetName: raw.config?.presetName || name,
  });
  return {
    id,
    kind: 'custom',
    name,
    config,
  };
}

function dedupePresetIds(items) {
  const seen = new Set();
  return items.map((item) => {
    let nextId = item.id;
    while (seen.has(nextId)) {
      nextId = `${nextId}-${Math.random().toString(36).slice(2, 5)}`;
    }
    seen.add(nextId);
    return { ...item, id: nextId };
  });
}

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  saveSoundPreference();
  updateSoundButtons();
}

function updateSoundButtons() {
  const icon = appState.soundEnabled ? '🔊' : '🔇';
  el.toggleSoundBtn.textContent = icon;
  el.playSoundToggleBtn.textContent = icon;
}

function playSound(name) {
  if (!appState.soundEnabled) return;
  const audio = audioState[name];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function startGameFromSelectedConfig() {
  const config = sanitizeConfig(readConfigFromInputs());
  const validation = validateConfig(config);
  if (!validation.valid) {
    window.alert(validation.message);
    return;
  }

  appState.selectedConfig = config;
  const ref = appState.selectedPresetRef;
  if (ref && ref.kind !== 'temp' && !ref.tempModified) {
    appState.lastSelectedPresetRef = { id: ref.id, kind: ref.kind };
  } else {
    appState.lastSelectedPresetRef = {
      id: 'unsaved-last-played',
      kind: 'custom-temp-last-played',
      configSnapshot: cloneConfig(config),
    };
  }
  savePresetStorage();
  playSound('start');

  appState.currentRun = {
    config,
    stageIndex: 1,
    remainingMoves: config.initialMoves,
    currentColorCount: config.initialColorCount,
    currentBoardSize: config.initialBoardSize,
    board: [],
    emptyCells: new Set(),
    finished: false,
  };

  showPlayScreen();
  setupStageBoard();
}

function showPlayScreen() {
  el.setupScreen.classList.remove('active');
  el.playScreen.classList.add('active');
}

function showSetupScreen() {
  el.playScreen.classList.remove('active');
  el.setupScreen.classList.add('active');
  appState.currentRun = null;
  updateAllUi();
}

function onGiveUpClicked() {
  const ok = window.confirm('현재 플레이를 포기하고 초기 화면으로 돌아갈까요? 진행 중인 플레이 정보는 버려집니다.');
  if (!ok) return;
  showSetupScreen();
}

function setupStageBoard() {
  const run = appState.currentRun;
  if (!run) return;

  const generated = generateBoard(run.currentBoardSize, run.currentColorCount);
  run.board = generated.board;
  run.emptyCells = generated.emptyCells;
  run.finished = false;

  renderGameUi();
}

function generateBoard(size, colorCount) {
  const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const clusterStrength = getClusterStrength(appState.currentRun.stageIndex, appState.currentRun.config.stagesPerPlay);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const neighborCandidates = [];
      if (row > 0) neighborCandidates.push(board[row - 1][col]);
      if (col > 0) neighborCandidates.push(board[row][col - 1]);

      let colorIndex;
      if (neighborCandidates.length && Math.random() < clusterStrength) {
        colorIndex = neighborCandidates[Math.floor(Math.random() * neighborCandidates.length)];
      } else {
        colorIndex = Math.floor(Math.random() * colorCount);
      }
      board[row][col] = colorIndex;
    }
  }

  const innerCells = [];
  for (let row = 1; row < size - 1; row += 1) {
    for (let col = 1; col < size - 1; col += 1) {
      innerCells.push([row, col]);
    }
  }

  const emptySeed = innerCells[Math.floor(Math.random() * innerCells.length)];
  const emptyCells = floodFromSeed(board, emptySeed[0], emptySeed[1], board[emptySeed[0]][emptySeed[1]]);
  emptyCells.forEach((key) => {
    const [row, col] = key.split(',').map(Number);
    board[row][col] = EMPTY_CELL;
  });

  return { board, emptyCells };
}

function getClusterStrength(stageIndex, totalStages) {
  if (totalStages <= 1) return 0.52;
  const progress = (stageIndex - 1) / (totalStages - 1);
  return 0.58 - progress * 0.28;
}

function renderGameUi() {
  const run = appState.currentRun;
  if (!run) return;

  el.moveCounter.textContent = `선택 횟수: ${run.remainingMoves}`;
  el.stageIndicator.textContent = `Stage ${run.stageIndex}`;
  el.boardInfo.textContent = `${run.currentBoardSize}x${run.currentBoardSize} · ${run.currentColorCount}색`;
  el.boardStatus.textContent = `${run.config.presetName} · 빈 영역을 넓혀 보드를 모두 비우세요.`;

  renderBoard();
  renderColorToolbar();
}

function renderBoard() {
  const run = appState.currentRun;
  if (!run) return;

  el.board.innerHTML = '';
  el.board.style.gridTemplateColumns = `repeat(${run.currentBoardSize}, 1fr)`;
  el.board.style.gridTemplateRows = `repeat(${run.currentBoardSize}, 1fr)`;

  for (let row = 0; row < run.currentBoardSize; row += 1) {
    for (let col = 0; col < run.currentBoardSize; col += 1) {
      const cellValue = run.board[row][col];
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (cellValue === EMPTY_CELL) {
        cell.classList.add('empty');
      } else {
        cell.style.backgroundColor = getPaletteColor(cellValue);
      }
      el.board.appendChild(cell);
    }
  }
}

function renderColorToolbar() {
  const run = appState.currentRun;
  if (!run) return;
  el.colorToolbar.innerHTML = '';

  const available = getAvailableAdjacentColors(run.board, run.emptyCells);
  for (let colorIndex = 0; colorIndex < run.currentColorCount; colorIndex += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-btn';
    button.style.backgroundColor = getPaletteColor(colorIndex);
    button.title = `색상 ${colorIndex + 1}`;

    const usable = available.has(colorIndex);
    button.classList.toggle('disabled-color', !usable);
    button.addEventListener('click', () => selectColor(colorIndex));
    el.colorToolbar.appendChild(button);
  }
}

function selectColor(colorIndex) {
  const run = appState.currentRun;
  if (!run || run.finished) return;
  if (run.remainingMoves <= 0) return;

  const expansion = expandEmptyAreaByColor(run.board, run.emptyCells, colorIndex);
  if (expansion === 0) {
    return;
  }

  playSound('colorPick');
  run.remainingMoves -= 1;
  renderGameUi();

  if (isBoardCleared(run.board)) {
    onStageCleared();
    return;
  }

  if (run.remainingMoves <= 0) {
    onStageFailed();
  }
}

function expandEmptyAreaByColor(board, emptyCells, colorIndex) {
  const queue = [];
  const collected = new Set();
  const seen = new Set();

  emptyCells.forEach((key) => {
    const [row, col] = key.split(',').map(Number);
    queue.push([row, col]);
    seen.add(key);
  });

  while (queue.length) {
    const [row, col] = queue.shift();
    for (const [nextRow, nextCol] of getNeighborCoords(row, col, board.length)) {
      const key = `${nextRow},${nextCol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (board[nextRow][nextCol] === colorIndex) {
        collected.add(key);
        queue.push([nextRow, nextCol]);
      }
    }
  }

  collected.forEach((key) => {
    const [row, col] = key.split(',').map(Number);
    board[row][col] = EMPTY_CELL;
    emptyCells.add(key);
  });

  return collected.size;
}

function getAvailableAdjacentColors(board, emptyCells) {
  const available = new Set();
  emptyCells.forEach((key) => {
    const [row, col] = key.split(',').map(Number);
    for (const [nextRow, nextCol] of getNeighborCoords(row, col, board.length)) {
      const value = board[nextRow][nextCol];
      if (value !== EMPTY_CELL) {
        available.add(value);
      }
    }
  });
  return available;
}

function isBoardCleared(board) {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col] !== EMPTY_CELL) return false;
    }
  }
  return true;
}

function onStageCleared() {
  const run = appState.currentRun;
  if (!run) return;
  run.finished = true;
  playSound('success');

  if (run.stageIndex >= run.config.stagesPerPlay) {
    showOverlay(
      '클리어 성공',
      `모든 스테이지를 클리어했습니다. '${run.config.presetName}' 플레이가 종료되었습니다. 화면을 눌러 초기 화면으로 돌아갑니다.`,
      '초기 화면으로',
      () => {
        showSetupScreen();
      }
    );
    return;
  }

  const nextStageIndex = run.stageIndex + 1;
  const nextColorCount = computeStageColorCount(run.config, nextStageIndex);
  const nextBoardSize = computeStageBoardSize(run.config, nextStageIndex);
  const boardGrew = nextBoardSize > run.currentBoardSize;
  const nextMoves = run.remainingMoves + run.config.stageClearMoveBonus + (boardGrew ? run.config.boardGrowMoveBonus : 0);

  showOverlay(
    '스테이지 클리어',
    `다음 스테이지로 이동합니다.\nStage ${nextStageIndex} · ${nextBoardSize}x${nextBoardSize} · ${nextColorCount}색\n선택 횟수 +${run.config.stageClearMoveBonus}${boardGrew && run.config.boardGrowMoveBonus ? `, 보드 확장 보너스 +${run.config.boardGrowMoveBonus}` : ''}`,
    '다음 스테이지',
    () => {
      run.stageIndex = nextStageIndex;
      run.currentColorCount = nextColorCount;
      run.currentBoardSize = nextBoardSize;
      run.remainingMoves = nextMoves;
      setupStageBoard();
    }
  );
}

function onStageFailed() {
  const run = appState.currentRun;
  if (!run) return;
  run.finished = true;
  playSound('fail');
  showOverlay(
    '게임 오버',
    `선택 횟수를 모두 사용했습니다. '${run.config.presetName}' 플레이를 종료하고 초기 화면으로 돌아갑니다.`,
    '초기 화면으로',
    () => {
      showSetupScreen();
    }
  );
}

function computeStageColorCount(config, stageIndex) {
  const stepCount = Math.floor((stageIndex - 1) / config.colorIncreaseEvery);
  return Math.min(config.maxColorCount, config.initialColorCount + stepCount * config.colorIncreaseAmount);
}

function computeStageBoardSize(config, stageIndex) {
  const stepCount = Math.floor((stageIndex - 1) / config.boardIncreaseEvery);
  return Math.min(config.maxBoardSize, config.initialBoardSize + stepCount * config.boardIncreaseAmount);
}

function showOverlay(title, message, buttonText, handler) {
  el.overlayTitle.textContent = title;
  el.overlayMessage.innerHTML = escapeHtml(message).replace(/\n/g, '<br />');
  el.overlayActionBtn.textContent = buttonText;
  appState.overlayHandler = handler;
  el.overlay.classList.remove('hidden');
}

function hideOverlay() {
  el.overlay.classList.add('hidden');
}

function floodFromSeed(board, startRow, startCol, colorIndex) {
  const visited = new Set();
  const queue = [[startRow, startCol]];
  while (queue.length) {
    const [row, col] = queue.shift();
    const key = `${row},${col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [nextRow, nextCol] of getNeighborCoords(row, col, board.length)) {
      if (board[nextRow][nextCol] !== colorIndex) continue;
      const nextKey = `${nextRow},${nextCol}`;
      if (!visited.has(nextKey)) queue.push([nextRow, nextCol]);
    }
  }
  return visited;
}

function getNeighborCoords(row, col, size) {
  const coords = [];
  if (row > 0) coords.push([row - 1, col]);
  if (row < size - 1) coords.push([row + 1, col]);
  if (col > 0) coords.push([row, col - 1]);
  if (col < size - 1) coords.push([row, col + 1]);
  return coords;
}

function getPaletteColor(index) {
  return PALETTE[index % PALETTE.length];
}

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

function clampInt(value, min, max, fallback) {
  const number = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, number));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

init();
