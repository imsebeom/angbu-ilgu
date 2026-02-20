import { getJisinTime, getCurrentSolarTerm, RAD2DEG } from './constants.js';
import { getAzimuthLabel } from './sun-position.js';

/**
 * UI 컨트롤 초기화 및 이벤트 바인딩
 */
export function initUI(state, callbacks) {
  const dateInput = document.getElementById('date-input');
  const timeSlider = document.getElementById('time-slider');
  const timeDisplay = document.getElementById('time-display');
  const jisinDisplay = document.getElementById('jisin-display');
  const realtimeBtn = document.getElementById('realtime-btn');
  const speedBtns = document.querySelectorAll('.speed-btn');

  // 초기 날짜/시간 설정 (state 기준)
  dateInput.value = formatDateForInput(state.currentDate);
  timeSlider.value = state.currentDate.getHours() * 60 + state.currentDate.getMinutes();
  updateTimeLabels(timeSlider.value, timeDisplay, jisinDisplay);

  // 실시간 모드 초기 상태 반영
  realtimeBtn.classList.toggle('active', state.isRealtime);

  // 날짜 변경 (MM-DD 형식)
  dateInput.addEventListener('change', () => {
    state.isRealtime = false;
    realtimeBtn.classList.remove('active');
    const parts = dateInput.value.split('-');
    if (parts.length === 2) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        state.currentDate.setMonth(month - 1, day);
        updateActiveTermBtn();
        callbacks.onDateTimeChange(state.currentDate);
      }
    }
  });

  // 시간 슬라이더
  timeSlider.addEventListener('input', () => {
    state.isRealtime = false;
    realtimeBtn.classList.remove('active');
    const minutes = parseInt(timeSlider.value);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    state.currentDate.setHours(h, m, 0, 0);
    updateTimeLabels(minutes, timeDisplay, jisinDisplay);
    callbacks.onDateTimeChange(state.currentDate);
  });

  // 배속 버튼
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.speed = parseInt(btn.dataset.speed);
      if (state.speed > 0) {
        state.isRealtime = false;
        realtimeBtn.classList.remove('active');
      }
    });
  });

  // 실시간 모드
  realtimeBtn.addEventListener('click', () => {
    state.isRealtime = !state.isRealtime;
    realtimeBtn.classList.toggle('active', state.isRealtime);
    if (state.isRealtime) {
      state.speed = 1;
      speedBtns.forEach(b => b.classList.remove('active'));
      speedBtns[1].classList.add('active'); // 1x
    }
  });

  // 절기 선택 버튼
  const termBtns = document.querySelectorAll('.term-btn');
  function updateActiveTermBtn() {
    const m = state.currentDate.getMonth() + 1;
    const d = state.currentDate.getDate();
    termBtns.forEach(btn => {
      const bm = parseInt(btn.dataset.month);
      const bd = parseInt(btn.dataset.day);
      btn.classList.toggle('active', bm === m && bd === d);
    });
  }
  updateActiveTermBtn();

  termBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.isRealtime = false;
      realtimeBtn.classList.remove('active');
      const month = parseInt(btn.dataset.month);
      const day = parseInt(btn.dataset.day);
      state.currentDate.setMonth(month - 1, day);
      // 날짜 입력 업데이트
      dateInput.value = formatDateForInput(state.currentDate);
      updateActiveTermBtn();
      callbacks.onDateTimeChange(state.currentDate);
    });
  });

  // 모드 전환 버튼
  const modeBtn = document.getElementById('mode-btn');
  let labelMode = 'modern';

  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      labelMode = labelMode === 'modern' ? 'classic' : 'modern';
      modeBtn.textContent = labelMode === 'modern' ? '현대' : '원본';
      modeBtn.classList.toggle('classic', labelMode === 'classic');
      if (callbacks.onLabelModeChange) callbacks.onLabelModeChange(labelMode);
    });
  }

  // 도움말 모달
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const modalClose = document.getElementById('modal-close');

  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => {
      helpModal.hidden = false;
    });
    modalClose.addEventListener('click', () => {
      helpModal.hidden = true;
    });
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.hidden = true;
    });
  }

  return {
    updateDisplay(date, sunData) {
      // 시간 표시 업데이트
      const mins = date.getHours() * 60 + date.getMinutes();
      updateTimeLabels(mins, timeDisplay, jisinDisplay);
      if (state.isRealtime || state.speed > 0) {
        timeSlider.value = mins;
        dateInput.value = formatDateForInput(date);
      }

      // 정보 패널 업데이트
      updateInfoPanel(date, sunData);

      // 절기 버튼 활성 상태 업데이트
      updateActiveTermBtn();
    }
  };
}

function updateTimeLabels(totalMinutes, timeEl, jisinEl) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  timeEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const jisin = getJisinTime(h, m);
  jisinEl.textContent = jisin.hanja;
}

function updateInfoPanel(date, sunData) {
  // 절기
  const term = getCurrentSolarTerm(date);
  const seasonDisplay = document.getElementById('season-display');
  const seasonNameDisplay = document.getElementById('season-name-display');
  if (seasonDisplay) seasonDisplay.textContent = term.hanja;
  if (seasonNameDisplay) seasonNameDisplay.textContent = term.name;

  // 태양 고도
  const altDisplay = document.getElementById('altitude-display');
  if (altDisplay) {
    if (sunData && sunData.isAboveHorizon) {
      altDisplay.textContent = `${sunData.altitudeDeg.toFixed(1)}°`;
    } else {
      altDisplay.textContent = '지평선 아래';
    }
  }

  // 태양 방위
  const azDisplay = document.getElementById('azimuth-display');
  if (azDisplay) {
    if (sunData && sunData.isAboveHorizon) {
      const label = getAzimuthLabel(sunData.azimuthDeg);
      azDisplay.textContent = `${label} (${sunData.azimuthDeg.toFixed(1)}°)`;
    } else {
      azDisplay.textContent = '--';
    }
  }

  // 상태
  const statusEl = document.getElementById('sun-status');
  if (statusEl) {
    statusEl.textContent = sunData?.isAboveHorizon ? '☀ 해가 떠 있음' : '🌙 밤';
  }
}

function formatDateForInput(date) {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${m}-${d}`;
}
