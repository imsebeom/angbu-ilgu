import * as THREE from 'three';
import { BOWL_RADIUS, BOWL_THICKNESS, RIM_OUTER_RADIUS, RIM_HEIGHT, LATITUDE, DEG2RAD } from './constants.js';
import { createBronzeMaterial, createBowlInnerMaterial } from './materials.js';

/**
 * 앙부일구 전체 3D 모델 그룹을 생성한다.
 * 구성: 수영면(반구), 영침, 지평환, 용주(4개), 십자수부
 */
export function buildAngbuIlgu() {
  const group = new THREE.Group();
  const bronze = createBronzeMaterial();
  const innerMat = createBowlInnerMaterial();

  // === 1. 수영면 (반구) ===
  group.add(createBowl(bronze, innerMat));

  // === 2. 지평환 (테두리 링) ===
  group.add(createRim(bronze));

  // === 3. 영침 (gnomon) ===
  group.add(createGnomon(bronze));

  // === 4. 용주 (4개 받침) ===
  group.add(createDragonSupports(bronze));

  // === 5. 십자수부 (십자 기둥) ===
  group.add(createCrossBase(bronze));

  // === 6. 바닥 받침판 ===
  group.add(createBasePlate(bronze));

  return group;
}

// ----- 수영면 (오목 반구) -----
function createBowl(outerMat, innerMat) {
  const bowlGroup = new THREE.Group();

  // 외부 반구 (DoubleSide - 안쪽에서도 depth buffer에 기록되어 바깥 물체를 차폐)
  const outerDoubleMat = outerMat.clone();
  outerDoubleMat.side = THREE.DoubleSide;
  const outerGeo = new THREE.SphereGeometry(
    BOWL_RADIUS, 128, 64,
    0, Math.PI * 2,
    Math.PI / 2, Math.PI / 2  // 하반구
  );
  const outerMesh = new THREE.Mesh(outerGeo, outerDoubleMat);
  outerMesh.castShadow = false;
  outerMesh.receiveShadow = false;
  bowlGroup.add(outerMesh);

  // 내부 면 (그림자가 맺히는 면) - DoubleSide로 불투명하게 차폐
  // 안쪽에서 봐도 바깥 구조물(용주/십자수부)이 비치지 않음
  const bowlInnerMat = new THREE.MeshStandardMaterial({
    color: 0xB08040,
    metalness: 0.6,
    roughness: 0.55,
    envMapIntensity: 0.4,
    side: THREE.DoubleSide,
  });
  const innerGeo = new THREE.SphereGeometry(
    BOWL_RADIUS - BOWL_THICKNESS, 128, 64,
    0, Math.PI * 2,
    Math.PI / 2, Math.PI / 2
  );
  const innerMesh = new THREE.Mesh(innerGeo, bowlInnerMat);
  innerMesh.receiveShadow = true;
  bowlGroup.add(innerMesh);

  // 상단 테두리 디스크 (반구 입구의 얇은 원반)
  const ringGeo = new THREE.RingGeometry(
    BOWL_RADIUS - BOWL_THICKNESS, BOWL_RADIUS, 128
  );
  const ringMat = outerMat.clone();
  ringMat.side = THREE.DoubleSide;
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0;
  bowlGroup.add(ringMesh);

  return bowlGroup;
}

// ----- 지평환 (테두리 링) -----
function createRim(mat) {
  // LatheGeometry로 단면을 회전시켜 링 생성
  const rimProfile = [
    new THREE.Vector2(BOWL_RADIUS - 0.01, RIM_HEIGHT / 2),
    new THREE.Vector2(RIM_OUTER_RADIUS, RIM_HEIGHT / 2),
    new THREE.Vector2(RIM_OUTER_RADIUS + 0.01, RIM_HEIGHT / 4),
    new THREE.Vector2(RIM_OUTER_RADIUS + 0.015, 0),
    new THREE.Vector2(RIM_OUTER_RADIUS + 0.01, -RIM_HEIGHT / 4),
    new THREE.Vector2(RIM_OUTER_RADIUS, -RIM_HEIGHT / 2),
    new THREE.Vector2(BOWL_RADIUS - 0.01, -RIM_HEIGHT / 2),
  ];

  const rimGeo = new THREE.LatheGeometry(rimProfile, 128);
  const rim = new THREE.Mesh(rimGeo, mat);
  rim.castShadow = false;
  rim.receiveShadow = false;
  return rim;
}

