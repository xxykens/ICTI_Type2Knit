(function () {
  const exampleParts = [
    { text: '아니 팀플 파일 어디감', tag: '놀람', speed: 0.72, tension: 0.64 },
    { text: '나 진짜 분명히 올렸다고', tag: '짜증', speed: 0.82, tension: 0.78 },
    { text: '왜 내 파트만 증발함', tag: '짜증', speed: 0.86, tension: 0.82 },
    { text: '마감 두시간 남은거 실화냐', tag: '긴장', speed: 0.66, tension: 0.72 },
    { text: '하 일단 내가 다시 함', tag: '해탈', speed: 0.58, tension: 0.28 },
    { text: '근데 진짜 개열받음', tag: '짜증', speed: 0.90, tension: 0.86 }
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

  function drawPreviewGrid(container) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 660;
    canvas.height = 540;
    canvas.className = 'preview-canvas';
    container.appendChild(canvas);

    const facePreview = document.createElement('div');
    facePreview.className = 'preview-face-popover';

    const faceFrame = document.createElement('div');
    faceFrame.className = 'preview-face-frame';

    const faceImg = document.createElement('img');
    faceImg.src = 'images/face_detact.png';
    faceImg.alt = '';
    faceFrame.appendChild(faceImg);

    const faceText = document.createElement('div');
    faceText.className = 'preview-face-text';
    faceText.innerHTML = '<strong>캠 예시 화면</strong><span>실제 입력시 카메라는 보이지 않아요!</span>';

    facePreview.appendChild(faceFrame);
    facePreview.appendChild(faceText);
    const screen = document.getElementById('p10');
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

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const hit = metrics.positions.some((position) => {
        return Math.abs(x - position.x) <= metrics.cellSize / 2 &&
          Math.abs(y - position.y) <= metrics.cellSize / 2;
      });

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
