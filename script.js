(() => {
  const LOCAL_PRESET_KEY = 'colorSweeper.presetData.v2';
  const LOCAL_RUN_KEY = 'colorSweeper.activeRun.v2';
  const SOUND_PREF_KEY = 'colorSweeper.soundEnabled.v2';
  const EXPORT_VERSION = 2;
  const EMPTY_CELL = -1;
  const MAX_FALLBACK_BOARD_SIZE = 30;

  const rawConfig = window.COLOR_SWEEPER_CONFIG || {};
  const PALETTE = Array.isArray(rawConfig.distinguishableColors) && rawConfig.distinguishableColors.length
    ? rawConfig.distinguishableColors.slice()
    : ['#FF0000', '#00C853', '#2962FF', '#AA00FF', '#FF7F00', '#FFFF00'];

  const BUILTIN_PRESETS = (Array.isArray(rawConfig.builtinPresets) ? rawConfig.builtinPresets : []).map((preset) => ({
    id: String(preset.id),
    kind: 'builtin',
    name: String(preset.name),
    config: sanitizeConfig({ ...preset.config, presetName: preset.name }),
  }));

  const el = {
    setupScreen: document.getElementById('setup-screen'),
    playScreen: document.getElementById('play-screen'),
    builtinPresetList: document.getElementById('builtin-preset-list'),
    selectedPresetBadge: document.getElementById('selected-preset-badge'),
    customPresetEmpty: document.getElementById('custom-preset-empty'),
    customPresetList: document.getElementById('custom-preset-list'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    clipboardCard: document.getElementById('clipboard-card'),
    clipboardTextarea: document.getElementById('clipboard-textarea'),
    closeClipboardBtn: document.getElementById('close-clipboard-btn'),
    copyTextareaBtn: document.getElementById('copy-textarea-btn'),
    applyTextareaBtn: document.getElementById('apply-textarea-btn'),
    toggleDetailsBtn: document.getElementById('toggle-details-btn'),
    detailsPanel: document.getElementById('details-panel'),
    configSummary: document.getElementById('config-summary'),
    presetNameInput: document.getElementById('preset-name-input'),
    subStagesPerStageInput: document.getElementById('sub-stages-per-stage-input'),
    initialColorCountInput: document.getElementById('initial-color-count-input'),
    initialBoardSizeInput: document.getElementById('initial-board-size-input'),
    colorIncreaseEveryInput: document.getElementById('color-increase-every-input'),
    colorIncreaseAmountInput: document.getElementById('color-increase-amount-input'),
    boardIncreaseEveryInput: document.getElementById('board-increase-every-input'),
    boardIncreaseAmountInput: document.getElementById('board-increase-amount-input'),
    maxColorCountInput: document.getElementById('max-color-count-input'),
    maxBoardSizeInput: document.getElementById('max-board-size-input'),
    initialMovesInput: document.getElementById('initial-moves-input'),
    savePresetBtn: document.getElementById('save-preset-btn'),
    saveAsNewBtn: document.getElementById('save-as-new-btn'),
    startGameBtn: document.getElementById('start-game-btn'),
    toggleSoundBtn: document.getElementById('toggle-sound-btn'),
    giveUpBtn: document.getElementById('give-up-btn'),
    playSoundToggleBtn: document.getElementById('play-sound-toggle-btn'),
    boardViewport: document.getElementById('board-viewport'),
    boardCanvas: document.getElementById('board-canvas'),
    board: document.getElementById('board'),
    boardInfo: document.getElementById('board-info'),
    boardStatus: document.getElementById('board-status'),
    colorToolbar: document.getElementById('color-toolbar'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlay-title'),
    overlayMessage: document.getElementById('overlay-message'),
    overlayActionBtn: document.getElementById('overlay-action-btn'),
  };

  const appState = {
    customPresets: [],
    selectedPresetRef: null,
    selectedConfig: null,
    lastSelectedPresetRef: null,
    detailsOpen: false,
    currentRun: null,
    overlayHandler: null,
    soundEnabled: true,
    boardView: { scale: 1, x: 0, y: 0 },
    gesture: null,
  };

  const audioMap = {
    start: createAudio('./assets/audio/ui_click.mp3'),
    colorPick: createAudio('./assets/audio/color_pick.mp3'),
    success: createAudio('./assets/audio/success.mp3'),
    fail: createAudio('./assets/audio/fail.mp3'),
  };

  init();

  function init() {
    loadPresetStorage();
    loadSoundPreference();
    renderBuiltinPresets();
    renderCustomPresets();
    bindEvents();
    const restoredRun = restoreActiveRunOnBoot();
    if (!restoredRun) {
      applyLastSelectedPresetOnBoot();
      updateAllUi();
    }
    window.addEventListener('resize', () => {
      if (appState.currentRun && el.playScreen.classList.contains('active')) {
        requestAnimationFrame(fitBoardToViewport);
      }
    });
  }

  function bindEvents() {
    const configInputs = [
      el.presetNameInput,
      el.subStagesPerStageInput,
      el.initialColorCountInput,
      el.initialBoardSizeInput,
      el.colorIncreaseEveryInput,
      el.colorIncreaseAmountInput,
      el.boardIncreaseEveryInput,
      el.boardIncreaseAmountInput,
      el.maxColorCountInput,
      el.maxBoardSizeInput,
      el.initialMovesInput,
    ];
    configInputs.forEach((node) => node.addEventListener('input', onConfigInputChanged));

    el.toggleDetailsBtn.addEventListener('click', () => {
      appState.detailsOpen = !appState.detailsOpen;
      updateDetailsVisibility();
    });
    el.savePresetBtn.addEventListener('click', onSavePresetClicked);
    el.saveAsNewBtn.addEventListener('click', () => saveSelectedConfigAsNew(true));
    el.startGameBtn.addEventListener('click', startGameFromSelectedConfig);
    el.exportBtn.addEventListener('click', onExportDataClicked);
    el.importBtn.addEventListener('click', onImportDataClicked);
    el.closeClipboardBtn.addEventListener('click', () => el.clipboardCard.classList.add('hidden'));
    el.copyTextareaBtn.addEventListener('click', async () => {
      const text = el.clipboardTextarea.value.trim();
      if (!text) return window.alert('복사할 데이터가 없습니다.');
      await copyTextToClipboard(text, true);
    });
    el.applyTextareaBtn.addEventListener('click', () => importPresetDataFromText(el.clipboardTextarea.value));
    el.toggleSoundBtn.addEventListener('click', toggleSound);
    el.playSoundToggleBtn.addEventListener('click', toggleSound);
    el.giveUpBtn.addEventListener('click', onGiveUpClicked);
    el.overlayActionBtn.addEventListener('click', () => {
      hideOverlay();
      const fn = appState.overlayHandler;
      appState.overlayHandler = null;
      if (typeof fn === 'function') fn();
    });

    bindBoardViewportEvents();
  }

  function bindBoardViewportEvents() {
    let mousePan = null;

    el.boardViewport.addEventListener('wheel', (event) => {
      event.preventDefault();
      const rect = el.boardViewport.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const next = clamp(round2(appState.boardView.scale * (event.deltaY < 0 ? 1.08 : 0.92)), 0.4, 3.6);
      zoomAt(next, px, py);
    }, { passive: false });

    el.boardViewport.addEventListener('mousedown', (event) => {
      mousePan = { x: event.clientX, y: event.clientY, startX: appState.boardView.x, startY: appState.boardView.y };
    });
    window.addEventListener('mousemove', (event) => {
      if (!mousePan) return;
      appState.boardView.x = mousePan.startX + (event.clientX - mousePan.x);
      appState.boardView.y = mousePan.startY + (event.clientY - mousePan.y);
      applyBoardTransform();
    });
    window.addEventListener('mouseup', () => { mousePan = null; });

    el.boardViewport.addEventListener('touchstart', onTouchStart, { passive: false });
    el.boardViewport.addEventListener('touchmove', onTouchMove, { passive: false });
    el.boardViewport.addEventListener('touchend', onTouchEnd, { passive: false });
    el.boardViewport.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  function onTouchStart(event) {
    if (!appState.currentRun) return;
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      appState.gesture = {
        type: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        baseX: appState.boardView.x,
        baseY: appState.boardView.y,
      };
    } else if (event.touches.length === 2) {
      const [a, b] = event.touches;
      appState.gesture = {
        type: 'pinch',
        baseScale: appState.boardView.scale,
        baseX: appState.boardView.x,
        baseY: appState.boardView.y,
        startDistance: distance(a, b),
        startMid: midpoint(a, b),
      };
    }
  }

  function onTouchMove(event) {
    if (!appState.gesture) return;
    event.preventDefault();
    if (appState.gesture.type === 'pan' && event.touches.length === 1) {
      const touch = event.touches[0];
      appState.boardView.x = appState.gesture.baseX + (touch.clientX - appState.gesture.startX);
      appState.boardView.y = appState.gesture.baseY + (touch.clientY - appState.gesture.startY);
      applyBoardTransform();
      return;
    }
    if (event.touches.length === 2) {
      const [a, b] = event.touches;
      const mid = midpoint(a, b);
      const ratio = distance(a, b) / Math.max(1, appState.gesture.startDistance);
      const nextScale = clamp(round2(appState.gesture.baseScale * ratio), 0.4, 3.6);
      const rect = el.boardViewport.getBoundingClientRect();
      zoomAt(nextScale, mid.x - rect.left, mid.y - rect.top, appState.gesture.baseX, appState.gesture.baseY, appState.gesture.baseScale, appState.gesture.startMid);
      const deltaMidX = mid.x - appState.gesture.startMid.x;
      const deltaMidY = mid.y - appState.gesture.startMid.y;
      appState.boardView.x += deltaMidX;
      appState.boardView.y += deltaMidY;
      appState.gesture.startMid = mid;
      appState.gesture.baseX = appState.boardView.x;
      appState.gesture.baseY = appState.boardView.y;
      appState.gesture.baseScale = appState.boardView.scale;
      appState.gesture.startDistance = distance(a, b);
      applyBoardTransform();
    }
  }

  function onTouchEnd(event) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      appState.gesture = {
        type: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        baseX: appState.boardView.x,
        baseY: appState.boardView.y,
      };
      return;
    }
    if (event.touches.length === 0) {
      appState.gesture = null;
    }
  }

  function distance(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  function midpoint(a, b) {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }

  function zoomAt(nextScale, pivotX, pivotY, baseX = appState.boardView.x, baseY = appState.boardView.y, baseScale = appState.boardView.scale) {
    const worldX = (pivotX - baseX) / baseScale;
    const worldY = (pivotY - baseY) / baseScale;
    appState.boardView.scale = nextScale;
    appState.boardView.x = pivotX - worldX * nextScale;
    appState.boardView.y = pivotY - worldY * nextScale;
    applyBoardTransform();
  }

  function onConfigInputChanged() {
    const config = sanitizeConfig(readConfigFromInputs());
    appState.selectedConfig = config;
    if (appState.selectedPresetRef) {
      appState.selectedPresetRef = { ...appState.selectedPresetRef, tempModified: true };
    } else {
      appState.selectedPresetRef = { id: `temp-${Date.now()}`, kind: 'temp', name: config.presetName || '임시 설정', tempModified: true };
    }
    updateAllUi();
  }

  function loadPresetStorage() {
    try {
      const raw = localStorage.getItem(LOCAL_PRESET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      appState.customPresets = Array.isArray(parsed.customPresets) ? parsed.customPresets.map(normalizeCustomPreset).filter(Boolean) : [];
      appState.lastSelectedPresetRef = parsed.lastSelectedPresetRef || null;
    } catch (error) {
      console.warn('프리셋 저장 데이터를 읽지 못했습니다.', error);
      appState.customPresets = [];
      appState.lastSelectedPresetRef = null;
    }
  }

  function savePresetStorage() {
    const payload = { version: EXPORT_VERSION, customPresets: appState.customPresets, lastSelectedPresetRef: appState.lastSelectedPresetRef };
    localStorage.setItem(LOCAL_PRESET_KEY, JSON.stringify(payload));
  }

  function loadSoundPreference() {
    try {
      const raw = localStorage.getItem(SOUND_PREF_KEY);
      appState.soundEnabled = raw === null ? true : raw === '1';
    } catch {
      appState.soundEnabled = true;
    }
  }

  function saveSoundPreference() {
    try {
      localStorage.setItem(SOUND_PREF_KEY, appState.soundEnabled ? '1' : '0');
    } catch {}
  }

  function restoreActiveRunOnBoot() {
    try {
      const raw = localStorage.getItem(LOCAL_RUN_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const run = deserializeRun(parsed.run);
      if (!run) {
        clearRunStorage();
        return false;
      }
      appState.currentRun = run;
      appState.selectedConfig = cloneConfig(run.config);
      appState.selectedPresetRef = { id: 'active-run', kind: 'temp', name: run.config.presetName || '진행 중인 플레이', tempModified: true };
      writeConfigToInputs(appState.selectedConfig);
      showPlayScreen();
      renderGameUi();
      requestAnimationFrame(fitBoardToViewport);
      return true;
    } catch (error) {
      console.warn('진행 중인 플레이를 복원하지 못했습니다.', error);
      clearRunStorage();
      return false;
    }
  }

  function saveRunStorage() {
    try {
      if (!appState.currentRun) {
        localStorage.removeItem(LOCAL_RUN_KEY);
        return;
      }
      localStorage.setItem(LOCAL_RUN_KEY, JSON.stringify({ version: EXPORT_VERSION, run: serializeRun(appState.currentRun) }));
    } catch (error) {
      console.warn('진행 중인 플레이 저장에 실패했습니다.', error);
    }
  }

  function clearRunStorage() {
    try { localStorage.removeItem(LOCAL_RUN_KEY); } catch {}
  }

  function applyLastSelectedPresetOnBoot() {
    let target = null;
    if (appState.lastSelectedPresetRef) {
      target = getPresetByRef(appState.lastSelectedPresetRef);
    }
    if (!target && appState.lastSelectedPresetRef?.kind === 'custom-temp-last-played' && appState.lastSelectedPresetRef.configSnapshot) {
      const config = sanitizeConfig(appState.lastSelectedPresetRef.configSnapshot);
      appState.selectedPresetRef = { id: 'unsaved-last-played', kind: 'temp', name: config.presetName || '마지막 플레이 설정', tempModified: true };
      appState.selectedConfig = config;
      writeConfigToInputs(config);
      return;
    }
    if (!target) target = BUILTIN_PRESETS[0] || null;
    if (target) selectPreset(target, false);
  }

  function updateAllUi() {
    renderCustomPresets();
    updateSelectedBadges();
    updateDetailsVisibility();
    updateSummary();
    updateStartButtonState();
    updateExportButtonVisibility();
    updateSoundButtons();
  }

  function renderBuiltinPresets() {
    el.builtinPresetList.innerHTML = '';
    BUILTIN_PRESETS.forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'preset-btn';
      button.dataset.presetId = preset.id;
      button.innerHTML = `<strong>${escapeHtml(preset.name)}</strong><small>${preset.config.initialBoardSize}x${preset.config.initialBoardSize} · ${preset.config.initialColorCount}색 시작</small>`;
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
      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'custom-preset-main';
      main.innerHTML = `<strong>${escapeHtml(preset.name)}</strong><small>${preset.config.initialBoardSize}x${preset.config.initialBoardSize} · ${preset.config.initialColorCount}색 시작 · ${preset.config.subStagesPerStage}회/스테이지</small>`;
      main.addEventListener('click', () => selectPreset(preset, true));
      const actions = document.createElement('div');
      actions.className = 'custom-preset-actions';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'secondary-btn';
      del.textContent = '삭제';
      del.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteCustomPreset(preset.id);
      });
      actions.appendChild(del);
      li.appendChild(main);
      li.appendChild(actions);
      el.customPresetList.appendChild(li);
    });
  }

  function selectPreset(preset, rememberSelection) {
    appState.selectedPresetRef = { id: preset.id, kind: preset.kind || 'custom', name: preset.name, tempModified: false };
    appState.selectedConfig = cloneConfig({ ...preset.config, presetName: preset.name });
    writeConfigToInputs(appState.selectedConfig);
    if (rememberSelection) {
      appState.lastSelectedPresetRef = { id: preset.id, kind: preset.kind || 'custom' };
      savePresetStorage();
    }
    updateAllUi();
  }

  function updateSelectedBadges() {
    const selected = appState.selectedPresetRef;
    el.selectedPresetBadge.textContent = selected ? selected.name || '선택됨' : '선택 없음';

    [...el.builtinPresetList.children].forEach((node) => {
      node.classList.toggle('active', !!selected && selected.kind === 'builtin' && node.dataset.presetId === selected.id && !selected.tempModified);
    });
    [...el.customPresetList.children].forEach((node) => {
      node.classList.toggle('active', !!selected && selected.kind === 'custom' && node.dataset.presetId === selected.id && !selected.tempModified);
    });
  }

  function updateDetailsVisibility() {
    el.detailsPanel.classList.toggle('hidden', !appState.detailsOpen);
    el.toggleDetailsBtn.textContent = appState.detailsOpen ? '세부 설정 접기' : '세부 설정 펼치기';
  }

  function updateSummary() {
    if (!appState.selectedConfig) {
      el.configSummary.textContent = '프리셋을 선택하면 요약이 표시됩니다.';
      el.configSummary.classList.add('muted');
      return;
    }
    const c = appState.selectedConfig;
    el.configSummary.classList.remove('muted');
    const maxColor = c.maxColorCount == null ? '제한 없음' : `${c.maxColorCount}색`;
    const maxBoard = c.maxBoardSize == null ? '제한 없음' : `${c.maxBoardSize}x${c.maxBoardSize}`;
    el.configSummary.innerHTML = [
      `<strong>${escapeHtml(c.presetName || '이름 없는 설정')}</strong>`,
      `메인 스테이지당 플레이 횟수: ${c.subStagesPerStage}`,
      `초기: ${c.initialBoardSize}x${c.initialBoardSize} · ${c.initialColorCount}색`,
      `색상 증가: 메인 스테이지 ${c.colorIncreaseEveryStages}회마다 +${c.colorIncreaseAmount}`,
      `보드 칸 수 증가: 메인 스테이지 ${c.boardIncreaseEveryStages}회마다 +${c.boardIncreaseAmount}`,
      `최대 색상 수: ${maxColor} · 최대 칸 수: ${maxBoard}`,
      `여유 선택 횟수 값: ${c.initialMoves}`,
    ].join('<br>');
  }

  function updateStartButtonState() {
    const valid = !!appState.selectedConfig && validateConfig(appState.selectedConfig).valid;
    el.startGameBtn.disabled = !valid;
  }

  function updateExportButtonVisibility() {
    const hasAny = appState.customPresets.length > 0 || !!appState.lastSelectedPresetRef;
    el.exportBtn.classList.toggle('hidden', !hasAny);
  }

  function updateSoundButtons() {
    const icon = appState.soundEnabled ? '🔊' : '🔇';
    el.toggleSoundBtn.textContent = icon;
    el.playSoundToggleBtn.textContent = icon;
  }

  function writeConfigToInputs(config) {
    el.presetNameInput.value = config.presetName || '';
    el.subStagesPerStageInput.value = config.subStagesPerStage;
    el.initialColorCountInput.value = config.initialColorCount;
    el.initialBoardSizeInput.value = config.initialBoardSize;
    el.colorIncreaseEveryInput.value = config.colorIncreaseEveryStages;
    el.colorIncreaseAmountInput.value = config.colorIncreaseAmount;
    el.boardIncreaseEveryInput.value = config.boardIncreaseEveryStages;
    el.boardIncreaseAmountInput.value = config.boardIncreaseAmount;
    el.maxColorCountInput.value = config.maxColorCount == null ? '' : config.maxColorCount;
    el.maxBoardSizeInput.value = config.maxBoardSize == null ? '' : config.maxBoardSize;
    el.initialMovesInput.value = config.initialMoves;
  }

  function readConfigFromInputs() {
    return {
      presetName: el.presetNameInput.value.trim(),
      subStagesPerStage: toNumber(el.subStagesPerStageInput.value),
      initialColorCount: toNumber(el.initialColorCountInput.value),
      initialBoardSize: toNumber(el.initialBoardSizeInput.value),
      colorIncreaseEveryStages: toNumber(el.colorIncreaseEveryInput.value),
      colorIncreaseAmount: toNumber(el.colorIncreaseAmountInput.value),
      boardIncreaseEveryStages: toNumber(el.boardIncreaseEveryInput.value),
      boardIncreaseAmount: toNumber(el.boardIncreaseAmountInput.value),
      maxColorCount: toOptionalNumber(el.maxColorCountInput.value),
      maxBoardSize: toOptionalNumber(el.maxBoardSizeInput.value),
      initialMoves: toNumber(el.initialMovesInput.value),
    };
  }

  function sanitizeConfig(raw) {
    const paletteMax = PALETTE.length;
    const initialColorCount = clampInt(raw.initialColorCount, 2, paletteMax, 3);
    const initialBoardSize = clampInt(raw.initialBoardSize, 3, MAX_FALLBACK_BOARD_SIZE, 5);
    let maxColorCount = raw.maxColorCount == null ? null : clampInt(raw.maxColorCount, 2, paletteMax, paletteMax);
    let maxBoardSize = raw.maxBoardSize == null ? null : clampInt(raw.maxBoardSize, 3, MAX_FALLBACK_BOARD_SIZE, MAX_FALLBACK_BOARD_SIZE);
    if (maxColorCount != null && maxColorCount < initialColorCount) maxColorCount = initialColorCount;
    if (maxBoardSize != null && maxBoardSize < initialBoardSize) maxBoardSize = initialBoardSize;
    return {
      presetName: String(raw.presetName || '').trim(),
      subStagesPerStage: clampInt(raw.subStagesPerStage, 1, 99, 7),
      initialColorCount,
      initialBoardSize,
      colorIncreaseEveryStages: clampInt(raw.colorIncreaseEveryStages, 1, 99, 1),
      colorIncreaseAmount: clampInt(raw.colorIncreaseAmount, 0, paletteMax, 1),
      boardIncreaseEveryStages: clampInt(raw.boardIncreaseEveryStages, 1, 99, 3),
      boardIncreaseAmount: clampInt(raw.boardIncreaseAmount, 0, 10, 1),
      maxColorCount,
      maxBoardSize,
      initialMoves: clampInt(raw.initialMoves ?? raw.extraMoveBuffer, 0, 999, 10),
    };
  }

  function validateConfig(config) {
    if (!config.presetName) return { valid: false, message: '프리셋 이름을 입력해 주세요.' };
    if (config.initialColorCount > PALETTE.length) return { valid: false, message: '초기 색상 수가 팔레트 개수를 초과합니다.' };
    return { valid: true };
  }

  function onSavePresetClicked() {
    if (!appState.selectedConfig) return;
    const validation = validateConfig(appState.selectedConfig);
    if (!validation.valid) return window.alert(validation.message);

    const selected = appState.selectedPresetRef;
    if (selected && selected.kind === 'custom' && selected.id) {
      const ok = window.confirm('현재 사용자 프리셋에 덮어쓸까요? 취소하면 새 프리셋으로 저장되지 않습니다.');
      if (!ok) return;
      const index = appState.customPresets.findIndex((item) => item.id === selected.id);
      if (index >= 0) {
        appState.customPresets[index] = createCustomPreset(selected.id, appState.selectedConfig.presetName, appState.selectedConfig);
        appState.selectedPresetRef = { id: selected.id, kind: 'custom', name: appState.selectedConfig.presetName, tempModified: false };
        appState.lastSelectedPresetRef = { id: selected.id, kind: 'custom' };
        savePresetStorage();
        updateAllUi();
      }
      return;
    }
    saveSelectedConfigAsNew(false);
  }

  function saveSelectedConfigAsNew(showMessage) {
    if (!appState.selectedConfig) return;
    const validation = validateConfig(appState.selectedConfig);
    if (!validation.valid) return window.alert(validation.message);
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const preset = createCustomPreset(id, appState.selectedConfig.presetName, appState.selectedConfig);
    appState.customPresets.push(preset);
    appState.selectedPresetRef = { id, kind: 'custom', name: preset.name, tempModified: false };
    appState.lastSelectedPresetRef = { id, kind: 'custom' };
    savePresetStorage();
    updateAllUi();
    if (showMessage) window.alert('새 프리셋으로 저장했습니다.');
  }

  function createCustomPreset(id, name, config) {
    return { id, kind: 'custom', name, config: cloneConfig({ ...config, presetName: name }) };
  }

  function deleteCustomPreset(id) {
    const preset = appState.customPresets.find((item) => item.id === id);
    if (!preset) return;
    const ok = window.confirm(`'${preset.name}' 프리셋을 삭제할까요?`);
    if (!ok) return;
    appState.customPresets = appState.customPresets.filter((item) => item.id !== id);
    if (appState.selectedPresetRef?.kind === 'custom' && appState.selectedPresetRef.id === id) {
      appState.selectedPresetRef = null;
      appState.selectedConfig = null;
    }
    if (appState.lastSelectedPresetRef?.kind === 'custom' && appState.lastSelectedPresetRef.id === id) {
      appState.lastSelectedPresetRef = null;
    }
    savePresetStorage();
    updateAllUi();
  }

  function normalizeCustomPreset(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '');
    const name = String(raw.name || '').trim();
    if (!id || !name) return null;
    return { id, kind: 'custom', name, config: sanitizeConfig({ ...(raw.config || {}), presetName: name }) };
  }

  function getPresetByRef(ref) {
    if (!ref) return null;
    if (ref.kind === 'builtin') return BUILTIN_PRESETS.find((item) => item.id === ref.id) || null;
    if (ref.kind === 'custom') return appState.customPresets.find((item) => item.id === ref.id) || null;
    return null;
  }

  async function onExportDataClicked() {
    const payload = {
      version: EXPORT_VERSION,
      customPresets: appState.customPresets,
      lastSelectedPresetRef: appState.lastSelectedPresetRef,
    };
    const text = toExportText(payload);
    el.clipboardTextarea.value = text;
    el.clipboardCard.classList.remove('hidden');
    await copyTextToClipboard(text, false);
  }

  async function onImportDataClicked() {
    el.clipboardCard.classList.remove('hidden');
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        el.clipboardTextarea.value = text;
      }
    } catch {
      el.clipboardTextarea.focus();
    }
  }

  function importPresetDataFromText(text) {
    try {
      const parsed = fromExportText(text);
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
      appState.customPresets = Array.isArray(parsed.customPresets) ? parsed.customPresets.map(normalizeCustomPreset).filter(Boolean) : [];
      appState.lastSelectedPresetRef = parsed.lastSelectedPresetRef || null;
      savePresetStorage();
      applyLastSelectedPresetOnBoot();
      updateAllUi();
      window.alert('저장 데이터를 불러왔습니다.');
    } catch {
      window.alert('붙여넣은 저장 데이터를 읽지 못했습니다.');
    }
  }

  async function copyTextToClipboard(text, showDoneAlert) {
    try {
      await navigator.clipboard.writeText(text);
      if (showDoneAlert) window.alert('클립보드에 복사했습니다.');
    } catch {
      if (showDoneAlert) window.alert('클립보드 복사에 실패했습니다. 표시된 텍스트를 직접 복사해 주세요.');
    }
  }

  function toggleSound() {
    appState.soundEnabled = !appState.soundEnabled;
    saveSoundPreference();
    updateSoundButtons();
  }

  function createAudio(path) {
    const audio = new Audio(path);
    audio.preload = 'none';
    return audio;
  }

  function playSound(type) {
    if (!appState.soundEnabled) return;
    const audio = audioMap[type];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function startGameFromSelectedConfig() {
    const config = sanitizeConfig(readConfigFromInputs());
    const validation = validateConfig(config);
    if (!validation.valid) return window.alert(validation.message);
    appState.selectedConfig = config;

    const ref = appState.selectedPresetRef;
    if (ref && ref.kind !== 'temp' && !ref.tempModified) {
      appState.lastSelectedPresetRef = { id: ref.id, kind: ref.kind };
    } else {
      appState.lastSelectedPresetRef = { id: 'unsaved-last-played', kind: 'custom-temp-last-played', configSnapshot: cloneConfig(config) };
    }
    savePresetStorage();
    playSound('start');

    appState.currentRun = {
      config,
      mainStage: 1,
      subStage: 1,
      remainingMoves: 0,
      carriedMoves: 0,
      currentColorCount: config.initialColorCount,
      currentBoardSize: config.initialBoardSize,
      board: [],
      emptyCells: new Set(),
      finished: false,
      boardBaseMoves: 0,
    };
    showPlayScreen();
    setupCurrentBoard({ resetMoves: true, isFirstStage: true });
    saveRunStorage();
  }

  function showPlayScreen() {
    el.setupScreen.classList.remove('active');
    el.playScreen.classList.add('active');
  }

  function showSetupScreen(clearRun = true) {
    el.playScreen.classList.remove('active');
    el.setupScreen.classList.add('active');
    appState.currentRun = null;
    if (clearRun) clearRunStorage();
    updateAllUi();
  }

  function onGiveUpClicked() {
    const ok = window.confirm('현재 진행 중인 플레이를 포기하고 초기 화면으로 돌아갈까요?');
    if (!ok) return;
    showSetupScreen(true);
  }

  function setupCurrentBoard(options = {}) {
    const run = appState.currentRun;
    if (!run) return;
    const generated = generateBoard(run.currentBoardSize, run.currentColorCount);
    run.board = generated.board;
    run.emptyCells = generated.emptyCells;
    run.finished = false;
    run.boardBaseMoves = estimateBoardMoves(run.board, run.emptyCells, run.currentColorCount);
    if (options.resetMoves) {
      if (options.isFirstStage) {
        run.remainingMoves = run.boardBaseMoves + getStageMoveBuffer(run.config);
      } else {
        run.remainingMoves = run.boardBaseMoves + Math.max(0, run.carriedMoves || 0);
      }
    }
    renderGameUi();
    requestAnimationFrame(fitBoardToViewport);
    saveRunStorage();
  }

  function generateBoard(size, colorCount) {
    const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
    const clusterStrength = getClusterStrength(appState.currentRun.mainStage, colorCount);
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const neighborCandidates = [];
        if (row > 0) neighborCandidates.push(board[row - 1][col]);
        if (col > 0) neighborCandidates.push(board[row][col - 1]);
        let colorIndex = Math.floor(Math.random() * colorCount);
        if (neighborCandidates.length && Math.random() < clusterStrength) {
          colorIndex = neighborCandidates[Math.floor(Math.random() * neighborCandidates.length)];
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
    const seed = innerCells[Math.floor(Math.random() * innerCells.length)] || [Math.floor(size / 2), Math.floor(size / 2)];
    const emptyCells = new Set([`${seed[0]},${seed[1]}`]);
    board[seed[0]][seed[1]] = EMPTY_CELL;
    return { board, emptyCells };
  }

  function getClusterStrength(mainStage, colorCount) {
    const loosenByStage = Math.min(0.18, (mainStage - 1) * 0.02);
    const loosenByColor = Math.min(0.20, Math.max(0, colorCount - 3) * 0.04);
    return clamp(0.68 - loosenByStage - loosenByColor, 0.20, 0.72);
  }

  function renderGameUi() {
    const run = appState.currentRun;
    if (!run) return;
    const visibleStage = getVisibleStageNumber(run);
    el.boardInfo.textContent = `Stage ${visibleStage} · ${run.currentBoardSize}x${run.currentBoardSize} · ${run.currentColorCount}색 · 선택 횟수 ${run.remainingMoves}`;
    el.boardStatus.textContent = `${run.config.presetName} · 드래그 이동 / 두 손가락 확대·축소`;
    renderBoard();
    renderColorToolbar();
  }

  function renderBoard() {
    const run = appState.currentRun;
    el.board.innerHTML = '';
    el.board.style.gridTemplateColumns = `repeat(${run.currentBoardSize}, var(--cell-size))`;
    el.board.style.gridTemplateRows = `repeat(${run.currentBoardSize}, var(--cell-size))`;
    for (let row = 0; row < run.currentBoardSize; row += 1) {
      for (let col = 0; col < run.currentBoardSize; col += 1) {
        const cellValue = run.board[row][col];
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (cellValue === EMPTY_CELL) {
          cell.classList.add('empty');
        } else {
          const color = getPaletteColor(cellValue);
          cell.style.setProperty('--cell-color', color);
          cell.style.backgroundColor = color;
        }
        el.board.appendChild(cell);
      }
    }
  }

  function renderColorToolbar() {
    const run = appState.currentRun;
    const available = getAvailableAdjacentColors(run.board, run.emptyCells);
    el.colorToolbar.innerHTML = '';
    for (let colorIndex = 0; colorIndex < run.currentColorCount; colorIndex += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-btn';
      const color = getPaletteColor(colorIndex);
      button.style.setProperty('--button-color', color);
      button.style.backgroundColor = color;
      button.title = `색상 ${colorIndex + 1}`;
      const usable = available.has(colorIndex);
      button.classList.toggle('disabled-color', !usable);
      button.addEventListener('click', () => selectColor(colorIndex));
      el.colorToolbar.appendChild(button);
    }
  }

  function selectColor(colorIndex) {
    const run = appState.currentRun;
    if (!run || run.finished || run.remainingMoves <= 0) return;
    const expansion = expandEmptyAreaByColor(run.board, run.emptyCells, colorIndex);
    if (expansion === 0) return;
    playSound('colorPick');
    run.remainingMoves -= 1;
    renderGameUi();
    saveRunStorage();
    if (isBoardCleared(run.board)) {
      onBoardCleared();
      return;
    }
    if (run.remainingMoves <= 0) onBoardFailed();
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
      for (const [nr, nc] of getNeighborCoords(row, col, board.length)) {
        const key = `${nr},${nc}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (board[nr][nc] === colorIndex) {
          collected.add(key);
          queue.push([nr, nc]);
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


  function estimateBoardMoves(board, emptyCells, colorCount) {
    const boardCopy = board.map((row) => row.slice());
    const emptyCopy = new Set(emptyCells);
    let moves = 0;
    const safetyLimit = boardCopy.length * boardCopy.length * 3;
    while (!isBoardCleared(boardCopy) && moves < safetyLimit) {
      const available = Array.from(getAvailableAdjacentColors(boardCopy, emptyCopy));
      if (!available.length) break;
      let bestColor = available[0];
      let bestGain = -1;
      for (const colorIndex of available) {
        const simBoard = boardCopy.map((row) => row.slice());
        const simEmpty = new Set(emptyCopy);
        const gain = expandEmptyAreaByColor(simBoard, simEmpty, colorIndex);
        const frontier = getAvailableAdjacentColors(simBoard, simEmpty).size;
        const score = gain * 100 + frontier;
        if (score > bestGain) {
          bestGain = score;
          bestColor = colorIndex;
        }
      }
      const changed = expandEmptyAreaByColor(boardCopy, emptyCopy, bestColor);
      if (changed <= 0) break;
      moves += 1;
    }
    return Math.max(1, moves);
  }

  function getAvailableAdjacentColors(board, emptyCells) {
    const available = new Set();
    emptyCells.forEach((key) => {
      const [row, col] = key.split(',').map(Number);
      for (const [nr, nc] of getNeighborCoords(row, col, board.length)) {
        const value = board[nr][nc];
        if (value !== EMPTY_CELL) available.add(value);
      }
    });
    return available;
  }

  function isBoardCleared(board) {
    for (const row of board) {
      for (const value of row) {
        if (value !== EMPTY_CELL) return false;
      }
    }
    return true;
  }

  function onBoardCleared() {
    const run = appState.currentRun;
    run.finished = true;
    playSound('success');

    const next = getNextProgress(run);
    showOverlay(
      '스테이지 클리어',
      `다음 판으로 이동합니다.
Stage ${next.visibleStage} · ${next.boardSize}x${next.boardSize} · ${next.colorCount}색`,
      '다음 판으로',
      () => {
        run.mainStage = next.mainStage;
        run.subStage = next.subStage;
        run.currentColorCount = next.colorCount;
        run.currentBoardSize = next.boardSize;
        run.carriedMoves = Math.max(0, run.remainingMoves);
        saveRunStorage();
        setupCurrentBoard({ resetMoves: true, isFirstStage: false });
      }
    );
  }

  function onBoardFailed() {
    const run = appState.currentRun;
    run.finished = true;
    playSound('fail');
    showOverlay(
      '게임 오버',
      `선택 횟수를 모두 사용했습니다.\n초기 화면으로 돌아갑니다.`,
      '초기 화면으로',
      () => showSetupScreen(true)
    );
  }

  function getNextProgress(run) {
    let mainStage = run.mainStage;
    let subStage = run.subStage + 1;
    if (subStage > run.config.subStagesPerStage) {
      mainStage += 1;
      subStage = 1;
    }
    return {
      mainStage,
      subStage,
      colorCount: computeStageColorCount(run.config, mainStage),
      boardSize: computeStageBoardSize(run.config, mainStage),
      visibleStage: ((mainStage - 1) * run.config.subStagesPerStage) + subStage,
    };
  }

  function getVisibleStageNumber(run) {
    return ((run.mainStage - 1) * run.config.subStagesPerStage) + run.subStage;
  }

  function getStageMoveBuffer(config) {
    return clampInt(config.initialMoves, 0, 999999, 0);
  }

  function computeStageColorCount(config, mainStage) {
    const steps = Math.floor((mainStage - 1) / config.colorIncreaseEveryStages);
    const maxValue = config.maxColorCount == null ? PALETTE.length : config.maxColorCount;
    return Math.min(maxValue, config.initialColorCount + steps * config.colorIncreaseAmount);
  }

  function computeStageBoardSize(config, mainStage) {
    const steps = Math.floor((mainStage - 1) / config.boardIncreaseEveryStages);
    const maxValue = config.maxBoardSize == null ? MAX_FALLBACK_BOARD_SIZE : config.maxBoardSize;
    return Math.min(maxValue, config.initialBoardSize + steps * config.boardIncreaseAmount);
  }

  function fitBoardToViewport() {
    const viewport = el.boardViewport;
    if (!viewport || !appState.currentRun) return;
    const boardRect = el.board.getBoundingClientRect();
    const contentWidth = el.board.offsetWidth + 48;
    const contentHeight = el.board.offsetHeight + 48;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (!contentWidth || !contentHeight || !vw || !vh || !boardRect.width) return;
    const scale = clamp(Math.min((vw - 24) / contentWidth, (vh - 24) / contentHeight, 1.8), 0.45, 2.2);
    appState.boardView.scale = scale;
    appState.boardView.x = (vw - contentWidth * scale) / 2;
    appState.boardView.y = (vh - contentHeight * scale) / 2;
    applyBoardTransform();
  }

  function applyBoardTransform() {
    el.boardCanvas.style.transform = `translate(${round2(appState.boardView.x)}px, ${round2(appState.boardView.y)}px) scale(${appState.boardView.scale})`;
  }

  function showOverlay(title, message, buttonText, handler) {
    el.overlayTitle.textContent = title;
    el.overlayMessage.innerHTML = escapeHtml(message).replace(/\n/g, '<br>');
    el.overlayActionBtn.textContent = buttonText;
    appState.overlayHandler = handler;
    el.overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    el.overlay.classList.add('hidden');
  }

  function serializeRun(run) {
    return {
      config: cloneConfig(run.config),
      mainStage: run.mainStage,
      subStage: run.subStage,
      remainingMoves: run.remainingMoves,
      carriedMoves: run.carriedMoves || 0,
      boardBaseMoves: run.boardBaseMoves || 0,
      currentColorCount: run.currentColorCount,
      currentBoardSize: run.currentBoardSize,
      board: run.board.map((row) => [...row]),
      emptyCells: Array.from(run.emptyCells),
      finished: !!run.finished,
    };
  }

  function deserializeRun(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const config = sanitizeConfig(raw.config || {});
    const currentColorMax = config.maxColorCount == null ? PALETTE.length : config.maxColorCount;
    const currentBoardMax = config.maxBoardSize == null ? MAX_FALLBACK_BOARD_SIZE : config.maxBoardSize;
    const board = Array.isArray(raw.board) ? raw.board.map((row) => Array.isArray(row) ? row.map((value) => Number(value)) : []) : [];
    const currentBoardSize = clampInt(raw.currentBoardSize, 3, currentBoardMax, config.initialBoardSize);
    if (board.length !== currentBoardSize || board.some((row) => row.length !== currentBoardSize)) return null;
    return {
      config,
      mainStage: clampInt(raw.mainStage, 1, 99999, 1),
      subStage: clampInt(raw.subStage, 1, config.subStagesPerStage, 1),
      remainingMoves: clampInt(raw.remainingMoves, 0, 999999, config.initialMoves),
      carriedMoves: clampInt(raw.carriedMoves, 0, 999999, 0),
      boardBaseMoves: clampInt(raw.boardBaseMoves, 0, 999999, 0),
      currentColorCount: clampInt(raw.currentColorCount, 2, currentColorMax, config.initialColorCount),
      currentBoardSize,
      board,
      emptyCells: new Set(Array.isArray(raw.emptyCells) ? raw.emptyCells.map((item) => String(item)) : []),
      finished: !!raw.finished,
    };
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
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : NaN;
  }

  function toOptionalNumber(value) {
    if (value === '' || value == null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function toExportText(payload) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }

  function fromExportText(text) {
    return JSON.parse(decodeURIComponent(escape(atob(String(text).trim()))));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();