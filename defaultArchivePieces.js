/**
 * [기본 아카이브] 항상 등록되어 있는 3개의 예시 뜨개물
 * - IndexedDB가 비어있을 때(최초 실행, 혹은 완전 초기화 후) page_S5.seedDefaultArchive()가
 *   아래 getDefaultArchivePieces()의 결과를 knitTable에 자동으로 등록한다.
 * - KnitPiece.absorbArchiveData() + transformAndAlignGrid()와 동일한 방식으로
 *   cells / knitArray를 만들어 두므로, 실제 등록 데이터와 구조가 동일하다.
 */

// emotionTagKo(한글 감정) → emotionTag(영문). page_S4.js의 cellEye 매핑과 동일
function _seedEmotionTagFromKo(tagKo) {
  if (tagKo === '짜증' || tagKo === '슬픔') return 'FROWN';
  if (tagKo === '놀람') return 'SURPRISED';
  if (tagKo === '미묘함' || tagKo === '표정 변화') return 'BLURRY';
  return 'NEUTRAL';
}

// KnitCell.calculateStyles()와 동일한 비율로 셀 색상을 계산 (p5 의존 없는 순수 JS 버전)
function _seedCellStyle(emotionTagKo, emotionTag, tension, speed) {
  const baseHueMap = {
    '짜증': 0, '중립': 51, '해탈': 103, '미묘함': 154,
    '슬픔': 206, '긴장': 257, '놀람': 309
  };
  const stitchShiftMap = { FROWN: 45, SURPRISED: 110, BLURRY: 180, NEUTRAL: 30 };

  const baseHue = baseHueMap[emotionTagKo] !== undefined ? baseHueMap[emotionTagKo] : 154;
  const bgHue = (baseHue + (-15 + 30 * tension) + 360) % 360; // map(tension,0,1,-15,15)

  let bgBri = 55 + 25 * speed; // map(speed,0,1,55,80)
  if (emotionTagKo === '중립' || emotionTagKo === '해탈') bgBri = Math.min(bgBri + 10, 100);
  const sat = 10 + 40 * speed; // map(speed,0,1,10,50)

  const stitchShift = stitchShiftMap[emotionTag] !== undefined ? stitchShiftMap[emotionTag] : 30;
  return {
    bgHue, sat, bgBri,
    stitchHue: (bgHue + stitchShift + 360) % 360,
    stitchBri: Math.min(bgBri + 10, 100)
  };
}

// segments: [text, emotionTagKo, tension(0~1), speed(0~1)][] — 1초 단위 입력 로그를 그대로 흉내냄
function _buildSeedPiece(nickname, privacy, daysAgo, segments) {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

  const cells = segments.map(([text, emotionTagKo, tension, speed], i) => {
    const emotionTag = _seedEmotionTagFromKo(emotionTagKo);
    const style = _seedCellStyle(emotionTagKo, emotionTag, tension, speed);
    return {
      knitStamp: i + 1,
      text,
      syllables: text.replace(/ /g, '').length,
      isBackspace: false,
      typingSpeed: speed,
      emotionTag,
      emotionIntensity: tension,
      emotionTagKo,
      bgHue: style.bgHue,
      stitchHue: style.stitchHue,
      sat: style.sat,
      bgBri: style.bgBri,
      stitchBri: style.stitchBri
    };
  });

  // KnitPiece.transformAndAlignGrid()와 동일한 10열 격자 재배치
  const knitArray = [];
  let row = 0, col = 0;
  cells.forEach(cell => {
    const cleanText = cell.text.replace(/ /g, '');
    const loopCount = Math.max(cleanText.length, 1);
    for (let i = 0; i < loopCount; i++) {
      const ch = cleanText.length > 0 ? cleanText[i] : (cell.text || ' ');
      knitArray.push({
        _row: row, _col: col,
        knitStamp: cell.knitStamp,
        text: ch,
        speed: cell.typingSpeed,
        isBackspace: cell.isBackspace,
        tension: cell.emotionIntensity,
        eye: cell.emotionTag,
        emotionTagKo: cell.emotionTagKo,
        bgHue: cell.bgHue,
        stitchHue: cell.stitchHue,
        sat: cell.sat,
        bgBri: cell.bgBri,
        stitchBri: cell.stitchBri
      });
      col++;
      if (col >= 10) { col = 0; row++; }
    }
  });

  return {
    nickname: privacy === 'partial' ? '' : nickname,
    privacy,
    date,
    cells,
    knitArray,
    isDefault: true
  };
}

