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
    const x = Math.sin(angleRad) * r;
    const zPos = Math.cos(angleRad) * r;  // 子=0°=북=+z

    // 한자 (위)
    const hanjaText = new Text();
    hanjaText.text = z.char;
    hanjaText.fontSize = 0.042;
    hanjaText.color = '#FFF8E7';
    hanjaText.font = FONT_URL;
    hanjaText.anchorX = 'center';
    hanjaText.anchorY = 'middle';
    hanjaText.position.set(x, 0.035, zPos);
    hanjaText.rotation.x = -Math.PI / 2;
    hanjaText.rotation.z = -angleRad + Math.PI;
    hanjaText.depthOffset = -0.1;
    hanjaText.sync();
    parent.add(hanjaText);

    // 한글 (아래, 더 작게)
    const korText = new Text();
    korText.text = z.name;
    korText.fontSize = 0.024;
    korText.color = '#FFD700';
    korText.font = FONT_URL;
    korText.anchorX = 'center';
    korText.anchorY = 'middle';

    // 한자보다 바깥쪽에 배치
    const rOuter = r + 0.04;
    const xOuter = Math.sin(angleRad) * rOuter;
    const zOuter = Math.cos(angleRad) * rOuter;
    korText.position.set(xOuter, 0.035, zOuter);
    korText.rotation.x = -Math.PI / 2;
    korText.rotation.z = -angleRad + Math.PI;
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
      orientTextOnBowl(text, pt);

      text.depthOffset = -0.1;
      text.sync();
      parent.add(text);
    }
  }
}

// ----- 시각선 라벨 -----
// mode='modern' → KST 시간 (동적 업데이트) + 부제 한자
// mode='classic' → 한자 큰 글씨 + 부제 한글
function createHourLabels(parent, mode) {
  for (const hour of HOUR_LINES) {
    const hRad = hour.hourAngle * DEG2RAD;
    const latRad = LATITUDE * DEG2RAD;

    const sinAlt = Math.cos(latRad) * Math.cos(hRad);
    if (sinAlt <= 0) continue;

    const alt = Math.asin(sinAlt);
    const cosAlt = Math.cos(alt);
    let cosAz = -Math.sin(latRad) * sinAlt / (Math.cos(latRad) * cosAlt);
    cosAz = Math.max(-1, Math.min(1, cosAz));
    let az = Math.acos(cosAz);
    if (hour.hourAngle > 0) az = -az;

    const r = BOWL_RADIUS - 0.04;
    const x = -Math.sin(az) * r;
    const zPos = -Math.cos(az) * r;
    const azAngle = Math.atan2(x, -zPos);

    if (mode === 'classic') {
      // === 원본 모드: 한자 큰 글씨 ===
      const mainText = new Text();
      mainText.text = hour.label;
      mainText.fontSize = hour.type === 'major' ? 0.036 : 0.024;
      mainText.color = '#FFF8E7';
      mainText.font = FONT_URL;
      mainText.anchorX = 'center';
      mainText.anchorY = 'middle';
      mainText.position.set(x, -0.02, zPos);
      mainText.rotation.x = -Math.PI / 2;
      mainText.rotation.z = -azAngle + Math.PI;
      mainText.depthOffset = -0.1;
      mainText.renderOrder = 10;
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
        const rInner = r - 0.07;
        subText.position.set(-Math.sin(az) * rInner, -0.02, -Math.cos(az) * rInner);
        subText.rotation.x = -Math.PI / 2;
        subText.rotation.z = -azAngle + Math.PI;
        subText.depthOffset = -0.1;
        subText.renderOrder = 10;
        subText.sync();
        parent.add(subText);
      }
    } else {
      // === 현대 모드: KST 시간 (동적 업데이트 가능) ===
      const mainText = new Text();
      mainText.name = `hour-modern-${hour.hourAngle}`;
      mainText.text = `${hour.hour}:00`; // 초기값, updateModernHourLabels()로 갱신
      mainText.fontSize = hour.type === 'major' ? 0.032 : 0.022;
      mainText.color = hour.type === 'major' ? '#FFF8E7' : '#E8D5B0';
      mainText.font = FONT_URL;
      mainText.anchorX = 'center';
      mainText.anchorY = 'middle';
      mainText.position.set(x, -0.02, zPos);
      mainText.rotation.x = -Math.PI / 2;
      mainText.rotation.z = -azAngle + Math.PI;
      mainText.depthOffset = -0.1;
      mainText.renderOrder = 10;
      mainText.sync();
      parent.add(mainText);

      // 한자 (부제, 안쪽 작게) - major만
      if (hour.type === 'major') {
        const subText = new Text();
        subText.text = `${hour.label}(${hour.name})`;
        subText.fontSize = 0.018;
        subText.color = '#FFD700';
        subText.font = FONT_URL;
        subText.anchorX = 'center';
        subText.anchorY = 'middle';
        const rInner = r - 0.07;
        subText.position.set(-Math.sin(az) * rInner, -0.02, -Math.cos(az) * rInner);
        subText.rotation.x = -Math.PI / 2;
        subText.rotation.z = -azAngle + Math.PI;
        subText.depthOffset = -0.1;
        subText.renderOrder = 10;
        subText.sync();
        parent.add(subText);
      }
    }
  }
}

