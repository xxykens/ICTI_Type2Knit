(function () {
  const exampleParts = [
    { text: '아니파일보내라고한지가언젠데', tag: '긴장', speed: 0.86, tension: 0.82 },
    { text: '눈감아주는것도하루이틀이지', tag: '짜증', speed: 0.82, tension: 0.78 },
    { text: '잠수타고연락씹고', tag: '긴장', speed: 0.68, tension: 0.74 },
    { text: '수업안오면해결이되나', tag: '놀람', speed: 0.72, tension: 0.64 },
    { text: '그냥내가해야되나', tag: '슬픔', speed: 0.46, tension: 0.42 }
  ];

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

    const screen = document.getElementById('p10');
    const oldFacePreview = screen && screen.querySelector('.preview-face-popover');
    if (oldFacePreview) oldFacePreview.remove();

    const facePreview = document.createElement('div');
    facePreview.className = 'preview-face-popover';

    const faceFrame = document.createElement('div');
    faceFrame.className = 'preview-face-frame';

    faceFrame.innerHTML = faceSvgForTag('중립');

    const faceText = document.createElement('div');
    faceText.className = 'preview-face-text';
    faceText.innerHTML = '<strong>캠 예시 화면</strong><em>중립</em><span>실제 입력시 카메라는 보이지 않아요!</span>';

    facePreview.appendChild(faceFrame);
    facePreview.appendChild(faceText);
    (screen || container).appendChild(facePreview);

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

    let currentFaceTag = '';
    const updateFacePreview = (tag) => {
      if (!tag || currentFaceTag === tag) return;
      currentFaceTag = tag;
      faceFrame.innerHTML = faceSvgForTag(tag);
      const emotion = faceText.querySelector('em');
      if (emotion) emotion.textContent = tag;
      facePreview.dataset.emotion = tag;
    };

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
      facePreview.classList.toggle('visible', hit);
    });

    canvas.addEventListener('mouseleave', () => {
      facePreview.classList.remove('visible');
    });
  }

  window.page_S10 = {
    render: function () {
      const grid = document.getElementById('p10-preview-grid');
      if (!grid) return;
      drawPreviewGrid(grid);
    }
  };
}());
