import { Text } from 'troika-three-text';
import * as THREE from 'three';
import { ZODIAC_12, SEASON_LINES, HOUR_LINES, RIM_OUTER_RADIUS, BOWL_RADIUS, BOWL_THICKNESS, DEG2RAD, LATITUDE, LONGITUDE } from './constants.js';

// Google Fonts CDN - Noto Sans KR Bold (가독성 좋은 고딕체, OTF)
const FONT_URL = 'https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.otf';

/**
 * 두 모드의 텍스트 라벨을 생성하여 반환
 * - modern: 현대식 (12시, 춘분·추분 등 한글)
 * - classic: 원본 한자 (午, 春分/秋分 등)
 */
export function createAllLabels() {
  const modernGroup = new THREE.Group();
  modernGroup.name = 'labels-modern';

  const classicGroup = new THREE.Group();
  classicGroup.name = 'labels-classic';

  // 지평환 12지신은 양쪽 공통
  createZodiacLabels(modernGroup);
  createZodiacLabels(classicGroup);

  // 절기선 라벨
  createSeasonLabels(modernGroup, 'modern');
  createSeasonLabels(classicGroup, 'classic');

  // 시각선 라벨
  createHourLabels(modernGroup, 'modern');
  createHourLabels(classicGroup, 'classic');

  // 정오선(午) 위 절기 교차점 라벨
  createNoonLineLabels(modernGroup, 'modern');
  createNoonLineLabels(classicGroup, 'classic');

  // 춘분선(적위=0°) 위 시각 교차점 라벨
  createEquinoxLineLabels(modernGroup, 'modern');
  createEquinoxLineLabels(classicGroup, 'classic');

  // 기본: 현대 모드 표시
  classicGroup.visible = false;

  const wrapper = new THREE.Group();
  wrapper.add(modernGroup);
  wrapper.add(classicGroup);
  return wrapper;
}

/**
 * 라벨 모드 전환: 'modern' 또는 'classic'
 */
export function setLabelMode(labelsGroup, mode) {
  const modern = labelsGroup.getObjectByName('labels-modern');
  const classic = labelsGroup.getObjectByName('labels-classic');
  if (modern) modern.visible = (mode === 'modern');
  if (classic) classic.visible = (mode === 'classic');
}

// ----- 12지신 한자+한글 (지평환 위) -----
function createZodiacLabels(parent) {
  for (const z of ZODIAC_12) {
    const angleRad = z.angle * DEG2RAD;

    // 지평환 테두리 중앙 위치
    const r = (RIM_OUTER_RADIUS + BOWL_RADIUS) / 2 + 0.01;
    const x = -Math.sin(angleRad) * r;  // x반전: 화면 오른쪽=동
    const zPos = Math.cos(angleRad) * r;  // 子=0°=북=+z

    // 글자가 바깥→중심 방향으로 읽히도록 회전 각도 계산
    // rotation.x=-PI/2로 눕힌 상태에서 rotation.z로 방위 회전
    const facingAngle = Math.atan2(x, zPos);

    // 한자 (안쪽)
    const hanjaText = new Text();
    hanjaText.text = z.char;
    hanjaText.fontSize = 0.042;
    hanjaText.color = '#FFF8E7';
    hanjaText.font = FONT_URL;
    hanjaText.anchorX = 'center';
    hanjaText.anchorY = 'middle';
    hanjaText.position.set(x, 0.035, zPos);
    hanjaText.rotation.x = -Math.PI / 2;
    hanjaText.rotation.z = facingAngle + Math.PI;
    hanjaText.depthOffset = -0.1;
    hanjaText.sync();
    parent.add(hanjaText);

    // 한글 (바깥쪽, 더 작게)
    const korText = new Text();
    korText.text = z.name;
    korText.fontSize = 0.024;
    korText.color = '#FFD700';
    korText.font = FONT_URL;
    korText.anchorX = 'center';
    korText.anchorY = 'middle';

    const rOuter = r + 0.04;
    const xOuter = -Math.sin(angleRad) * rOuter;
    const zOuter = Math.cos(angleRad) * rOuter;
    korText.position.set(xOuter, 0.035, zOuter);
    korText.rotation.x = -Math.PI / 2;
    korText.rotation.z = facingAngle + Math.PI;
    korText.depthOffset = -0.1;
    korText.sync();
    parent.add(korText);
  }
}

