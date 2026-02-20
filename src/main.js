import { initScene } from './scene-setup.js';
import { buildAngbuIlgu } from './angbu-ilgu.js';
import { createAllLines } from './sundial-lines.js';
import { createShadowMarker, updateShadowMarker } from './shadow-engine.js';
import { getSunPosition, updateSunLight } from './sun-position.js';
import { createAllLabels, setLabelMode, updateModernHourLabels } from './text-labels.js';
import { initUI } from './ui-controls.js';

// ===== 상태 =====
// 기본: 오늘 정오, 정지 모드 (실시간은 수동 활성화)
const defaultDate = new Date();
defaultDate.setHours(12, 0, 0, 0);
const state = {
  currentDate: defaultDate,
  isRealtime: false,
  speed: 0,  // 0=정지, 1=실시간, 60=1분/초, 3600=1시간/초
};

// ===== 씬 초기화 =====
const container = document.getElementById('app');
const { renderer, scene, camera, controls, sunLight, updateBackground } = initScene(container);

// ===== 앙부일구 모델 =====
const angbuGroup = buildAngbuIlgu();
scene.add(angbuGroup);

// ===== 시각선 & 절기선 =====
const linesGroup = createAllLines();
angbuGroup.add(linesGroup);

// ===== 텍스트 라벨 =====
const labelsGroup = createAllLabels();
angbuGroup.add(labelsGroup);

// ===== 그림자 마커 =====
const shadowMarker = createShadowMarker();
scene.add(shadowMarker);

// ===== UI 초기화 =====
const ui = initUI(state, {
  onDateTimeChange(date) {
    updateScene(date);
  },
  onLabelModeChange(mode) {
    setLabelMode(labelsGroup, mode);
  }
});

// ===== 씬 업데이트 =====
let lastLabelUpdateDay = -1; // 날짜 단위 캐시 (같은 날이면 라벨 갱신 불필요)

function updateScene(date) {
  const sunData = getSunPosition(date);

  // 태양광 업데이트
  updateSunLight(sunLight, sunData);

  // 배경 업데이트 (태양 고도에 따라)
  updateBackground(sunData.altitude);

  // 그림자 마커 업데이트
  updateShadowMarker(shadowMarker, sunData);

  // 현대 모드 시각 라벨: 날짜가 바뀌면 KST 시간 업데이트
  const dayKey = date.getFullYear() * 400 + date.getMonth() * 32 + date.getDate();
  if (dayKey !== lastLabelUpdateDay) {
    lastLabelUpdateDay = dayKey;
    updateModernHourLabels(labelsGroup, date);
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
    const advance = delta * state.speed * 1000; // 밀리초
    state.currentDate = new Date(state.currentDate.getTime() + advance);
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
