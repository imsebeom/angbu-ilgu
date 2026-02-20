import { initScene } from './scene-setup.js';
import { buildAngbuIlgu } from './angbu-ilgu.js';
import { createAllLines, updateModernHourLines, setHourLineMode } from './sundial-lines.js';
import { createShadowMarker, updateShadowMarker } from './shadow-engine.js';
import { getSunPosition, updateSunLight } from './sun-position.js';
import { createAllLabels, setLabelMode, updateModernHourLabels } from './text-labels.js';
import { initUI } from './ui-controls.js';

// ===== 상태 =====
// 기본: 춘분(3/21) 정오, 정지 모드, 진태양시(classic) 모드
const defaultDate = new Date();
defaultDate.setMonth(2, 21); // 3월 21일 (춘분)
defaultDate.setHours(12, 0, 0, 0);
const state = {
  currentDate: defaultDate,
  isRealtime: false,
  speed: 0,  // 0=정지, 1=실시간, 60=1분/초, 3600=1시간/초
  dateOnly: false, // true이면 시각 고정, 날짜만 진행
  _dayAccum: 0, // 날짜 진행 누적값
  labelMode: 'classic', // 현재 모드 추적 (기본: 진태양시)
};

// ===== 씬 초기화 =====
const container = document.getElementById('app');
const { renderer, scene, camera, controls, sunLight, updateBackground } = initScene(container);

// ===== 앙부일구 모델 =====
const angbuGroup = buildAngbuIlgu();
scene.add(angbuGroup);

// ===== 시각선 & 절기선 =====
const linesGroup = createAllLines(defaultDate);
angbuGroup.add(linesGroup);

// ===== 텍스트 라벨 =====
const labelsGroup = createAllLabels();
angbuGroup.add(labelsGroup);

// ===== 그림자 마커 =====
const shadowMarker = createShadowMarker();
scene.add(shadowMarker);

// ===== 기본 모드: 진태양시(classic) =====
setLabelMode(labelsGroup, 'classic');
setHourLineMode(linesGroup, 'classic');

// ===== UI 초기화 =====
const ui = initUI(state, {
  onDateTimeChange(date) {
    updateScene(date);
  },
  onLabelModeChange(mode) {
    state.labelMode = mode;
    setLabelMode(labelsGroup, mode);
    setHourLineMode(linesGroup, mode);
  }
});

// ===== 씬 업데이트 =====
let lastUpdateDay = -1; // 날짜 단위 캐시 (같은 날이면 라벨/격자선 갱신 불필요)

function updateScene(date) {
  const sunData = getSunPosition(date);

  // 태양광 업데이트
  updateSunLight(sunLight, sunData);

  // 배경 업데이트 (태양 고도에 따라)
  updateBackground(sunData.altitude);

  // 그림자 마커 업데이트
  updateShadowMarker(shadowMarker, sunData);

  // 날짜가 바뀌면: 현대 모드 시각 라벨 + 현대 모드 격자선 갱신
  const dayKey = date.getFullYear() * 400 + date.getMonth() * 32 + date.getDate();
  if (dayKey !== lastUpdateDay) {
    lastUpdateDay = dayKey;
    updateModernHourLabels(labelsGroup, date);
    updateModernHourLines(linesGroup, date);
  }

  // UI 정보 패널 업데이트
  ui.updateDisplay(date, sunData);
}

// ===== 애니메이션 루프 =====
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const delta = (now - lastTime) / 1000; // 초 단위
  lastTime = now;

  // 시간 진행
  if (state.isRealtime) {
    state.currentDate = new Date();
  } else if (state.speed > 0) {
    if (state.dateOnly) {
      // 날짜만 진행 모드: 시각 고정, 날짜만 변경
      const daysPerSec = state.speed / 86400;
      state._dayAccum = (state._dayAccum || 0) + delta * daysPerSec;
      if (state._dayAccum >= 1) {
        const daysToAdd = Math.floor(state._dayAccum);
        state._dayAccum -= daysToAdd;
        const h = state.currentDate.getHours();
        const m = state.currentDate.getMinutes();
        state.currentDate.setDate(state.currentDate.getDate() + daysToAdd);
        state.currentDate.setHours(h, m, 0, 0);
      }
    } else {
      const advance = delta * state.speed * 1000; // 밀리초
      const next = new Date(state.currentDate.getTime() + advance);
      const h = next.getHours();
      // 배속 모드: 20시~04시 구간 건너뛰기
      if (h >= 20 || h < 4) {
        next.setDate(next.getDate() + (h >= 20 ? 1 : 0));
        next.setHours(4, 0, 0, 0);
      }
      state.currentDate = next;
    }
  }

  // 씬 업데이트
  updateScene(state.currentDate);

  // 컨트롤 업데이트
  controls.update();

  // 렌더링
  renderer.render(scene, camera);
}

// 초기 업데이트 후 루프 시작
updateScene(state.currentDate);
requestAnimationFrame(animate);