// ----- 절기선 라벨 -----
// mode='modern' → 한글명 (동지, 춘분·추분)
// mode='classic' → 한자명 (冬至, 春分/秋分)
function createSeasonLabels(parent, mode) {
  for (const season of SEASON_LINES) {
    const sides = [
      { hDeg: -88, anchorX: 'right', offsetX: -0.02 },
      { hDeg: 88, anchorX: 'left', offsetX: 0.02 },
    ];

    for (const side of sides) {
      const pt = calcLabelPosition(season.declination, side.hDeg);
      if (!pt) continue;

      const text = new Text();
      text.text = mode === 'classic' ? season.label : season.name;
      text.fontSize = mode === 'classic' ? 0.022 : 0.024;
      text.color = mode === 'classic' ? '#FFF8E7' : '#FFD700';
      text.font = FONT_URL;
      text.anchorX = side.anchorX;
      text.anchorY = 'middle';

      text.position.set(pt.x + side.offsetX, pt.y, pt.z);
      orientTextOnBowl(text, pt, true);

      text.depthOffset = -0.1;
      text.sync();
      parent.add(text);
    }
  }
}

// ----- 시각선 라벨 -----
// mode='modern' → KST 정시 표시 (격자선이 KST 정시에 맞춰져 있으므로 고정 라벨)
//                 라벨 위치는 날짜에 따라 동적 업데이트 (격자선 위치와 동기화)
// mode='classic' → 한자 큰 글씨 + 부제 한글 (진태양시 기준, 고정)
function createHourLabels(parent, mode) {
  for (const hour of HOUR_LINES) {
    // 격자선 상단 끝점을 찾아서 라벨 배치
    const pos = _calcHourLabelPosition(hour.hourAngle);
    if (!pos) continue;

    const x = pos.x;
    const zPos = pos.z;
    const az = pos.az;
    const azAngle = pos.azAngle;
    const labelY = Math.min(pos.y + 0.03, -0.01);

    if (mode === 'classic') {
      // === 원본 모드: 한자 큰 글씨 (진태양시 기준, 고정 위치) ===
      const mainText = new Text();
      mainText.text = hour.label;
      mainText.fontSize = hour.type === 'major' ? 0.036 : 0.024;
      mainText.color = '#FFF8E7';
      mainText.font = FONT_URL;
      mainText.anchorX = 'center';
      mainText.anchorY = 'middle';
      mainText.position.set(x, labelY, zPos);
      mainText.rotation.x = -Math.PI / 2;
      mainText.rotation.z = -azAngle;
      mainText.depthOffset = -0.1;
      mainText.sync();
      parent.add(mainText);

      // 한글 + 현대시간 (부제, 안쪽 작게)
      if (hour.type === 'major') {
        const subText = new Text();
        subText.text = `${hour.name}(${hour.hour}시)`;
        subText.fontSize = 0.017;
        subText.color = '#B0A590';
        subText.font = FONT_URL;
        subText.anchorX = 'center';
        subText.anchorY = 'middle';
        const subY = pos.y - 0.02;
        subText.position.set(x, subY, zPos);
        subText.rotation.x = -Math.PI / 2;
        subText.rotation.z = -azAngle;
        subText.depthOffset = -0.1;
        subText.sync();
        parent.add(subText);
      }
    } else {
      // === 현대 모드: KST 정시 표시 ===
      // 격자선이 KST 정시에 맞춰져 있으므로 라벨은 고정 정시 표시
      // 라벨 위치는 updateModernHourLabels()에서 날짜에 따라 동적 갱신
      const mainText = new Text();
      mainText.name = `hour-modern-${hour.hourAngle}`;
      mainText.text = `${hour.hour}:00`;
      mainText.fontSize = hour.type === 'major' ? 0.032 : 0.022;
      mainText.color = hour.type === 'major' ? '#FFF8E7' : '#E8D5B0';
      mainText.font = FONT_URL;
      mainText.anchorX = 'center';
      mainText.anchorY = 'middle';
      mainText.position.set(x, labelY, zPos);
      mainText.rotation.x = -Math.PI / 2;
      mainText.rotation.z = -azAngle;
      mainText.depthOffset = -0.1;
      mainText.sync();
      parent.add(mainText);

      // 한자 (부제, 안쪽 작게) - major만
      if (hour.type === 'major') {
        const subText = new Text();
        subText.name = `hour-modern-sub-${hour.hourAngle}`;
        subText.text = `${hour.label}(${hour.name})`;
        subText.fontSize = 0.018;
        subText.color = '#FFD700';
        subText.font = FONT_URL;
        subText.anchorX = 'center';
        subText.anchorY = 'middle';
        const subY = pos.y - 0.02;
        subText.position.set(x, subY, zPos);
        subText.rotation.x = -Math.PI / 2;
        subText.rotation.z = -azAngle;
        subText.depthOffset = -0.1;
        subText.sync();
        parent.add(subText);
      }
    }
  }
}

