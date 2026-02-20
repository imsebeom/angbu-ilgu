import * as THREE from 'three';

// 청동 외부 재질
export function createBronzeMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xCD7F32,
    metalness: 0.85,
    roughness: 0.35,
    envMapIntensity: 0.8,
  });
}

// 반구 내면 재질 (BackSide)
export function createBowlInnerMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xB08040,
    metalness: 0.6,
    roughness: 0.55,
    envMapIntensity: 0.4,
    side: THREE.BackSide,
  });
}

// 각인선 재질 (시각선/절기선)
export function createEngravedMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x1A0A00,
    metalness: 0.2,
    roughness: 0.9,
  });
}

// 절기선 재질 (가로선 - 밝은 황금색)
export function createSeasonLineMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xDAA520,
    metalness: 0.6,
    roughness: 0.4,
  });
}

// 시각선 재질 (세로선 - 진한 흑갈색)
export function createHourLineMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x0A0500,
    metalness: 0.15,
    roughness: 0.95,
  });
}

// 그림자 마커 재질
export function createMarkerMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xFF3333,
    transparent: true,
    opacity: 0.9,
  });
}

// 마커 글로우 재질
export function createMarkerGlowMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xFF6644,
    transparent: true,
    opacity: 0.3,
  });
}