// ----- 영침 (gnomon) -----
// 실물: 납작한 삼각형 판(뿔) 형태.
// 반구 남쪽 내벽(적도면 부근)에 넓은 뿌리가 부착되고,
// 뾰족한 끝이 구 중심(북쪽)을 향해 북극성 방향을 가리킴.
// 위도(37.5°)만큼 기울어져 천구 북극 방향.
// 좌표계: x=동(+), y=위(+), z=북(+), 남=-z
function createGnomon(mat) {
  const gnomonGroup = new THREE.Group();

  const latRad = LATITUDE * DEG2RAD;

  // 영침은 북극 방향(천구 북극)을 가리킴
  // 뿌리: 반구 남쪽 내벽에 부착. 위도(37.5°)만큼 기울어져야 하므로
  // 남쪽 벽에서 적도면보다 아래에 위치.
  // 영침 축 방향: 남쪽 벽→구 중심, 위도각만큼 위로 기울어짐
  const innerR = BOWL_RADIUS - BOWL_THICKNESS - 0.005;
  // 남쪽 벽 부착점: 반구 내면 위의 점, 남쪽(-z)이면서 위도각만큼 아래
  // 구면 좌표: theta = 90° + lat (적도면에서 위도각만큼 아래)
  const attachTheta = (Math.PI / 2) + latRad; // 적도면에서 위도각만큼 아래
  const rootY = innerR * Math.cos(attachTheta); // 아래 방향
  const rootZ = -innerR * Math.sin(attachTheta) * 1.0; // 남쪽(-z)
  const rootPos = new THREE.Vector3(0, rootY, rootZ);

  // 끝: 구 중심(원점). 앙부일구 원리상 영침 끝이 구 중심에 있어야
  // 그림자가 격자선 위에 정확히 맺힘.
  const tipPos = new THREE.Vector3(0, 0, 0);

  // 영침 방향: 뿌리→끝
  const direction = tipPos.clone().sub(rootPos).normalize();
  const shaftLength = rootPos.distanceTo(tipPos);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  // 1) 납작한 삼각형 판 (뿔 형태) - Shape로 정의
  // 로컬 좌표: y=영침 축 방향(뿌리→끝), x=넓은 면 방향
  const bladeShape = new THREE.Shape();
  const baseHalfW = 0.15; // 뿌리 쪽 반폭 (실물처럼 넓게)
  const tipHalfW = 0.005; // 끝 쪽 반폭 (뾰족)

  // 뿌리(y=0)에서 끝(y=shaftLength)으로
  // 뿌리 쪽에 장식적 장방형 돌출 (실물의 뿔 장식 표현)
  bladeShape.moveTo(-baseHalfW, 0);
  bladeShape.lineTo(-baseHalfW * 1.2, 0.05);  // 뿌리 장식 약간 벌어짐
  bladeShape.lineTo(-baseHalfW * 0.8, 0.12);  // 장식에서 본체로 좁아짐
  bladeShape.lineTo(-tipHalfW, shaftLength);
  bladeShape.lineTo(tipHalfW, shaftLength);
  bladeShape.lineTo(baseHalfW * 0.8, 0.12);
  bladeShape.lineTo(baseHalfW * 1.2, 0.05);
  bladeShape.lineTo(baseHalfW, 0);
  bladeShape.closePath();

  const bladeExtrudeSettings = { depth: 0.012, bevelEnabled: false };
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrudeSettings);
  bladeGeo.translate(0, 0, -0.004); // 중심 정렬

  const blade = new THREE.Mesh(bladeGeo, mat);
  blade.position.copy(rootPos);
  // 영침 축 방향 정렬: 로컬 Y→direction
  // axisRot 없음: 넓은 면(로컬 x)이 동서(월드 x) 방향 → 남쪽에서 보면 넓은 면이 정면
  blade.quaternion.copy(quaternion);
  blade.castShadow = true;
  gnomonGroup.add(blade);

  // 2) 끝부분 작은 구 (tip)
  const tipGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const tip = new THREE.Mesh(tipGeo, mat);
  tip.position.copy(tipPos);
  tip.castShadow = true;
  gnomonGroup.add(tip);

  return gnomonGroup;
}