/**
 * 현대 모드 시각 라벨 위치를 날짜에 맞게 업데이트
 * 격자선이 KST 정시에 맞춰져 있으므로, 라벨 위치도 격자선과 동기화
 * KST 정시 → 진태양시 시간각 → 반구 내 위치 계산
 */
export function updateModernHourLabels(labelsGroup, date) {
  const modernGroup = labelsGroup.getObjectByName('labels-modern');
  if (!modernGroup) return;

  // 균시차 + 경도보정 계산
  const correction = _calcCorrectionMinutes(date);

  for (const hour of HOUR_LINES) {
    const textObj = modernGroup.getObjectByName(`hour-modern-${hour.hourAngle}`);
    if (!textObj) continue;

    // KST 정시 → 진태양시 시간각
    const kstHour = hour.hour;
    const solarTime = kstHour + correction / 60;
    const hourAngleDeg = (solarTime - 12) * 15;

    // 라벨 위치 계산 (시간각 기반, 격자선 상단 끝점)
    const pos = _calcHourLabelPosition(hourAngleDeg);
    if (pos) {
      // 라벨을 격자선 상단 끝보다 약간 위(지평환 쪽)에 배치
      const labelY = Math.min(pos.y + 0.03, -0.01);
      textObj.position.set(pos.x, labelY, pos.z);
      textObj.rotation.x = -Math.PI / 2;
      textObj.rotation.z = -pos.azAngle;
      textObj.visible = true;
    } else {
      textObj.visible = false;
    }
    textObj.sync();

    // 부제 라벨도 업데이트
    const subObj = modernGroup.getObjectByName(`hour-modern-sub-${hour.hourAngle}`);
    if (subObj) {
      if (pos) {
        // 부제를 메인 라벨 아래(반구 안쪽)에 배치
        const subY = pos.y - 0.02;
        subObj.position.set(pos.x, subY, pos.z);
        subObj.rotation.x = -Math.PI / 2;
        subObj.rotation.z = -pos.azAngle;
        subObj.visible = true;
      } else {
        subObj.visible = false;
      }
      subObj.sync();
    }

    // 춘분선 교차점 라벨도 업데이트
    const eqObj = modernGroup.getObjectByName(`equinox-modern-${hour.hourAngle}`);
    if (eqObj) {
      const labelOffsetDec = -2;
      const eqPt = calcLabelPosition(labelOffsetDec, hourAngleDeg);
      if (eqPt) {
        eqObj.position.copy(eqPt);
        orientTextOnBowl(eqObj, eqPt, true);
        eqObj.visible = true;
      } else {
        eqObj.visible = false;
      }
      eqObj.sync();
    }
  }
}

