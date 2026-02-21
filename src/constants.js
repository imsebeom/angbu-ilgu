// ===== 관측지: 서울(한양) =====
export const LATITUDE = 37.5665;
export const LONGITUDE = 126.9780;
export const LAT_RAD = LATITUDE * Math.PI / 180;
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

// ===== 앙부일구 물리 치수 (반구 반지름 = 1.0 기준) =====
export const BOWL_RADIUS = 1.0;
export const BOWL_THICKNESS = 0.025;
export const RIM_OUTER_RADIUS = 1.08;
export const RIM_HEIGHT = 0.06;
export const RIM_INNER_RADIUS = BOWL_RADIUS;
export const GNOMON_LENGTH = BOWL_RADIUS * 0.95;
export const GNOMON_BASE_WIDTH = 0.04;
export const GNOMON_TIP_OFFSET = 0.0; // 영침 끝 = 구 중심

// ===== 13개 절기선 적위(°) - 동지→하지 =====
// Spencer 공식 기반 실측 평균값 (SEASON_LINES와 동일)
export const DECLINATION_LINES = [
  -23.44,   // 동지
  -22.56,   // 소한/대설
  -20.14,   // 대한/소설
  -16.27,   // 입춘/입동
  -11.35,   // 우수/상강
  -5.77,    // 경칩/한로
  0,        // 춘분/추분
  5.89,     // 청명/백로
  11.48,    // 곡우/처서
  16.48,    // 입하/입추
  20.14,    // 소만/대서
  23.44,    // 하지
];

// 정확한 13개 절기선 (동지에서 하지까지 대칭)
// 적위값은 Spencer 공식 기반 실측 평균 (절기 대칭 쌍의 평균값 사용)
export const SEASON_LINES = [
  { declination: -23.44, label: '冬至', name: '동지' },
  { declination: -22.56, label: '小寒/大雪', name: '소한·대설' },     // (22.53+22.58)/2
  { declination: -20.14, label: '大寒/小雪', name: '대한·소설' },     // (20.19+20.09)/2
  { declination: -16.27, label: '立春/立冬', name: '입춘·입동' },     // (16.32+16.21)/2
  { declination: -11.35, label: '雨水/霜降', name: '우수·상강' },     // (11.38+11.31)/2
  { declination:  -5.77, label: '驚蟄/寒露', name: '경칩·한로' },     // (5.77+5.76)/2
  { declination:   0.0,  label: '春分/秋分', name: '춘분·추분' },
  { declination:   5.89, label: '淸明/白露', name: '청명·백로' },     // (5.97+5.81)/2
  { declination:  11.48, label: '穀雨/處暑', name: '곡우·처서' },     // (11.41+11.54)/2
  { declination:  16.48, label: '立夏/立秋', name: '입하·입추' },     // (16.45+16.51)/2
  { declination:  20.14, label: '小滿/大暑', name: '소만·대서' },     // (20.12+20.15)/2
  { declination:  23.44, label: '夏至', name: '하지' },
];

// ===== 24절기 상세 데이터 (적위: Spencer 공식 기반 + 연중 대략 날짜) =====
export const SOLAR_TERMS_24 = [
  { name: '소한', hanja: '小寒', month: 1, day: 6, declination: -22.53 },
  { name: '대한', hanja: '大寒', month: 1, day: 20, declination: -20.19 },
  { name: '입춘', hanja: '立春', month: 2, day: 4, declination: -16.32 },
  { name: '우수', hanja: '雨水', month: 2, day: 19, declination: -11.38 },
  { name: '경칩', hanja: '驚蟄', month: 3, day: 6, declination: -5.77 },
  { name: '춘분', hanja: '春分', month: 3, day: 21, declination: 0.13 },
  { name: '청명', hanja: '淸明', month: 4, day: 5, declination: 5.97 },
  { name: '곡우', hanja: '穀雨', month: 4, day: 20, declination: 11.41 },
  { name: '입하', hanja: '立夏', month: 5, day: 6, declination: 16.45 },
  { name: '소만', hanja: '小滿', month: 5, day: 21, declination: 20.12 },
  { name: '망종', hanja: '芒種', month: 6, day: 6, declination: 22.63 },
  { name: '하지', hanja: '夏至', month: 6, day: 21, declination: 23.44 },
  { name: '소서', hanja: '小暑', month: 7, day: 7, declination: 22.63 },
  { name: '대서', hanja: '大暑', month: 7, day: 23, declination: 20.15 },
  { name: '입추', hanja: '立秋', month: 8, day: 7, declination: 16.51 },
  { name: '처서', hanja: '處暑', month: 8, day: 23, declination: 11.54 },
  { name: '백로', hanja: '白露', month: 9, day: 8, declination: 5.81 },
  { name: '추분', hanja: '秋分', month: 9, day: 23, declination: 0.05 },
  { name: '한로', hanja: '寒露', month: 10, day: 8, declination: -5.76 },
  { name: '상강', hanja: '霜降', month: 10, day: 23, declination: -11.31 },
  { name: '입동', hanja: '立冬', month: 11, day: 7, declination: -16.21 },
  { name: '소설', hanja: '小雪', month: 11, day: 22, declination: -20.09 },
  { name: '대설', hanja: '大雪', month: 12, day: 7, declination: -22.58 },
  { name: '동지', hanja: '冬至', month: 12, day: 22, declination: -23.44 },
];