/**
 * 현대 모드 시각 라벨을 날짜 기반 KST로 업데이트
 * 균시차 + 경도보정을 적용하여 각 시각선이 실제로 KST 몇 시에 해당하는지 표시
 */
export function updateModernHourLabels(labelsGroup, date) {
  const modernGroup = labelsGroup.getObjectByName('labels-modern');
  if (!modernGroup) return;

  // 균시차 + 경도보정 계산 (sun-position.js의 calcHourAngleAndDec와 동일 로직)
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = diff / 86400000;
  const gamma = 2 * Math.PI * (dayOfYear - 1) / 365;

  // Spencer 균시차 (분)
  const eqTime = 229.18 * (0.000075
    + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.04089 * Math.sin(2 * gamma));

  // 경도 보정 (분): KST 기준 경도 135°E, 서울 126.978°E
  const standardMeridian = 135;
  const longitudeCorrection = 4 * (LONGITUDE - standardMeridian); // 약 -32분

  // 진태양시 12:00 (H=0°) = KST (12 - (eqTime + lonCorr)/60) 시
  // 즉 시간각 H도의 시각선은 KST = (12 + H/15) - (eqTime + lonCorr)/60
  const correctionMinutes = eqTime + longitudeCorrection; // 총 보정 (분)

  for (const hour of HOUR_LINES) {
    const textObj = modernGroup.getObjectByName(`hour-modern-${hour.hourAngle}`);
    if (!textObj) continue;

    // 진태양시 = 12 + hourAngle/15 (시)
    const apparentSolarHour = 12 + hour.hourAngle / 15;
    // KST = 진태양시 - 보정 (분을 시로 변환)
    const kstHour = apparentSolarHour - correctionMinutes / 60;

    const kstH = Math.floor(kstHour);
    const kstM = Math.round((kstHour - kstH) * 60);
    const hStr = kstH.toString().padStart(2, '0');
    const mStr = Math.abs(kstM).toString().padStart(2, '0');

    textObj.text = `${hStr}:${mStr}`;
    textObj.sync();
  }
}

// ----- 공통: 반구 내면에 텍스트 방향 맞추기 -----
// 텍스트를 반구 내면에 붙여서, 위에서 내려다볼 때 정상적으로 읽히게 배치
function orientTextOnBowl(textObj, surfacePoint) {
  // 법선 = 표면점 → 원점 방향 (내면 법선, 안쪽 향함)
  const inwardNormal = surfacePoint.clone().normalize().negate();

  // 위치를 표면에서 약간 안쪽으로 이동 (반구 벽에 가리지 않도록)
  textObj.position.addScaledVector(inwardNormal, 0.005);

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
  textObj.renderOrder = 10;
  textObj.material && (textObj.material.depthTest = false);
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
    -Math.sin(az) * cosAlt,
    sinAlt,
    -Math.cos(az) * cosAlt,
  ).normalize();
  const pt = sunDir.clone().negate().multiplyScalar(R);

  if (pt.y >= 0) return null;
  return pt;
}
