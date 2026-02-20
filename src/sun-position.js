import * as THREE from 'three';
import SunCalc from 'suncalc';
import { LATITUDE, LONGITUDE, RAD2DEG } from './constants.js';

/**
 * SunCalc에서 태양 위치를 구하고 Three.js 좌표로 변환
 *
 * SunCalc 규약:
 *   altitude: 수평 기준 라디안 (양=위)
 *   azimuth: 남쪽=0, 서쪽 방향이 양수(시계방향)
 *
 * Three.js 규약 (본 프로젝트):
 *   x = 동(+) / 서(-)
 *   y = 위(+) / 아래(-)
 *   z = 북(+) / 남(-)
 *   (앙부일구 정면이 남쪽, 즉 -z 방향을 바라봄)
 */
export function getSunPosition(date) {
  const pos = SunCalc.getPosition(date, LATITUDE, LONGITUDE);

  const alt = pos.altitude;  // 라디안
  const az = pos.azimuth;    // 라디안, 남=0, 서=+

  // Three.js 단위 벡터
  // SunCalc az: 남=0 → Three.js에서 남=-z 방향
  // az가 양수(서쪽)일 때 x는 음수(서)
  const direction = new THREE.Vector3(
    -Math.sin(az) * Math.cos(alt),  // x: 서쪽이 - (SunCalc 서=+이므로 반전)
     Math.sin(alt),                  // y: 위
    -Math.cos(az) * Math.cos(alt),  // z: 남=-z (SunCalc 남=0일때 cos=1)
  ).normalize();

  return {
    direction,
    altitude: alt,
    azimuth: az,
    altitudeDeg: alt * RAD2DEG,
    azimuthDeg: az * RAD2DEG,
    isAboveHorizon: alt > 0,
  };
}

/**
 * DirectionalLight의 위치를 태양 방향으로 설정
 */
export function updateSunLight(sunLight, sunData, distance = 8) {
  if (sunData.isAboveHorizon) {
    sunLight.position.copy(sunData.direction.clone().multiplyScalar(distance));
    // 태양 고도에 따른 강도 조절 (지평선 부근 약화)
    const intensity = Math.max(0, Math.min(3.0, 1.5 + sunData.altitude * 1.5));
    sunLight.intensity = intensity;
    // 색온도: 고도 낮을 때 따뜻한 색
    const warmth = Math.max(0, 1 - sunData.altitude * 0.5);
    sunLight.color.setRGB(1.0, 0.95 - warmth * 0.1, 0.88 - warmth * 0.2);
  } else {
    sunLight.intensity = 0;
  }
}

/**
 * Spencer (1971) 공식으로 태양 적위 계산 (절기 판별 보조)
 */
export function getSolarDeclination(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / 86400000);
  const gamma = 2 * Math.PI * (dayOfYear - 1) / 365;
  const declinationRad = 0.006918
    - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  return declinationRad * RAD2DEG;
}

/**
 * 방위 방향 한글 문자열
 */
export function getAzimuthLabel(azDeg) {
  // azDeg: 남=0, 서=+90, 북=±180, 동=-90
  const a = ((azDeg % 360) + 360) % 360;
  const dirs = ['남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서',
                '북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동'];
  const idx = Math.round(a / 22.5) % 16;
  return dirs[idx];
}
