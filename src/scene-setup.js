import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function initScene(container) {
  // === Renderer ===
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // === Scene ===
  const scene = new THREE.Scene();

  // 동적 배경 (태양 고도에 따라 변경)
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d');
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;
  // 초기 배경
  _drawBackground(bgCtx, bgCanvas, bgTexture, 0.5);

  // 환경맵 (PMREMGenerator로 청동 반사용)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x8899aa);
  // 간단한 환경 조명으로 반사 생성
  const envLight1 = new THREE.DirectionalLight(0xffffff, 1);
  envLight1.position.set(1, 2, 1);
  envScene.add(envLight1);
  const envLight2 = new THREE.DirectionalLight(0x8899bb, 0.5);
  envLight2.position.set(-1, 1, -1);
  envScene.add(envLight2);
  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;
  pmremGenerator.dispose();

  // === Camera ===
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 100);
  camera.position.set(0.93, 1.8, -1.99);
  camera.lookAt(0, -0.15, 0);

  // === OrbitControls ===
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, -0.15, 0);
  controls.minDistance = 0.6;
  controls.maxDistance = 5.0;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.update();

  // === Lights ===
  // 약한 앰비언트 (전체 조명)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  // 하반구 보조광
  const hemiLight = new THREE.HemisphereLight(0x8899bb, 0x443322, 0.3);
  scene.add(hemiLight);

  // 태양 DirectionalLight (동적으로 위치/세기 변경)
  const sunLight = new THREE.DirectionalLight(0xFFF5E0, 2.5);
  sunLight.position.set(3, 5, -3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 20;
  sunLight.shadow.camera.left = -2;
  sunLight.shadow.camera.right = 2;
  sunLight.shadow.camera.top = 2;
  sunLight.shadow.camera.bottom = -2;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);
  scene.add(sunLight.target);
  sunLight.target.position.set(0, -0.3, 0);

  // === Resize ===
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // 배경 업데이트 함수
  function updateBackground(sunAltitude) {
    _drawBackground(bgCtx, bgCanvas, bgTexture, sunAltitude);
  }

  return { renderer, scene, camera, controls, sunLight, ambientLight, updateBackground };
}

// 태양 고도에 따른 배경 그라디언트 그리기
function _drawBackground(ctx, canvas, texture, sunAlt) {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);

  if (sunAlt > 0.15) {
    // 낮: 파란 하늘
    const t = Math.min(1, sunAlt / 1.0);
    grad.addColorStop(0, lerpColor('#6b8fc2', '#4a6fa5', t));
    grad.addColorStop(0.5, lerpColor('#3d5570', '#2d3a4a', t));
    grad.addColorStop(1, '#1a1a2e');
  } else if (sunAlt > -0.05) {
    // 해질녘/해뜰녘: 오렌지+붉은 톤
    const t = (sunAlt + 0.05) / 0.2; // 0~1
    grad.addColorStop(0, lerpColor('#2a2540', '#c47030', t));
    grad.addColorStop(0.3, lerpColor('#1e1a30', '#8a4020', t));
    grad.addColorStop(0.6, lerpColor('#151525', '#4a2a30', t));
    grad.addColorStop(1, '#0e0e1a');
  } else {
    // 밤: 어두운 남색
    grad.addColorStop(0, '#151525');
    grad.addColorStop(0.5, '#0e0e1a');
    grad.addColorStop(1, '#080812');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  texture.needsUpdate = true;
}

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
