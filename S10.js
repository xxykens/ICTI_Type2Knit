(function () {
  const emotionLegend = [
    { name: '짜증', hue: 0 },
    { name: '중립', hue: 51 },
    { name: '해탈', hue: 103 },
    { name: '미묘함', hue: 154 },
    { name: '슬픔', hue: 206 },
    { name: '긴장', hue: 257 },
    { name: '놀람', hue: 309 }
  ];

  const exampleParts = [
    { text: '아니 자료 어디감', tag: '놀람', speed: 0.72, tension: 0.64 },
    { text: '나 분명히 올렸는데', tag: '중립', speed: 0.46, tension: 0.32 },
    { text: '내 거만 없어짐', tag: '짜증', speed: 0.82, tension: 0.78 },
    { text: '마감 두 시간 남았는데', tag: '긴장', speed: 0.66, tension: 0.72 },
    { text: '하 일단 다시 할게', tag: '해탈', speed: 0.58, tension: 0.28 },
    { text: '진짜 개빡치네', tag: '짜증', speed: 0.86, tension: 0.82 }
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

  function colorForTag(tag) {
    const matchingPart = exampleParts.find((part) => part.tag === tag);
    const samplePart = matchingPart || { tag, speed: 0.62, tension: 0.5 };
    const sampleCell = makeCell('', samplePart, 0);
    const [r, g, b] = hsbToRgb(sampleCell.bgHue, sampleCell.sat / 100, sampleCell.bgBri / 100);
    return `rgb(${r},${g},${b})`;
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

  function renderLegend() {
    const legend = document.getElementById('p10-preview-legend');
    if (!legend || legend.dataset.rendered === 'true') return;

    const frag = document.createDocumentFragment();
    emotionLegend.forEach((sample) => {
      const item = document.createElement('div');
      item.className = 'preview-legend-item';

      const swatch = document.createElement('span');
      swatch.className = 'preview-swatch';
      swatch.style.backgroundColor = colorForTag(sample.name);

      const label = document.createElement('span');
      label.textContent = sample.name;

      item.appendChild(swatch);
      item.appendChild(label);
      frag.appendChild(item);
    });

    legend.appendChild(frag);
    legend.dataset.rendered = 'true';
  }

  function renderExampleText() {
    const target = document.getElementById('p10-preview-text');
    if (!target || target.dataset.rendered === 'true') return;

    const frag = document.createDocumentFragment();
    exampleParts.forEach((part) => {
      const segment = document.createElement('span');
      segment.className = 'preview-text-segment';
      segment.style.borderColor = colorForTag(part.tag);
      segment.style.color = colorForTag(part.tag);
      segment.textContent = part.text;
      segment.title = part.tag;
      frag.appendChild(segment);
    });

    target.appendChild(frag);
    target.dataset.rendered = 'true';
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
    const col = idx % 10;
    const row = Math.floor(idx / 10);
    const px = metrics.startX + col * metrics.spacing;
    const py = metrics.startY + row * metrics.spacing;
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

  function drawThreadBase(ctx, metrics, cellCount) {
    const rows = Math.ceil(cellCount / 10);
    const left = metrics.startX - metrics.cellSize * 0.72;
    const right = metrics.startX + 9 * metrics.spacing + metrics.cellSize * 0.72;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let row = 0; row < rows; row += 1) {
      const y = metrics.startY + row * metrics.spacing;
      ctx.strokeStyle = row % 2 === 0 ? 'rgba(182,158,122,0.36)' : 'rgba(231,225,216,0.74)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(left, y + 1);
      for (let col = 0; col < 10; col += 1) {
        const x = metrics.startX + col * metrics.spacing;
        ctx.quadraticCurveTo(x - 12, y - 8, x, y + 1);
        ctx.quadraticCurveTo(x + 12, y + 10, x + 24, y + 1);
      }
      ctx.lineTo(right, y + 1);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(182,158,122,0.28)';
    ctx.lineWidth = 4;
    for (let col = 0; col < 10; col += 1) {
      const x = metrics.startX + col * metrics.spacing;
      ctx.beginPath();
      ctx.moveTo(x - 2, metrics.startY - 28);
      for (let row = 0; row < rows; row += 1) {
        const y = metrics.startY + row * metrics.spacing;
        ctx.quadraticCurveTo(x + 7, y - 12, x - 2, y + 4);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPreviewGrid(container) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 430;
    canvas.className = 'preview-canvas';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const metrics = {
      spacing: 42,
      cellSize: 36,
      startX: 40,
      startY: 38
    };

    const cells = buildCells();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawThreadBase(ctx, metrics, cells.length);
    cells.forEach((cell, idx) => drawKnitCell(ctx, cell, idx, metrics));
  }

  window.page_S10 = {
    render: function () {
      renderLegend();
      renderExampleText();

      const grid = document.getElementById('p10-preview-grid');
      if (!grid) return;
      drawPreviewGrid(grid);
    }
  };
}());
