import * as THREE from 'three';
import { BOWL_RADIUS, BOWL_THICKNESS, LATITUDE, DEG2RAD } from './constants.js';

/**
 * 영침 끝(구 중심 = 원점)에서 태양 반대 방향으로 반구 내면에 맺히는
 * 그림자 점의 위치를 계산한다.
 *
 * 시각선과 동일한 천문학 공식(시간각 + 적위)을 사용하여
 * 그림자 점이 격자선 위에 정확히 맺히도록 한다.
 *
 * sunData에서 hourAngleDeg와 declinationDeg를 받아
 * sundial-lines.js의 calcShadowProjection과 동일한 로직 적용.
 */
export function calculateShadowPoint(sunData) {
  if (!sunData.isAboveHorizon) return null;

  const R = BOWL_RADIUS - BOWL_THICKNESS - 0.002;
  const latRad = LATITUDE * DEG2RAD;
  const decRad = sunData.declinationDeg * DEG2RAD;
  const hRad = sunData.hourAngleDeg * DEG2RAD;

  // 태양 고도각
  const sinAlt = Math.sin(latRad) * Math.sin(decRad)
               + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
  if (sinAlt <= 0.01) return null;

  const alt = Math.asin(sinAlt);
  const cosAlt = Math.cos(alt);
  if (cosAlt < 0.001) return null;

  // 태양 방위각 (북=0 기준)
  let cosAzNorth = (Math.sin(decRad) - Math.sin(latRad) * sinAlt)
            / (Math.cos(latRad) * cosAlt);
  cosAzNorth = Math.max(-1, Math.min(1, cosAzNorth));
  let azNorth = Math.acos(cosAzNorth);

  const sinH = Math.sin(hRad);
  if (sinH > 0) azNorth = 2 * Math.PI - azNorth;

  // 남=0 기준으로 변환
  const az = azNorth - Math.PI;

  // 태양 방향 → Three.js 좌표계 (x반전: 카메라 남쪽에서 바라볼 때 화면 오른쪽=동)
  const sunDir = new THREE.Vector3(
     Math.sin(az) * cosAlt,
     sinAlt,
    -Math.cos(az) * cosAlt,
  ).normalize();

  // 그림자 점 = 태양 반대 방향 × R
  const shadowPoint = sunDir.clone().negate().multiplyScalar(R);

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