// ===== 시각선: 12지신 기반 시간 =====
// 앙부일구에는 낮 시간대(묘~유, 약 06시~18시)에 해당하는 시각선이 새겨짐
// 각 시(時)는 초(初)와 정(正)으로 나뉨 → 2시간을 1시간씩 분할
// 시각선 = 시간각(Hour Angle) 기준, 12시 정오 = H=0
export const HOUR_LINES = [
  { hourAngle: -90, label: '卯', name: '묘', hour: 6,  type: 'major' },
  { hourAngle: -75, label: '卯正', name: '묘정', hour: 7,  type: 'minor' },
  { hourAngle: -60, label: '辰', name: '진', hour: 8,  type: 'major' },
  { hourAngle: -45, label: '辰正', name: '진정', hour: 9,  type: 'minor' },
  { hourAngle: -30, label: '巳', name: '사', hour: 10, type: 'major' },
  { hourAngle: -15, label: '巳正', name: '사정', hour: 11, type: 'minor' },
  { hourAngle:   0, label: '午', name: '오', hour: 12, type: 'major' },
  { hourAngle:  15, label: '午正', name: '오정', hour: 13, type: 'minor' },
  { hourAngle:  30, label: '未', name: '미', hour: 14, type: 'major' },
  { hourAngle:  45, label: '未正', name: '미정', hour: 15, type: 'minor' },
  { hourAngle:  60, label: '申', name: '신', hour: 16, type: 'major' },
  { hourAngle:  75, label: '申正', name: '신정', hour: 17, type: 'minor' },
  { hourAngle:  90, label: '酉', name: '유', hour: 18, type: 'major' },
];

// ===== 12지신 전체 (지평환 표시용) =====
export const ZODIAC_12 = [
  { char: '子', name: '자', angle: 0 },    // 북
  { char: '丑', name: '축', angle: 30 },
  { char: '寅', name: '인', angle: 60 },
  { char: '卯', name: '묘', angle: 90 },   // 동
  { char: '辰', name: '진', angle: 120 },
  { char: '巳', name: '사', angle: 150 },
  { char: '午', name: '오', angle: 180 },  // 남
  { char: '未', name: '미', angle: 210 },
  { char: '申', name: '신', angle: 240 },
  { char: '酉', name: '유', angle: 270 },  // 서
  { char: '戌', name: '술', angle: 300 },
  { char: '亥', name: '해', angle: 330 },
];

// ===== 12지신으로 시간 변환 =====
// 전통 시법: 子=23~01, 丑=01~03, ..., 午=11~13, ..., 亥=21~23
// 각 시의 전반(홀수시)=初, 후반(짝수시)=正
// 예: 11:00=午初, 12:00=午正, 12:30=午正 2각, 13:00=未初
export function getJisinTime(hours, minutes) {
  const jisinNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const jisinKo = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

  // 子시가 23시부터 시작이므로 1시간 앞당겨 계산
  let adjusted = (hours + 1) % 24;
  const index = Math.floor(adjusted / 2);

  // 초/정 판별: 전반 1시간=初, 후반 1시간=正
  const isJeong = (adjusted % 2) === 1;

  // 각(刻) 계산: 1각=15분, 0~14분=정각, 15~29분=1각, 30~44분=2각, 45~59분=3각
  const clampedMin = Math.min(Math.max(0, minutes), 59);
  const gak = Math.floor(clampedMin / 15);
  const gakHanjaNum = ['', '一', '二', '三'];

  const choJeongHanja = isJeong ? '正' : '初';
  const choJeongKo = isJeong ? '정' : '초';

  return {
    hanja: jisinNames[index] + choJeongHanja,
    korean: jisinKo[index] + choJeongKo,
    gak,  // 0~3
    fullHanja: jisinNames[index] + choJeongHanja + (gak > 0 ? ` ${gakHanjaNum[gak]}刻` : ' 正刻'),
    fullKorean: jisinKo[index] + choJeongKo + (gak > 0 ? ` ${gak}각` : ' 정각'),
  };
}

// ===== 현재 절기 판별 =====
export function getCurrentSolarTerm(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfYear = Math.floor((month - 1) * 30.44 + day);

  let closest = SOLAR_TERMS_24[0];
  let minDiff = Infinity;
  for (const term of SOLAR_TERMS_24) {
    const termDOY = Math.floor((term.month - 1) * 30.44 + term.day);
    const diff = Math.abs(dayOfYear - termDOY);
    if (diff < minDiff) {
      minDiff = diff;
      closest = term;
    }
  }
  return closest;
}
