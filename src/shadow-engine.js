import * as THREE from 'three';
import { BOWL_RADIUS, BOWL_THICKNESS } from './constants.js';

/**
 * 영침 끝(구 중심 = 원점)에서 태양 반대 방향으로 반구 내면에 맺히는
 * 그림자 점의 위치를 계산한다.
 *
 * 원리: 영침 끝이 정확히 구의 중심(원점)에 있으므로,
 * 태양 방향 단위벡터 s에 대해 그림자 점 P = -R × s
 * (태양의 반대편으로 반지름만큼)
 */
export function calculateShadowPoint(sunData) {
  if (!sunData.isAboveHorizon) return null;

  const R = BOWL_RADIUS - BOWL_THICKNESS - 0.002; // 내면에 딱 붙도록
  const shadowPoint = sunData.direction.clone().negate().multiplyScalar(R);

  // 반구 내부 (y < 0) 인지 확인
  if (shadowPoint.y >= 0) return null;

  return shadowPoint;
}

/**
 * 그림자 마커 (빨간 빛나는 점) 생성 - 크고 눈에 잘 띄게
 */
export function createShadowMarker() {
  const group = new THREE.Group();

  // 핵심 빨간 점 (크게)
  const coreGeo = new THREE.SphereGeometry(0.022, 16, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xFF2200,
    depthTest: false,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // 외부 글로우
  const glowGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xFF4422,
    transparent: true,
    opacity: 0.35,
    depthTest: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  // 더 큰 외부 글로우
  const outerGlowGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const outerGlowMat = new THREE.MeshBasicMaterial({
    color: 0xFF6644,
    transparent: true,
    opacity: 0.15,
    depthTest: false,
  });
  const outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
  group.add(outerGlow);

  // 수직 포인터 라인 (그림자 점에서 위쪽으로)
  const linePoints = [];
  for (let i = 0; i <= 20; i++) {
    linePoints.push(new THREE.Vector3(0, i * 0.005, 0));
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.12, 0),
  ]);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xFF3333,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  group.add(line);

  group.visible = false;
  group.renderOrder = 999; // 항상 위에 렌더링
  return group;
}

/**
 * 그림자 마커 위치 업데이트
 */
export function updateShadowMarker(marker, sunData) {
  const point = calculateShadowPoint(sunData);
  if (point) {
    marker.visible = true;
    marker.position.copy(point);
  } else {
    marker.visible = false;
  }
  return point;
}
