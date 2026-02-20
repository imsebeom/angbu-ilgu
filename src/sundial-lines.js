import * as THREE from 'three';
import { BOWL_RADIUS, BOWL_THICKNESS, LATITUDE, DEG2RAD, SEASON_LINES, HOUR_LINES } from './constants.js';
import { createSeasonLineMaterial, createHourLineMaterial } from './materials.js';

/**
 * 시각선과 절기선을 모두 생성하여 그룹으로 반환
 */
export function createAllLines() {
  const group = new THREE.Group();
  const seasonMat = createSeasonLineMaterial();
  const hourMat = createHourLineMaterial();

  // === 절기선 (가로 곡선) - 금색 계열 ===
  for (const season of SEASON_LINES) {
    const points = calculateDeclinationCurve(season.declination);
    if (points.length > 3) {
      const line = createLineOnBowl(points, seasonMat, 0.0012);
      group.add(line);
    }
  }

  // === 시각선 (세로 곡선) - 검은색 계열 ===
  for (const hour of HOUR_LINES) {
    const points = calculateHourCurve(hour.hourAngle);
    if (points.length > 3) {
      const thickness = hour.type === 'major' ? 0.002 : 0.001;
      const line = createLineOnBowl(points, hourMat, thickness);
      group.add(line);
    }
  }

  return group;
}

/**
 * 그림자 점 계산 공통 로직
 * 태양의 적위(dec)와 시간각(H)이 주어졌을 때
 * 영침 끝(구 중심)에서의 그림자 투영 점을 반환
 */
function calcShadowProjection(decRad, hRad, latRad, R) {
  // 태양 고도각
  const sinAlt = Math.sin(latRad) * Math.sin(decRad)
               + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
  if (sinAlt <= 0.01) return null; // 지평선 아래 또는 극히 낮음

  const alt = Math.asin(sinAlt);
  const cosAlt = Math.cos(alt);
  if (cosAlt < 0.001) return null;

  // 태양 방위각 계산
  // 이 공식은 "북=0" 기준 방위각을 구함
  // cos(A_north) = (sin(dec) - sin(lat)*sin(alt)) / (cos(lat)*cos(alt))
  let cosAzNorth = (Math.sin(decRad) - Math.sin(latRad) * sinAlt)
            / (Math.cos(latRad) * cosAlt);
  cosAzNorth = Math.max(-1, Math.min(1, cosAzNorth));
  let azNorth = Math.acos(cosAzNorth); // 0~π (북 기준)

  // sinH로 동서 판별: sinH > 0 이면 오후(서쪽) → 서쪽 방위
  const sinH = Math.sin(hRad);
  if (sinH > 0) azNorth = 2 * Math.PI - azNorth; // 서쪽은 360-az

  // 남=0 기준(SunCalc 규약)으로 변환: azSouth = azNorth - π
  const az = azNorth - Math.PI;

  // 태양 방향 → Three.js 좌표계
  // SunCalc 규약: 남=0, 서쪽이 +az
  // Three.js: x = -sin(az)*cos(alt), y = sin(alt), z = -cos(az)*cos(alt)
  const sunDir = new THREE.Vector3(
    -Math.sin(az) * cosAlt,
     sinAlt,
    -Math.cos(az) * cosAlt,
  ).normalize();

  // 그림자 점 = 태양 반대 방향 × R
  const pt = sunDir.clone().negate().multiplyScalar(R);

  // 반구 내부(y < 0)만 유효
  if (pt.y >= 0) return null;
  return pt;
}

/**
 * 특정 적위(declination)에 대한 절기선 좌표 계산
 */
function calculateDeclinationCurve(decDeg) {
  const points = [];
  const decRad = decDeg * DEG2RAD;
  const latRad = LATITUDE * DEG2RAD;
  const R = BOWL_RADIUS - BOWL_THICKNESS - 0.002; // 내면에 딱 붙도록

  for (let H = -110; H <= 110; H += 0.8) {
    const pt = calcShadowProjection(decRad, H * DEG2RAD, latRad, R);
    if (pt) points.push(pt);
  }

  return points;
}

/**
 * 특정 시간각(hourAngle)에 대한 시각선 좌표 계산
 */
function calculateHourCurve(hourAngleDeg) {
  const points = [];
  const hRad = hourAngleDeg * DEG2RAD;
  const latRad = LATITUDE * DEG2RAD;
  const R = BOWL_RADIUS - BOWL_THICKNESS - 0.002;

  for (let dec = -23.44; dec <= 23.44; dec += 0.2) {
    const pt = calcShadowProjection(dec * DEG2RAD, hRad, latRad, R);
    if (pt) points.push(pt);
  }

  return points;
}

/**
 * 3D 좌표 배열을 TubeGeometry 곡선으로 렌더링
 */
function createLineOnBowl(points, material, thickness) {
  if (points.length < 2) return new THREE.Group();

  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  const segments = Math.max(points.length, 48);
  const tubeGeo = new THREE.TubeGeometry(curve, segments, thickness, 4, false);
  const mesh = new THREE.Mesh(tubeGeo, material);
  mesh.receiveShadow = true;
  return mesh;
}