// 항상 아카이브에 존재하는 3개의 디폴트 예시 뜨개물
function getDefaultArchivePieces() {
  return [
    // 1) 복합적인 감정(짜증→긴장→슬픔→해탈→미묘함→중립→놀람)이 섞인 하루
    _buildSeedPiece('과제하기 싫어', 'public', 2, [
      ['오늘은진짜', '짜증', 0.75, 0.8],
      ['정신없는',   '짜증', 0.7,  0.75],
      ['하루였다',   '짜증', 0.65, 0.7],
      ['팀플회의가', '긴장', 0.7,  0.6],
      ['계속됐고',   '긴장', 0.65, 0.55],
      ['발표준비도', '슬픔', 0.55, 0.35],
      ['버거웠다',   '슬픔', 0.6,  0.3],
      ['그래도끝',   '해탈', 0.3,  0.45],
      ['나고나니',   '해탈', 0.35, 0.5],
      ['마음이좀',   '해탈', 0.25, 0.55],
      ['편해졌다',   '미묘함', 0.4, 0.6],
      ['기분도좋아', '미묘함', 0.35, 0.65],
      ['내일은더',   '중립', 0.5,  0.5],
      ['차분하게',   '중립', 0.5,  0.5],
      ['잘해낼수',   '놀람', 0.55, 0.7],
      ['있을거다',   '놀람', 0.6,  0.75]
    ]),

    // 2) 짜증 → 해탈로 감정이 변화하는 직장인의 하루
    _buildSeedPiece('직딩의 하루', 'public', 5, [
      ['출근하자마자', '짜증', 0.8,  0.85],
      ['상사한테',     '짜증', 0.75, 0.8],
      ['혼났다',       '짜증', 0.7,  0.75],
      ['오늘따라',     '짜증', 0.65, 0.7],
      ['되는일이',     '짜증', 0.6,  0.65],
      ['하나도없네',   '짜증', 0.65, 0.6],
      ['퇴근시간이',   '해탈', 0.3,  0.5],
      ['다가오니까',   '해탈', 0.35, 0.55],
      ['마음이',       '해탈', 0.25, 0.6],
      ['편안해진다',   '해탈', 0.3,  0.65],
      ['역시퇴근이',   '해탈', 0.35, 0.7],
      ['최고다',       '해탈', 0.25, 0.75]
    ]),

    // 3) 일부 공개(텍스트 비공개) — 놀람이 지배적이고 슬픔·긴장이 함께 묻어나는 기록
    _buildSeedPiece('', 'partial', 9, [
      ['깜짝놀랄',       '놀람', 0.65, 0.75],
      ['소식을들었다',   '놀람', 0.7,  0.8],
      ['마음이복잡해서', '슬픔', 0.6,  0.7],
      ['잠도잘못잤다',   '슬픔', 0.55, 0.65],
      ['내일이걱정돼서', '긴장', 0.65, 0.7],
      ['계속생각났다',   '긴장', 0.6,  0.65],
      ['그래도놀랍게도', '놀람', 0.6,  0.75],
      ['좋은쪽으로풀렸다', '놀람', 0.65, 0.8],
      ['정말다행이었다', '놀람', 0.7,  0.85],
      ['이제는편하다',   '놀람', 0.6,  0.8]
    ])
  ];
}

window.getDefaultArchivePieces = getDefaultArchivePieces;