// ----- 용주 (4개 S자 곡선 받침) -----
function createDragonSupports(mat) {
  const supportsGroup = new THREE.Group();
  const supportHeight = 1.15;

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI / 2) + Math.PI / 4; // 45°, 135°, 225°, 315°
    const support = createSingleDragonSupport(mat, supportHeight);
    support.rotation.y = angle;
    supportsGroup.add(support);
  }

  return supportsGroup;
}

function createSingleDragonSupport(mat, height) {
  const group = new THREE.Group();

  // S자 곡선 경로 - 지평환 바깥(RIM_OUTER_RADIUS)에서 시작하여 아래로
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(RIM_OUTER_RADIUS + 0.02, -0.03, 0),
    new THREE.Vector3(RIM_OUTER_RADIUS + 0.06, -0.15, 0),
    new THREE.Vector3(RIM_OUTER_RADIUS + 0.04, -0.45, 0.02),
    new THREE.Vector3(RIM_OUTER_RADIUS - 0.05, -0.75, -0.01),
    new THREE.Vector3(RIM_OUTER_RADIUS - 0.15, -height, 0),
  ]);

  const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.022, 8, false);
  const tube = new THREE.Mesh(tubeGeo, mat);
  tube.castShadow = false;
  group.add(tube);

  // 상단 장식 (용머리 간략화 - 작은 구) - 지평환 테두리에 위치
  const headGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.set(RIM_OUTER_RADIUS + 0.02, 0.01, 0);
  head.castShadow = false;
  group.add(head);

  return group;
}

// ----- 십자수부 -----
function createCrossBase(mat) {
  const group = new THREE.Group();
  const y = -1.15; // 반구 바닥(y≈-1.0) 아래
  const armLen = 0.45; // 반구 내부에 관통하지 않도록
  const armW = 0.04;
  const armH = 0.035;

  // 십자 팔 2개
  const arm1Geo = new THREE.BoxGeometry(armLen * 2, armH, armW);
  const arm1 = new THREE.Mesh(arm1Geo, mat);
  arm1.position.y = y;
  arm1.castShadow = false;
  arm1.receiveShadow = false;
  group.add(arm1);

  const arm2Geo = new THREE.BoxGeometry(armW, armH, armLen * 2);
  const arm2 = new THREE.Mesh(arm2Geo, mat);
  arm2.position.y = y;
  arm2.castShadow = false;
  arm2.receiveShadow = false;
  group.add(arm2);

  // 중심 원기둥
  const centerGeo = new THREE.CylinderGeometry(0.05, 0.05, armH * 1.5, 16);
  const center = new THREE.Mesh(centerGeo, mat);
  center.position.y = y;
  center.castShadow = false;
  group.add(center);

  return group;
}

// ----- 바닥 받침판 -----
function createBasePlate(mat) {
  const geo = new THREE.CylinderGeometry(0.3, 0.35, 0.04, 32);
  const baseMat = mat.clone();
  baseMat.color.setHex(0x8B7355);
  baseMat.metalness = 0.3;
  baseMat.roughness = 0.7;
  const plate = new THREE.Mesh(geo, baseMat);
  plate.position.y = -1.20;
  plate.receiveShadow = true;
  return plate;
}
