import * as THREE from 'three';
import { BOWL_RADIUS, BOWL_THICKNESS, LATITUDE, LONGITUDE, DEG2RAD, SEASON_LINES, HOUR_LINES } from './constants.js';
import { createSeasonLineMaterial, createHourLineMaterial } from './materials.js';

/**
 * 시각선과 절기선을 모두 생성하여 그룹으로 반환
 * - seasonGroup: 절기선 (양쪽 모드 공통)
 * - classicHourGroup: 원본 시각선 (진태양시 기준, 고정)
 * - modernHourGroup: 현대 시각선 (KST 정시 기준, 날짜에 따라 변경)
 */
export function createAllLines(date) {
  const group = new THREE.Group();
  const seasonMat = createSeasonLineMaterial();
  const hourMat = createHourLineMaterial();

  // === 절기선 (가로 곡선) - 금색 계열 (공통) ===
  for (const season of SEASON_LINES) {
    const points = calculateDeclinationCurve(season.declination);
    if (points.length > 3) {
      const line = createLineOnBowl(points, seasonMat, 0.0012);
      group.add(line);
    }
  }

  // === 원본 시각선 (진태양시 기준, 고정) ===
  const classicHourGroup = new THREE.Group();
  classicHourGroup.name = 'hour-lines-classic';
  for (const hour of HOUR_LINES) {
    const points = calculateHourCurve(hour.hourAngle);
    if (points.length > 3) {
      const thickness = hour.type === 'major' ? 0.002 : 0.001;
      const line = createLineOnBowl(points, hourMat, thickness);
      classicHourGroup.add(line);
    }
  }
  group.add(classicHourGroup);

  // === 현대 시각선 (KST 정시 기준, 날짜에 따라 변경) ===
  const modernHourGroup = new THREE.Group();
  modernHourGroup.name = 'hour-lines-modern';
  _buildModernHourLines(modernHourGroup, hourMat, date || new Date());
  group.add(modernHourGroup);

  // 기본: 현대 모드 표시
  classicHourGroup.visible = false;

  return group;
}

/**
 * 현대 모드 시각선을 날짜 기반으로 재생성
 * KST 정시(6:00~18:00)를 진태양시 시간각으로 변환하여 격자선 위치를 결정
 */
export function updateModernHourLines(linesGroup, date) {
  const modernGroup = linesGroup.getObjectByName('hour-lines-modern');
  if (!modernGroup) return;

  // 기존 자식 모두 제거
  while (modernGroup.children.length > 0) {
    const child = modernGroup.children[0];
    modernGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
  }

  const hourMat = createHourLineMaterial();
  _buildModernHourLines(modernGroup, hourMat, date);
}

/**
 * 시각선 모드 전환: 'modern' 또는 'classic'
 */
export function setHourLineMode(linesGroup, mode) {
  const classic = linesGroup.getObjectByName('hour-lines-classic');
  const modern = linesGroup.getObjectByName('hour-lines-modern');
  if (classic) classic.visible = (mode === 'classic');
  if (modern) modern.visible = (mode === 'modern');
}

// 내부: 현대 모드 시각선 빌드
function _buildModernHourLines(group, hourMat, date) {
  // 균시차 + 경도 보정 계산
  const correction = _calcCorrectionMinutes(date);

  // KST 정시(6~18시)에 대한 시각선 생성
  // HOUR_LINES의 구조를 참고하여 동일한 시간 범위 사용
  for (const hour of HOUR_LINES) {
    // 이 시각선의 KST 시간 = hour.hour (6, 7, 8, ..., 18)
    const kstHour = hour.hour;

    // KST 정시 → 진태양시 시간각으로 변환
    // solarTime = kstHour + correction/60
    // hourAngle = (solarTime - 12) * 15
    const solarTime = kstHour + correction / 60;
    const hourAngleDeg = (solarTime - 12) * 15;

    const points = calculateHourCurve(hourAngleDeg);
    if (points.length > 3) {
      const thickness = hour.type === 'major' ? 0.002 : 0.001;
      const line = createLineOnBowl(points, hourMat, thickness);
      group.add(line);
    }
  }
}

// 균시차 + 경도 보정 계산 (분 단위)
function _calcCorrectionMinutes(date) {
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
  // 카메라가 남쪽(-z)에서 바라보므로 동서(x)를 반전하여 화면 오른쪽=동
  const sunDir = new THREE.Vector3(
     Math.sin(az) * cosAlt,
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
