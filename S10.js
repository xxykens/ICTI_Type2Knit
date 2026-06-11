(function () {
  const exampleParts = [
    { text: '아니파일보내라고한지가언젠데', tag: '긴장', speed: 0.86, tension: 0.82 },
    { text: '눈감아주는것도하루이틀이지', tag: '짜증', speed: 0.82, tension: 0.78 },
    { text: '잠수타고연락씹고', tag: '긴장', speed: 0.68, tension: 0.74 },
    { text: '수업안오면해결이되나', tag: '놀람', speed: 0.72, tension: 0.64 },
    { text: '그냥내가해야되나', tag: '슬픔', speed: 0.46, tension: 0.42 }
  ];

  const LEGEND_SPEC = window.KnitLegendSpec || {
    title: '감정별 뜨개 패턴',
    descriptionLines: [
      '타이핑하는 동안 웹캠이 표정 변화(눈썹·눈·입)를',
      '기준 표정과 비교해 추출한 감정과 타이핑 속도에 따라',
      '코의 색과 형태 등이 달라져요.'
    ],
    emotions: [
      { name: '짜증', hue: 0 },
      { name: '중립', hue: 51 },
      { name: '슬픔', hue: 206 },
      { name: '긴장', hue: 257 },
      { name: '놀람', hue: 309 },
      { name: '해탈', hue: 103 },
      { name: '미묘', hue: 154 }
    ],
    shapeExamples: [
      {
        title: '입꼬리 긴장도',
        items: [
          { label: '긍정', shape: 'circle', eye: 'NEUTRAL', filled: true, speedLevel: 'shape_gray' },
          { label: '부정', shape: 'square', eye: 'NEUTRAL', filled: true, speedLevel: 'shape_gray' }
        ]
      },
      {
        title: '눈 표정',
        items: [
          { label: '찌푸림', shape: 'square', eye: 'FROWN', filled: true, speedLevel: 'shape_gray' },
          { label: '충격', shape: 'square', eye: 'SURPRISED', filled: true, speedLevel: 'shape_gray' },
          { label: '기본', shape: 'square', eye: 'NEUTRAL', filled: true, speedLevel: 'shape_gray' }
        ]
      }
    ],
    speedExamples: [
      { label: '빠름', note: '(채움, 채도/명도↑)', shape: 'square', eye: 'NEUTRAL', filled: true, speedLevel: 'fast' },
      { label: '보통', note: '(두꺼운 선)', shape: 'square', eye: 'NEUTRAL', filled: false, speedLevel: 'medium' },
      { label: '느림', note: '(얇은 선, 채도/명도↓)', shape: 'square', eye: 'NEUTRAL', filled: false, speedLevel: 'slow' }
    ]
  };

  window.KnitLegendSpec = LEGEND_SPEC;

  const TAG_DESCRIPTIONS = {
    '기본표정': '눈·눈썹·입꼬리의 기본 기준값으로 감정 태그가 계산됩니다.',
    '짜증': '기준 표정보다 눈썹에 힘이 들어갈 때 나타나는 태그입니다.',
    '긴장': '기준 표정보다 눈이 작아지고 눈가에 힘이 들어갈 때 나타나는 태그입니다.',
    '놀람': '기준 표정보다 눈썹이 올라가고 눈이 크게 떠질 때 나타나는 태그입니다.',
    '슬픔': '기준 표정보다 입꼬리가 내려가고 슬퍼 보일 때 나타나는 태그입니다.',
    '해탈': '기준 표정보다 입꼬리가 올라가고 표정이 풀려 보일 때 나타나는 태그입니다.',
    '중립': '기준 표정과 큰 차이 없이 편안한 얼굴이 유지될 때 나타나는 태그입니다.',
    '미묘': '변화는 있지만 한 가지 감정으로 분명히 보이지 않을 때 나타나는 태그입니다.',
    '미묘함': '변화는 있지만 한 가지 감정으로 분명히 보이지 않을 때 나타나는 태그입니다.',
    '얼굴 없음': '얼굴을 안정적으로 읽지 못해 표정 판단이 어려울 때 나타나는 태그입니다.',
    '기준값 없음': '기준 표정이 아직 없어 표정 변화를 비교하기 어려울 때 나타나는 태그입니다.'
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function mapRange(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }

  function hsbToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  function hsbToCss(h, s, v) {
    const [r, g, b] = hsbToRgb(h, s, v);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hsbToRgba(h, s, v, a) {
    const [r, g, b] = hsbToRgb(h, s, v);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function baseHueFor(tag) {
    if (tag === '짜증') return 0;
    if (tag === '중립') return 51;
    if (tag === '해탈') return 103;
    if (tag === '놀람') return 309;
    if (tag === '슬픔') return 206;
    if (tag === '긴장') return 257;
    return 154;
  }

  function stitchHueShift(index) {
    return [-24, 12, -8, 28, -16, 20, 4][index % 7];
  }

  function makeCell(char, part, index) {
    const baseHue = baseHueFor(part.tag);
    const browScore = part.tag === '짜증' || part.tag === '긴장' ? 0.75 : part.tag === '해탈' ? -0.45 : 0.1;
    const eyeScore = part.tag === '놀람' ? 0.95 : part.tag === '슬픔' ? -0.5 : 0.15;
    const mouthScore = part.tag === '슬픔' || part.tag === '짜증' ? 0.55 : part.tag === '해탈' ? -0.55 : 0;
    const scoreHueShift =
      mapRange(browScore, -1, 1, -30, 30) * 0.4 +
      mapRange(eyeScore, -1, 1, -30, 30) * 0.3 +
      mapRange(mouthScore, -1, 1, -30, 30) * 0.3;
    const tensionHueShift = mapRange(part.tension, 0, 1, -15, 15);
    const bgHue = (baseHue + clamp(scoreHueShift + tensionHueShift, -45, 45) + 360) % 360;
    let bgBri = mapRange(part.speed, 0, 1, 55, 80);

    if (part.tag === '중립' || part.tag === '해탈') bgBri = Math.min(bgBri + 10, 100);

    const sat = mapRange(part.speed, 0, 1, 10, 50);
    return {
      text: char,
      tag: part.tag,
      speed: part.speed,
      tension: part.tension,
      eye: part.tag,
      bgHue,
      stitchHue: (bgHue + stitchHueShift(index) + 360) % 360,
      sat,
      bgBri,
      stitchBri: Math.min(bgBri + 10, 100)
    };
  }

  function buildCells() {
    const cells = [];
    exampleParts.forEach((part) => {
      Array.from(part.text.replace(/ /g, '')).forEach((char) => {
        cells.push(makeCell(char, part, cells.length));
      });
    });
    return cells;
  }

  function buildPreviewPath(count) {
    const path = [];

    path.push({ r: 0, c: 0, w: 1 });
    for (let c = 0; c < 3; c += 1) path.push({ r: 1, c, w: 3 });
    for (let c = 0; c < 5; c += 1) path.push({ r: 2, c, w: 5 });
    for (let c = 0; c < 7; c += 1) path.push({ r: 3, c, w: 7 });
    for (let c = 0; c < 9; c += 1) path.push({ r: 4, c, w: 9 });

    let row = 5;
    while (path.length < count) {
      for (let c = 0; c < 10 && path.length < count; c += 1) path.push({ r: row, c, w: 10 });
      row += 1;
    }

    return path.slice(0, count);
  }

  function buildPreviewPositions(count, metrics) {
    return buildPreviewPath(count).map((pos) => {
      const startX = metrics.centerX - ((pos.w - 1) * metrics.spacing) / 2;
      return {
        x: startX + pos.c * metrics.spacing,
        y: metrics.baseY + pos.r * metrics.spacing,
        r: pos.r,
        c: pos.c,
        w: pos.w
      };
    });
  }

  function drawRoundedRect(ctx, x, y, w, h, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
      return;
    }
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function drawKnitCell(ctx, cell, idx, metrics) {
    const position = metrics.positions[idx];
    if (!position) return;

    const px = position.x;
    const py = position.y;
    const [bgR, bgG, bgB] = hsbToRgb(cell.bgHue, cell.sat / 100, cell.bgBri / 100);
    const [stR, stG, stB] = hsbToRgb(cell.stitchHue, cell.sat / 100, cell.stitchBri / 100);
    const isFilled = cell.speed >= 0.6;
    const actualSize = isFilled ? metrics.cellSize : metrics.cellSize - 4;
    const half = actualSize / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(92,74,52,0.16)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    if (cell.tension >= 0.5) {
      drawRoundedRect(ctx, px - half, py - half, actualSize, actualSize, 6);
    } else {
      ctx.arc(px, py, half, 0, Math.PI * 2);
    }

    if (isFilled) {
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.lineWidth = mapRange(cell.speed, 0, 0.6, 1.5, 4);
      ctx.stroke();
    }
    ctx.restore();

    const r = metrics.cellSize * 0.3;
    ctx.strokeStyle = `rgb(${stR},${stG},${stB})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (cell.eye === '짜증') {
      ctx.moveTo(px - r, py - r);
      ctx.lineTo(px + r, py + r);
      ctx.moveTo(px + r, py - r);
      ctx.lineTo(px - r, py + r);
    } else if (cell.eye === '놀람') {
      for (let i = 0; i < 8; i += 1) {
        const radius = i % 2 === 0 ? r : r * 0.4;
        const angle = Math.PI / 4 * i;
        const x = px + Math.cos(angle) * radius;
        const y = py + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(px - r, py - r);
      ctx.lineTo(px, py + r * 0.8);
      ctx.lineTo(px + r, py - r);
    }
    ctx.stroke();

    if (cell.text && cell.text.trim().length > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.font = `bold ${Math.round(metrics.cellSize * 0.5)}px 'HSHwalkong', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.text.trim()[0], px, py + 1);
    }
  }

  function drawThreadBase(ctx, metrics) {
    const rows = [];

    metrics.positions.forEach((position) => {
      if (!rows[position.r]) rows[position.r] = [];
      rows[position.r].push(position);
    });

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    rows.forEach((rowPositions, row) => {
      const sorted = rowPositions.slice().sort((a, b) => a.x - b.x);
      const y = sorted[0].y;
      const left = sorted[0].x - metrics.cellSize * 0.72;
      const right = sorted[sorted.length - 1].x + metrics.cellSize * 0.72;

      ctx.strokeStyle = row % 2 === 0 ? 'rgba(182,158,122,0.36)' : 'rgba(231,225,216,0.74)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(left, y + 1);
      sorted.forEach((position) => {
        const x = position.x;
        ctx.quadraticCurveTo(x - 12, y - 8, x, y + 1);
        ctx.quadraticCurveTo(x + 12, y + 10, x + 24, y + 1);
      });
      ctx.lineTo(right, y + 1);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(182,158,122,0.28)';
    ctx.lineWidth = 4;
    for (let col = 0; col < 10; col += 1) {
      const x = metrics.centerX - 4.5 * metrics.spacing + col * metrics.spacing;
      ctx.beginPath();
      ctx.moveTo(x - 2, metrics.baseY - 28);
      rows.forEach((rowPositions) => {
        const y = rowPositions[0].y;
        ctx.quadraticCurveTo(x + 7, y - 12, x - 2, y + 4);
      });
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSingleNeedle(ctx, heatIntensity, length) {
    const grad = ctx.createLinearGradient(0, -25, 0, length);
    const r = Math.round(225 + (255 - 225) * heatIntensity);
    const g = Math.round(215 + (80 - 215) * heatIntensity);
    const b = Math.round(195 + (80 - 195) * heatIntensity);

    grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
    grad.addColorStop(1, 'rgb(225, 205, 175)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-3, -25);
    ctx.lineTo(3, -25);
    ctx.lineTo(7, length);
    ctx.lineTo(-7, length);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -25, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgb(225, 215, 195)';
    ctx.beginPath();
    ctx.arc(0, length, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNeedles(ctx, metrics) {
    const centerX = metrics.centerX;
    const centerY = metrics.baseY - metrics.cellSize * 0.8 - 18;
    const length = 410;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.globalAlpha = 0.9;

    ctx.save();
    ctx.rotate(Math.PI / 4 - 0.04);
    ctx.translate(0, 6);
    drawSingleNeedle(ctx, 0, length);
    ctx.restore();

    ctx.save();
    ctx.rotate(-Math.PI / 4 + 0.04);
    ctx.translate(0, -3);
    drawSingleNeedle(ctx, 0, length);
    ctx.restore();

    ctx.restore();
  }

  // 🌟 [새로 추가] 순수 2D Canvas용 정적 범례 그리기 함수
  function drawStaticLegend(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    const scale = 1.0; // already handled by canvas scaling, keep default coordinate system
    ctx.scale(scale, scale);

    const boxW = 280;
    const boxH = 350;

    // 배경 박스 제외 (요청사항 반영)
    
    // 제목
    ctx.fillStyle = 'rgb(50, 50, 50)';
    ctx.font = "bold 15px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('감정별 뜨개 패턴', 15, 15);

    // 설명
    ctx.fillStyle = 'rgb(100, 100, 100)';
    ctx.font = "10px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('타이핑하는 동안 웹캠이 표정 변화(눈썹·눈·입)를', 15, 36);
    ctx.fillText('기준 표정과 비교해 추출한 감정과 타이핑 속도에 따라', 15, 50);
    ctx.fillText('코의 색과 형태 등이 달라져요.', 15, 64);

    // [섹션 1]
    ctx.fillStyle = 'rgb(50, 50, 50)';
    ctx.font = "12px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('■ 감정 베이스 색상', 15, 95);

    const emotions = [
      { name: '짜증', hue: 0 }, { name: '중립', hue: 51 },
      { name: '해탈', hue: 103 }, { name: '미묘', hue: 154 },
      { name: '슬픔', hue: 206 }, { name: '긴장', hue: 257 },
      { name: '놀람', hue: 309 }
    ];

    emotions.forEach((emo, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const cx = 15 + col * 65;
      const cy = 115 + row * 24;

      const [r, g, b] = hsbToRgb(emo.hue, 0.4, 0.9); // fill
      const [sr, sg, sb] = hsbToRgb(emo.hue, 0.5, 0.7); // stroke

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.strokeStyle = `rgb(${sr},${sg},${sb})`;
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      drawRoundedRect(ctx, cx, cy, 13, 13, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgb(0, 0, 30)';
      ctx.font = "10.5px 'HSHwalkong', 'Noto Serif KR', serif";
      ctx.fillText(emo.name, cx + 18, cy + 1);
    });

    // [섹션 2]
    ctx.fillStyle = 'rgb(50, 50, 50)';
    ctx.font = "12px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('■ 형태 및 코 무늬', 15, 168);

    ctx.fillStyle = 'rgb(100, 100, 100)';
    ctx.font = "10px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('입꼬리 긴장도', 15, 188);
    ctx.fillText('눈 표정', 130, 188);

    // 미니 셀 헬퍼 함수
    function drawMiniCell2D(mx, my, shape, eye, isFilled, speedLevel) {
      ctx.save();
      ctx.translate(mx, my);
      const size = 18;
      const half = size / 2;
      let bri = 70; let sw = 1.5;
      
      if (speedLevel === 'fast') bri = 85;
      else if (speedLevel === 'medium') { bri = 55; sw = 3; }
      else if (speedLevel === 'slow') { bri = 30; sw = 1; }
      else if (speedLevel === 'shape_gray') bri = 55;

      const [br, bg, bb] = hsbToRgb(0, 0, bri/100);
      
      ctx.beginPath();
      if (shape === 'square') {
        drawRoundedRect(ctx, -half, -half, size, size, 4);
      } else {
        ctx.arc(0, 0, half, 0, Math.PI * 2);
      }

      if (isFilled) {
        ctx.fillStyle = `rgb(${br},${bg},${bb})`;
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgb(${br},${bg},${bb})`;
        ctx.lineWidth = sw;
        ctx.stroke();
      }

      const [str, stg, stb] = hsbToRgb(0, 0, Math.min((bri+20)/100, 1));
      ctx.strokeStyle = `rgb(${str},${stg},${stb})`;
      ctx.lineWidth = 1.2;
      const rad = size * 0.3;
      
      ctx.beginPath();
      if (eye === 'FROWN') {
        ctx.moveTo(-rad, -rad); ctx.lineTo(rad, rad);
        ctx.moveTo(rad, -rad); ctx.lineTo(-rad, rad);
      } else if (eye === 'SURPRISED') {
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? rad : rad * 0.4;
          const a = Math.PI / 4 * i;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.moveTo(-rad, -rad); ctx.lineTo(0, rad * 0.8); ctx.lineTo(rad, -rad);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.textAlign = 'center';
    drawMiniCell2D(35, 220, 'circle', 'NEUTRAL', true, 'shape_gray'); ctx.fillText('긍정', 35, 235);
    drawMiniCell2D(75, 220, 'square', 'NEUTRAL', true, 'shape_gray'); ctx.fillText('부정', 75, 235);
    drawMiniCell2D(140, 220, 'square', 'FROWN', true, 'shape_gray'); ctx.fillText('찌푸림', 140, 235);
    drawMiniCell2D(182, 220, 'square', 'SURPRISED', true, 'shape_gray'); ctx.fillText('충격', 182, 235);
    drawMiniCell2D(225, 220, 'square', 'NEUTRAL', true, 'shape_gray'); ctx.fillText('기본', 225, 235);

    // [섹션 3]
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgb(50, 50, 50)';
    ctx.font = "12px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('■ 타이핑 속도', 15, 265);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgb(100, 100, 100)';
    ctx.font = "10px 'HSHwalkong', 'Noto Serif KR', serif";

    drawMiniCell2D(45, 295, 'square', 'NEUTRAL', true, 'fast'); 
    ctx.fillText('빠름', 45, 310); ctx.fillText('(채움, 채도/명도↑)', 45, 324);
    
    drawMiniCell2D(140, 295, 'square', 'NEUTRAL', false, 'medium'); 
    ctx.fillText('보통', 140, 310); ctx.fillText('(두꺼운 선)', 140, 324);

    drawMiniCell2D(235, 295, 'square', 'NEUTRAL', false, 'slow'); 
    ctx.fillText('느림', 235, 310); ctx.fillText('(얇은 선, 채도/명도↓)', 235, 324);

    ctx.restore();
  }

  function faceSvgForTag(tag) {
    const label = tag || '미묘함';
    const faceBase = `
      <path class="face-corner" d="M22 50 V34 C22 27 27 22 34 22 H50"/>
      <path class="face-corner" d="M90 22 H106 C113 22 118 27 118 34 V50"/>
      <path class="face-corner" d="M118 90 V106 C118 113 113 118 106 118 H90"/>
      <path class="face-corner" d="M50 118 H34 C27 118 22 113 22 106 V90"/>
    `;
    const nose = `<path class="face-nose" d="M70 58 C68 70 79 76 70 83 C66 86 62 86 58 86"/>`;
    const parts = {
      '짜증': `
        <path class="face-brow" d="M48 50 L62 55"/>
        <path class="face-brow" d="M92 50 L78 55"/>
        <path class="face-eye" d="M56 64 V72"/>
        <path class="face-eye" d="M84 64 V72"/>
        ${nose}
        <path class="face-mouth" d="M57 101 C64 95 77 95 84 101"/>
      `,
      '긴장': `
        <path class="face-brow" d="M48 48 C53 45 59 45 64 48"/>
        <path class="face-brow" d="M76 48 C82 45 88 45 93 48"/>
        <path class="face-eye" d="M56 64 V72"/>
        <path class="face-eye" d="M84 64 V72"/>
        ${nose}
        <path class="face-mouth" d="M57 99 C62 97 66 101 70 99 C75 97 79 101 84 99"/>
      `,
      '놀람': `
        <path class="face-brow" d="M49 47 C54 44 60 44 65 47"/>
        <path class="face-brow" d="M75 47 C81 44 87 44 92 47"/>
        <circle class="face-open-eye" cx="56" cy="67" r="3.5"/>
        <circle class="face-open-eye" cx="84" cy="67" r="3.5"/>
        <path class="face-nose" d="M70 59 C68 68 76 73 70 80"/>
        <ellipse class="face-open-mouth" cx="70" cy="98" rx="8.5" ry="10"/>
      `,
      '슬픔': `
        <path class="face-brow" d="M48 53 C54 49 60 49 65 53"/>
        <path class="face-brow" d="M75 53 C81 49 87 49 93 53"/>
        <path class="face-eye" d="M56 64 V72"/>
        <path class="face-eye" d="M84 64 V72"/>
        ${nose}
        <path class="face-mouth" d="M57 103 C64 97 77 97 85 103"/>
      `,
      '해탈': `
        <path class="face-brow" d="M49 51 C55 49 61 49 66 51"/>
        <path class="face-brow" d="M74 51 C80 49 86 49 92 51"/>
        <path class="face-eye" d="M51 68 C56 71 61 71 66 68"/>
        <path class="face-eye" d="M74 68 C80 71 85 71 90 68"/>
        ${nose}
        <path class="face-mouth" d="M57 96 C64 101 77 101 85 96"/>
      `,
      '중립': `
        <path class="face-eye" d="M56 63 V72"/>
        <path class="face-eye" d="M84 63 V72"/>
        ${nose}
        <path class="face-mouth" d="M59 98 C66 101 76 101 83 98"/>
      `,
      '기본표정': `
        <path class="face-eye" d="M56 63 V72"/>
        <path class="face-eye" d="M84 63 V72"/>
        ${nose}
        <path class="face-mouth" d="M59 98 C66 101 76 101 83 98"/>
      `,
      '미묘함': `
        <path class="face-brow" d="M49 50 H64"/>
        <path class="face-brow" d="M77 48 L91 52"/>
        <path class="face-eye" d="M56 63 V72"/>
        <path class="face-eye" d="M84 63 V72"/>
        ${nose}
        <path class="face-mouth" d="M58 99 C65 102 75 96 84 99"/>
      `
    };

    return `
      <svg class="preview-face-icon" viewBox="0 0 140 140" role="img" aria-label="${label} 표정">
        <g class="face-corners">${faceBase}</g>
        <g class="face-lines">
          ${parts[label] || parts['미묘함']}
        </g>
      </svg>
    `;
  }

  function drawPreviewGrid(container) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 660;
    canvas.height = 540;
    canvas.className = 'preview-canvas';
    container.appendChild(canvas);

    const cameraCard = document.getElementById('p10-camera-card');
    const faceFrame = document.getElementById('p10-camera-face');
    const faceEmotion = document.getElementById('p10-camera-emotion');
    const faceDescription = document.getElementById('p10-camera-description');

    const ctx = canvas.getContext('2d');
    const metrics = {
      spacing: 42,
      cellSize: 36,
      centerX: canvas.width / 2,
      baseY: 150,
      positions: []
    };

    const cells = buildCells();
    metrics.positions = buildPreviewPositions(cells.length, metrics);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawThreadBase(ctx, metrics);
    cells.forEach((cell, idx) => drawKnitCell(ctx, cell, idx, metrics));
    drawNeedles(ctx, metrics);

    let currentFaceTag = null;
    const updateFacePreview = (tag) => {
      if (!tag || currentFaceTag === tag) return;
      currentFaceTag = tag;
      if (faceFrame) faceFrame.innerHTML = faceSvgForTag(tag);
      if (faceEmotion) {
        faceEmotion.textContent = tag;
        const tagBg = tag === '기본표정'
          ? 'rgba(182, 158, 122, 0.3)'
          : hsbToRgba(baseHueFor(tag), 0.4, 0.9, 0.22);
        faceEmotion.style.setProperty('--tag-bg', tagBg);
      }
      if (faceDescription) faceDescription.textContent = TAG_DESCRIPTIONS[tag] || TAG_DESCRIPTIONS['미묘함'];
      if (cameraCard) cameraCard.dataset.emotion = tag;
    };

    updateFacePreview('기본표정');

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const hoveredIndex = metrics.positions.findIndex((position) => {
        return Math.abs(x - position.x) <= metrics.cellSize / 2 &&
          Math.abs(y - position.y) <= metrics.cellSize / 2;
      });
      const hit = hoveredIndex !== -1;

      if (hit) updateFacePreview(cells[hoveredIndex].tag);
      if (cameraCard) cameraCard.classList.toggle('is-hot', hit);
    });

    canvas.addEventListener('mouseleave', () => {
      updateFacePreview('기본표정');
      if (cameraCard) cameraCard.classList.remove('is-hot');
    });
  }

  function legendMiniCellMarkup(item) {
    const size = 30;
    const half = size / 2;
    let bri = 70;
    let strokeWidth = 1.5;

    if (item.speedLevel === 'fast') {
      bri = 85;
    } else if (item.speedLevel === 'medium') {
      bri = 55;
      strokeWidth = 3;
    } else if (item.speedLevel === 'slow') {
      bri = 30;
      strokeWidth = 1;
    } else if (item.speedLevel === 'shape_gray') {
      bri = 55;
    }

    const bodyColor = hsbToCss(0, 0, bri / 100);
    const stitchColor = hsbToCss(0, 0, Math.min((bri + 20) / 100, 1));
    const shape = item.shape === 'circle'
      ? `<circle cx="15" cy="15" r="${half - 2}" fill="${item.filled ? bodyColor : 'none'}" stroke="${bodyColor}" stroke-width="${item.filled ? 0 : strokeWidth}"/>`
      : `<rect x="3" y="3" width="24" height="24" rx="5" fill="${item.filled ? bodyColor : 'none'}" stroke="${bodyColor}" stroke-width="${item.filled ? 0 : strokeWidth}"/>`;

    let stitch = '<path d="M7 10 L15 21 L23 10" fill="none" stroke="' + stitchColor + '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>';
    if (item.eye === 'FROWN') {
      stitch = '<path d="M9 9 L21 21 M21 9 L9 21" fill="none" stroke="' + stitchColor + '" stroke-width="2.1" stroke-linecap="round"/>';
    } else if (item.eye === 'SURPRISED') {
      const r = 24 * 0.3;
      const points = Array.from({ length: 8 }, (_, i) => {
        const radius = i % 2 === 0 ? r : r * 0.4;
        const angle = (Math.PI / 4) * i;
        return [
          Number((15 + Math.cos(angle) * radius).toFixed(2)),
          Number((15 + Math.sin(angle) * radius).toFixed(2))
        ];
      });
      const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';
      stitch = '<path d="' + d + '" fill="none" stroke="' + stitchColor + '" stroke-width="1.8" stroke-linejoin="round"/>';
    }

    return `
      <svg class="legend-mini-cell" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        ${shape}
        ${stitch}
      </svg>
    `;
  }

  function legendMiniItemMarkup(item) {
    const note = item.note ? `<span class="legend-mini-note">${item.note}</span>` : '';
    return `
      <div class="legend-mini-item">
        ${legendMiniCellMarkup(item)}
        <span>${item.label}${note}</span>
      </div>
    `;
  }

  // p10 범례는 캔버스 이미지가 아니라 각 항목이 독립된 HTML 요소로 렌더링된다.
  function renderLegendToHTML() {
    const container = document.getElementById('p10-legend-container');
    if (!container) return;

    const colorItems = LEGEND_SPEC.emotions.map((emotion) => {
      return `
        <div class="legend-color-item">
          <span class="legend-color-chip" style="--chip-fill:${hsbToCss(emotion.hue, 0.4, 0.9)}; --chip-stroke:${hsbToCss(emotion.hue, 0.5, 0.7)};"></span>
          <span>${emotion.name}</span>
        </div>
      `;
    }).join('');

    const shapeGroups = LEGEND_SPEC.shapeExamples.map((group) => {
      return `
        <div class="legend-subtitle">${group.title}</div>
        <div class="legend-row legend-shape-row">
          ${group.items.map(legendMiniItemMarkup).join('')}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h3 class="legend-title">${LEGEND_SPEC.title}</h3>
      <p class="legend-desc">${LEGEND_SPEC.descriptionLines.join('<br>')}</p>

      <section class="legend-section">
        <div class="legend-section-title">감정 베이스 색상</div>
        <div class="legend-color-grid">${colorItems}</div>
      </section>

      <section class="legend-section">
        <div class="legend-section-title">형태 및 코 무늬</div>
        ${shapeGroups}
      </section>

      <section class="legend-section">
        <div class="legend-section-title">타이핑 속도</div>
        <div class="legend-row legend-speed-row">
          ${LEGEND_SPEC.speedExamples.map(legendMiniItemMarkup).join('')}
        </div>
      </section>
    `;
  }

  // 🌟 [수정됨] p10 화면 렌더링을 총괄하는 객체
  window.page_S10 = {
    render: function () {
      // 1. 가운데 샘플 뜨개 캔버스 그리기
      const grid = document.getElementById('p10-preview-grid');
      if (grid) drawPreviewGrid(grid);

      // 2. 오른쪽 범례는 캔버스가 아닌 HTML 요소로 렌더링
      renderLegendToHTML();
    }
  };
}()); // S10.js 끝
