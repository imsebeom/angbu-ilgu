import { getJisinTime, getCurrentSolarTerm, SOLAR_TERMS_24, RAD2DEG, LONGITUDE } from './constants.js';
import { getAzimuthLabel } from './sun-position.js';

// 균시차 + 경도 보정 (분 단위): 진태양시 = KST + correction
function calcCorrectionMinutes(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = diff / 86400000;
  const gamma = 2 * Math.PI * (dayOfYear - 1) / 365;

  const eqTime = 229.18 * (0.000075
    + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.04089 * Math.sin(2 * gamma));

  const standardMeridian = 135;
  const longitudeCorrection = 4 * (LONGITUDE - standardMeridian);

  return eqTime + longitudeCorrection;
}

// KST 분 → 진태양시 분
function kstToSolar(kstMinutes, correctionMin) {
  return kstMinutes + correctionMin;
}

// 진태양시 분 → KST 분
function solarToKst(solarMinutes, correctionMin) {
  return solarMinutes - correctionMin;
}

// 분을 HH:MM 문자열로
function formatTime(totalMinutes) {
  let m = ((totalMinutes % 1440) + 1440) % 1440; // 0~1439 범위로
  let h = Math.floor(m / 60);
  let min = Math.round(m % 60);
  if (min >= 60) { min = 0; h = (h + 1) % 24; } // 반올림 오버플로 방지
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

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
  const timeSubDisplay = document.getElementById('time-sub-display');
  const realtimeBtn = document.getElementById('realtime-btn');
  const speedBtns = document.querySelectorAll('.speed-btn');

  // 모드 (진태양시/현대) - 초기화 시점에 필요하므로 먼저 선언
  let labelMode = state.labelMode || 'modern';

  // 날짜 스피너 표시 업데이트
  function updateDateSpinner(date) {
    dateMonthEl.textContent = (date.getMonth() + 1).toString().padStart(2, '0');
    dateDayEl.textContent = date.getDate().toString().padStart(2, '0');
  }

  // 각 월의 최대 일수
  function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  // 시간 표시 업데이트 (모드에 따라 진태양시/KST 전환)
  function updateAllTimeDisplay(date) {
    const kstMinutes = date.getHours() * 60 + date.getMinutes();
    const correction = calcCorrectionMinutes(date);
    const solarMinutes = kstToSolar(kstMinutes, correction);

    if (labelMode === 'classic') {
      // 진태양시 모드: 메인=진태양시, 부가=KST
      let solarH = Math.floor(((solarMinutes % 1440) + 1440) % 1440 / 60);
      let solarM = Math.round(((solarMinutes % 1440) + 1440) % 1440 % 60);
      if (solarM >= 60) { solarM = 0; solarH = (solarH + 1) % 24; }
      timeDisplay.textContent = formatTime(solarMinutes);
      const jisin = getJisinTime(solarH, solarM);
      jisinDisplay.textContent = jisin.fullHanja;
      if (jisinKrDisplay) jisinKrDisplay.textContent = jisin.fullKorean;
      if (timeSubDisplay) timeSubDisplay.textContent = `현대 시각 ${formatTime(kstMinutes)}`;
    } else {
      // 현대 모드: 메인=KST, 부가=진태양시
      timeDisplay.textContent = formatTime(kstMinutes);
      const h = Math.floor(kstMinutes / 60);
      const m = kstMinutes % 60;
      const jisin = getJisinTime(h, m);
      jisinDisplay.textContent = jisin.fullHanja;
      if (jisinKrDisplay) jisinKrDisplay.textContent = jisin.fullKorean;
      if (timeSubDisplay) timeSubDisplay.textContent = `진태양시 ${formatTime(solarMinutes)}`;
    }
  }

  // 슬라이더를 현재 날짜/모드에 맞게 동기화
  function syncSliderToDate(date) {
    const kstMinutes = date.getHours() * 60 + date.getMinutes();
    if (labelMode === 'classic') {
      const correction = calcCorrectionMinutes(date);
      const solarMinutes = kstToSolar(kstMinutes, correction);
      timeSlider.value = Math.max(0, Math.min(1440, Math.round(solarMinutes)));
    } else {
      timeSlider.value = kstMinutes;
    }
  }

  // 초기 날짜/시간 설정 (state 기준)
  updateDateSpinner(state.currentDate);
  syncSliderToDate(state.currentDate);
  updateAllTimeDisplay(state.currentDate);

  // 실시간 모드 초기 상태 반영
  realtimeBtn.classList.toggle('active', state.isRealtime);

  // 날짜 스피너 버튼 (절기 스피너 제외)
  document.querySelectorAll('.spin-btn[data-target]').forEach(btn => {
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
    const sliderMinutes = parseInt(timeSlider.value);

    let kstMinutes;
    if (labelMode === 'classic') {
      // 슬라이더 = 진태양시 → KST로 환산
      const correction = calcCorrectionMinutes(state.currentDate);
      kstMinutes = solarToKst(sliderMinutes, correction);
    } else {
      kstMinutes = sliderMinutes;
    }

    const h = Math.floor(((kstMinutes % 1440) + 1440) % 1440 / 60);
    const m = Math.round(((kstMinutes % 1440) + 1440) % 1440 % 60);
    state.currentDate.setHours(h, m, 0, 0);
    updateAllTimeDisplay(state.currentDate);
    callbacks.onDateTimeChange(state.currentDate);
  });

  // 배속 버튼 (실시간 버튼 제외)
  speedBtns.forEach(btn => {
    if (btn === realtimeBtn) return; // 실시간 버튼은 별도 처리
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.speed = parseInt(btn.dataset.speed);
      state.dateOnly = btn.dataset.dateonly === 'true';
      state._dayAccum = 0;
      state.isRealtime = false;
    });
  });

  // 실시간 모드 (speed-controls 내 버튼)
  realtimeBtn.addEventListener('click', () => {
    state.isRealtime = !state.isRealtime;
    if (state.isRealtime) {
      speedBtns.forEach(b => b.classList.remove('active'));
      realtimeBtn.classList.add('active');
      state.speed = 1;
      state.dateOnly = false;
    } else {
      realtimeBtn.classList.remove('active');
      // 정지 상태로 복귀
      speedBtns[0].classList.add('active'); // 정지 버튼
      state.speed = 0;
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

  // 절기 스피너 (날짜 옆 화살표)
  const termUpBtn = document.getElementById('term-up');
  const termDownBtn = document.getElementById('term-down');

  function findClosestTermIndex() {
    const m = state.currentDate.getMonth() + 1;
    const d = state.currentDate.getDate();
    const dayOfYear = Math.floor((m - 1) * 30.44 + d);
    let closest = 0;
    let minDiff = Infinity;
    for (let i = 0; i < SOLAR_TERMS_24.length; i++) {
      const t = SOLAR_TERMS_24[i];
      const tDOY = Math.floor((t.month - 1) * 30.44 + t.day);
      const diff = Math.abs(dayOfYear - tDOY);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }
    return closest;
  }

  function goToTermByIndex(idx) {
    const wrapped = ((idx % 24) + 24) % 24;
    const term = SOLAR_TERMS_24[wrapped];
    state.isRealtime = false;
    realtimeBtn.classList.remove('active');
    speedBtns.forEach(b => b.classList.remove('active'));
    speedBtns[0].classList.add('active');
    state.speed = 0;
    state.currentDate.setMonth(term.month - 1, term.day);
    updateDateSpinner(state.currentDate);
    updateActiveTermBtn();
    callbacks.onDateTimeChange(state.currentDate);
  }

  if (termUpBtn) {
    termUpBtn.addEventListener('click', () => {
      const idx = findClosestTermIndex();
      goToTermByIndex(idx + 1);
    });
  }
  if (termDownBtn) {
    termDownBtn.addEventListener('click', () => {
      const idx = findClosestTermIndex();
      goToTermByIndex(idx - 1);
    });
  }

  // 모드 전환 버튼
  const modeBtn = document.getElementById('mode-btn');

  // 초기 버튼 상태 반영
  const modeLabel = document.getElementById('mode-label');
  const modeHint = document.getElementById('mode-hint');

  function updateModeBtnUI() {
    if (!modeBtn) return;
    if (labelMode === 'classic') {
      if (modeLabel) modeLabel.textContent = '진태양시';
      if (modeHint) modeHint.textContent = '클릭하여 현대 시각으로 바꾸기';
      modeBtn.classList.add('classic');
    } else {
      if (modeLabel) modeLabel.textContent = '현대 시각';
      if (modeHint) modeHint.textContent = '클릭하여 진태양시로 바꾸기';
      modeBtn.classList.remove('classic');
    }
  }

  if (modeBtn) {
    updateModeBtnUI();

    modeBtn.addEventListener('click', () => {
      labelMode = labelMode === 'modern' ? 'classic' : 'modern';
      updateModeBtnUI();
      // 모드 전환 시 슬라이더와 표시 동기화
      syncSliderToDate(state.currentDate);
      updateAllTimeDisplay(state.currentDate);
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

  // 12지신 시간 모달
  const jisinBtn = document.getElementById('jisin-btn');
  const jisinModal = document.getElementById('jisin-modal');
  const jisinClose = jisinModal?.querySelector('.jisin-modal-close');

  if (jisinBtn && jisinModal) {
    jisinBtn.addEventListener('click', () => {
      jisinModal.hidden = false;
    });
    jisinClose.addEventListener('click', () => {
      jisinModal.hidden = true;
    });
    jisinModal.addEventListener('click', (e) => {
      if (e.target === jisinModal) jisinModal.hidden = true;
    });
  }

  return {
    updateDisplay(date, sunData) {
      // 시간 표시 업데이트
      updateAllTimeDisplay(date);
      if (state.isRealtime || state.speed > 0) {
        syncSliderToDate(date);
        updateDateSpinner(date);
      }

      // 정보 패널 업데이트
      updateInfoPanel(date, sunData);

      // 절기 버튼 활성 상태 업데이트
      updateActiveTermBtn();
    }
  };
}

function updateInfoPanel(date, sunData) {
  // 절기
  const term = getCurrentSolarTerm(date);
  const seasonDisplay = document.getElementById('season-display');
  const seasonNameDisplay = document.getElementById('season-name-display');
  if (seasonDisplay) seasonDisplay.textContent = term.hanja;
  if (seasonNameDisplay) seasonNameDisplay.textContent = term.name;

  // 날짜 옆 절기 표시
  const dateTermHanja = document.getElementById('date-term-hanja');
  const dateTermName = document.getElementById('date-term-name');
  if (dateTermHanja) dateTermHanja.textContent = term.hanja;
  if (dateTermName) dateTermName.textContent = term.name;

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
