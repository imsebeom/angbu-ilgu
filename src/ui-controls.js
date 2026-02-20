import { getJisinTime, getCurrentSolarTerm, RAD2DEG } from './constants.js';
import { getAzimuthLabel } from './sun-position.js';

/**
 * UI 컨트롤 초기화 및 이벤트 바인딩
 */
export function initUI(state, callbacks) {
  const dateMonthEl = document.getElementById('date-month');
  const dateDayEl = document.getElementById('date-day');
  const timeSlider = document.getElementById('time-slider');
  const timeDisplay = document.getElementById('time-display');
  const jisinDisplay = document.getElementById('jisin-display');
  const jisinKrDisplay = document.getElementById('jisin-kr-display');
  const realtimeBtn = document.getElementById('realtime-btn');
  const speedBtns = document.querySelectorAll('.speed-btn');

  // 날짜 스피너 표시 업데이트
  function updateDateSpinner(date) {
    dateMonthEl.textContent = (date.getMonth() + 1).toString().padStart(2, '0');
    dateDayEl.textContent = date.getDate().toString().padStart(2, '0');
  }

  // 각 월의 최대 일수
  function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  // 초기 날짜/시간 설정 (state 기준)
  updateDateSpinner(state.currentDate);
  timeSlider.value = state.currentDate.getHours() * 60 + state.currentDate.getMinutes();
  updateTimeLabels(timeSlider.value, timeDisplay, jisinDisplay, jisinKrDisplay);

  // 실시간 모드 초기 상태 반영
  realtimeBtn.classList.toggle('active', state.isRealtime);

  // 날짜 스피너 버튼
  document.querySelectorAll('.spin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.isRealtime = false;
      realtimeBtn.classList.remove('active');
      const target = btn.dataset.target;
      const dir = parseInt(btn.dataset.dir);
      if (target === 'month') {
        let m = state.currentDate.getMonth() + dir;
        if (m > 11) m = 0;
        if (m < 0) m = 11;
        const maxDay = daysInMonth(m + 1, state.currentDate.getFullYear());
        const day = Math.min(state.currentDate.getDate(), maxDay);
        state.currentDate.setMonth(m, day);
      } else {
        const m = state.currentDate.getMonth();
        const maxDay = daysInMonth(m + 1, state.currentDate.getFullYear());
        let d = state.currentDate.getDate() + dir;
        if (d > maxDay) d = 1;
        if (d < 1) d = maxDay;
        state.currentDate.setDate(d);
      }
      updateDateSpinner(state.currentDate);
      updateActiveTermBtn();
      callbacks.onDateTimeChange(state.currentDate);
    });
  });

  // 시간 슬라이더
  timeSlider.addEventListener('input', () => {
    state.isRealtime = false;
    realtimeBtn.classList.remove('active');
    const minutes = parseInt(timeSlider.value);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    state.currentDate.setHours(h, m, 0, 0);
    updateTimeLabels(minutes, timeDisplay, jisinDisplay, jisinKrDisplay);
    callbacks.onDateTimeChange(state.currentDate);
  });

  // 배속 버튼
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.speed = parseInt(btn.dataset.speed);
      state.dateOnly = btn.dataset.dateonly === 'true';
      state._dayAccum = 0;
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

  // 절기 선택 버튼 + 슬라이더
  const termBtns = document.querySelectorAll('.term-btn');
  const termSlider = document.getElementById('term-slider');

  function updateActiveTermBtn() {
    const m = state.currentDate.getMonth() + 1;
    const d = state.currentDate.getDate();
    let activeIdx = -1;
    termBtns.forEach((btn, i) => {
      const bm = parseInt(btn.dataset.month);
      const bd = parseInt(btn.dataset.day);
      const isActive = bm === m && bd === d;
      btn.classList.toggle('active', isActive);
      if (isActive) activeIdx = i;
    });
    // 슬라이더도 동기화
    if (termSlider && activeIdx >= 0) {
      termSlider.value = activeIdx;
    }
  }
  updateActiveTermBtn();

  termBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      state.isRealtime = false;
      realtimeBtn.classList.remove('active');
      const month = parseInt(btn.dataset.month);
      const day = parseInt(btn.dataset.day);
      state.currentDate.setMonth(month - 1, day);
      updateDateSpinner(state.currentDate);
      updateActiveTermBtn();
      callbacks.onDateTimeChange(state.currentDate);
    });
  });

  // 절기 슬라이더
  if (termSlider) {
    termSlider.addEventListener('input', () => {
      const idx = parseInt(termSlider.value);
      const btn = termBtns[idx];
      if (!btn) return;
      state.isRealtime = false;
      realtimeBtn.classList.remove('active');
      const month = parseInt(btn.dataset.month);
      const day = parseInt(btn.dataset.day);
      state.currentDate.setMonth(month - 1, day);
      updateDateSpinner(state.currentDate);
      updateActiveTermBtn();
      callbacks.onDateTimeChange(state.currentDate);
    });
  }

  // 모드 전환 버튼
  const modeBtn = document.getElementById('mode-btn');
  let labelMode = state.labelMode || 'modern';

  // 초기 버튼 상태 반영
  if (modeBtn) {
    modeBtn.textContent = labelMode === 'modern' ? '현대 시각' : '진태양시';
    modeBtn.classList.toggle('classic', labelMode === 'classic');

    modeBtn.addEventListener('click', () => {
      labelMode = labelMode === 'modern' ? 'classic' : 'modern';
      modeBtn.textContent = labelMode === 'modern' ? '현대 시각' : '진태양시';
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

  // 24절기 모달
  const termsBtn = document.getElementById('terms-btn');
  const termsModal = document.getElementById('terms-modal');
  const termsClose = termsModal?.querySelector('.terms-modal-close');

  if (termsBtn && termsModal) {
    termsBtn.addEventListener('click', () => {
      termsModal.hidden = false;
    });
    termsClose.addEventListener('click', () => {
      termsModal.hidden = true;
    });
    termsModal.addEventListener('click', (e) => {
      if (e.target === termsModal) termsModal.hidden = true;
    });
  }

  return {
    updateDisplay(date, sunData) {
      // 시간 표시 업데이트
      const mins = date.getHours() * 60 + date.getMinutes();
      updateTimeLabels(mins, timeDisplay, jisinDisplay, jisinKrDisplay);
      if (state.isRealtime || state.speed > 0) {
        timeSlider.value = mins;
        updateDateSpinner(date);
      }

      // 정보 패널 업데이트
      updateInfoPanel(date, sunData);

      // 절기 버튼 활성 상태 업데이트
      updateActiveTermBtn();
    }
  };
}

function updateTimeLabels(totalMinutes, timeEl, jisinEl, jisinKrEl) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  timeEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const jisin = getJisinTime(h, m);
  jisinEl.textContent = jisin.hanja;
  if (jisinKrEl) jisinKrEl.textContent = jisin.korean;
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