// 시간각으로부터 라벨 위치 계산
// 격자선의 지평환 근처(상단 끝점)를 찾아서 라벨 배치
function _calcHourLabelPosition(hourAngleDeg) {
  const hRad = hourAngleDeg * DEG2RAD;
  const latRad = LATITUDE * DEG2RAD;
  const R = BOWL_RADIUS - BOWL_THICKNESS - 0.002;

  // 격자선의 상단 끝점(y≈0 근처)을 찾기 위해 적위를 스캔
  // 격자선은 dec=-23.44~+23.44를 순회하며 그림자 점을 계산
  // y가 가장 0에 가까운(지평환에 가장 가까운) 점을 라벨 위치로 사용
  let bestPt = null;
  let bestY = -Infinity;

  for (let dec = -23.44; dec <= 23.44; dec += 0.5) {
    const decRad = dec * DEG2RAD;
    const sinAlt = Math.sin(latRad) * Math.sin(decRad)
                 + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
    if (sinAlt <= 0.01) continue;

    const alt = Math.asin(sinAlt);
    const cosAlt = Math.cos(alt);
    if (cosAlt < 0.001) continue;

    let cosAzNorth = (Math.sin(decRad) - Math.sin(latRad) * sinAlt)
              / (Math.cos(latRad) * cosAlt);
    cosAzNorth = Math.max(-1, Math.min(1, cosAzNorth));
    let azNorth = Math.acos(cosAzNorth);
    if (Math.sin(hRad) > 0) azNorth = 2 * Math.PI - azNorth;
    const az = azNorth - Math.PI;

    const sunDir = new THREE.Vector3(
       Math.sin(az) * cosAlt,  // x반전
      sinAlt,
      -Math.cos(az) * cosAlt,
    ).normalize();
    const pt = sunDir.clone().negate().multiplyScalar(R);

    if (pt.y < 0 && pt.y > bestY) {
      bestY = pt.y;
      const x = pt.x;
      const z = pt.z;
      const azAngle = Math.atan2(x, -z);
      bestPt = { x, y: pt.y, z, az, azAngle };
    }
  }

  return bestPt;
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

// ----- 정오선(午, H=0°) 위 절기 교차점 라벨 -----
// 정오선과 각 절기선이 만나는 교차점에 절기명 표시
function createNoonLineLabels(parent, mode) {
  // 약간 시간각을 오프셋하여 라벨이 교차점 옆(서쪽)에 표시되도록
  const labelOffsetH = 3; // 3° 오프셋 (정오선 바로 옆)

  for (const season of SEASON_LINES) {
    const pt = calcLabelPosition(season.declination, labelOffsetH);
    if (!pt) continue;

    const text = new Text();
    text.text = mode === 'classic' ? season.label : season.name;
    text.fontSize = 0.018;
    text.color = '#1a1a1a';
    text.font = FONT_URL;
    text.anchorX = 'left';
    text.anchorY = 'middle';

    text.position.copy(pt);
    orientTextOnBowl(text, pt, true);

    text.depthOffset = -0.1;
    text.sync();
    parent.add(text);
  }
}

// ----- 춘분선(적위=0°) 위 시각 교차점 라벨 -----
// 춘분선과 각 시각선이 만나는 교차점에 시각명 표시
function createEquinoxLineLabels(parent, mode) {
  // 약간 적위를 오프셋하여 라벨이 교차점 아래(동지 방향)에 표시되도록
  const labelOffsetDec = -2; // -2° 오프셋 (춘분선 바로 아래)

  for (const hour of HOUR_LINES) {
    const pt = calcLabelPosition(labelOffsetDec, hour.hourAngle);
    if (!pt) continue;

    const text = new Text();
    if (mode === 'classic') {
      text.text = hour.label;
    } else {
      // 현대 모드: name 부여하여 동적 업데이트 가능
      text.name = `equinox-modern-${hour.hourAngle}`;
      text.text = `${hour.hour}시`;
    }
    text.fontSize = 0.018;
    text.color = '#1a1a1a';
    text.font = FONT_URL;
    text.anchorX = 'center';
    text.anchorY = 'top';

    text.position.copy(pt);
    orientTextOnBowl(text, pt, true);

    text.depthOffset = -0.1;
    text.sync();
    parent.add(text);
  }
}

// ----- 공통: 반구 내면에 텍스트 방향 맞추기 -----
// 텍스트를 반구 내면에 붙여서, 위에서 내려다볼 때 정상적으로 읽히게 배치
function orientTextOnBowl(textObj, surfacePoint, keepDepthTest = false) {
  // 법선 = 표면점 → 원점 방향 (내면 법선, 안쪽 향함)
  const inwardNormal = surfacePoint.clone().normalize().negate();

  // 위치를 표면에서 약간 안쪽으로 이동 (반구 벽에 가리지 않도록)
  textObj.position.addScaledVector(inwardNormal, 0.02);

  // 월드 "위" 방향
  const worldUp = new THREE.Vector3(0, 1, 0);

  // tangent (텍스트의 가로 방향) = up × inwardNormal
  let tangent = new THREE.Vector3().crossVectors(worldUp, inwardNormal).normalize();

  // correctedUp (구 표면에서의 실제 위쪽) = inwardNormal × tangent
  let correctedUp = new THREE.Vector3().crossVectors(inwardNormal, tangent).normalize();

  // 핵심: correctedUp의 y 성분이 음수이면 텍스트가 뒤집힘
  // 이 경우 correctedUp과 inwardNormal을 반전시킴 (tangent는 유지 → 좌우 보존)
  if (correctedUp.y < 0) {
    correctedUp.negate();
    inwardNormal.negate();
  }

  // 회전 행렬 구성: [tangent, correctedUp, inwardNormal]
  // troika Text 기본 방향: X=오른쪽, Y=위, Z=정면(앞)
  const m = new THREE.Matrix4();
  m.makeBasis(tangent, correctedUp, inwardNormal);
  textObj.quaternion.setFromRotationMatrix(m);

  // 반구 벽보다 앞에 렌더링되도록
  if (!keepDepthTest) {
    textObj.renderOrder = 10;
    textObj.material && (textObj.material.depthTest = false);
  }
}

// ----- 공통: 라벨 위치 계산 -----
function calcLabelPosition(decDeg, hDeg) {
  const decRad = decDeg * DEG2RAD;
  const latRad = LATITUDE * DEG2RAD;
  const hRad = hDeg * DEG2RAD;

  const sinAlt = Math.sin(latRad) * Math.sin(decRad)
               + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
  if (sinAlt <= 0) return null;

  const alt = Math.asin(sinAlt);
  const cosAlt = Math.cos(alt);
  if (cosAlt < 0.001) return null;

  let cosAzNorth = (Math.sin(decRad) - Math.sin(latRad) * sinAlt)
            / (Math.cos(latRad) * cosAlt);
  cosAzNorth = Math.max(-1, Math.min(1, cosAzNorth));
  let azNorth = Math.acos(cosAzNorth);
  const sinH = Math.sin(hRad);
  if (sinH > 0) azNorth = 2 * Math.PI - azNorth;
  const az = azNorth - Math.PI;

  const R = BOWL_RADIUS - BOWL_THICKNESS - 0.01;
  const sunDir = new THREE.Vector3(
     Math.sin(az) * cosAlt,  // x반전
    sinAlt,
    -Math.cos(az) * cosAlt,
  ).normalize();
  const pt = sunDir.clone().negate().multiplyScalar(R);

  if (pt.y >= 0) return null;
  return pt;
}
