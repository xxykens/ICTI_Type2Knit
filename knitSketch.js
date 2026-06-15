/**
 * knitSketch.js — p5.js 글로벌 모드
 * p9 뜨개 엔진 + 웹캠 초기화 전담
 */

// ── 전역 상수/변수 ──
const CELL_SIZE = 26;
const SPACING   = 30;
const DEFAULT_STAGE_W = 1280;
const DEFAULT_STAGE_H = 832;

window.cells                 = [];
window.archiveData           = [];
window.gridPath              = [];
window.needlePhase           = 0;
window.currentTypingSpeed    = 0;
window.lastSecondSpeedTarget = 0;
window.tempBackspaceFlag     = false;
window.tempText              = '';

window.LegendUI = {
  isInitialized: false,

  init() {
    const btn = document.getElementById('footer-tooltip-button');
    if (btn) {
      // 1. HTML에 적혀있는 옛날 방식의 onclick 이벤트를 아예 지워버립니다.
      btn.removeAttribute('onclick');
      
      // 2. 최신 표준 방식으로 클릭 이벤트를 달아줍니다. (이제 'e'가 정상 작동합니다!)
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 바탕화면으로 클릭이 새어나가는 것 차단
        this.toggleFooterTooltip();
      });
    }

    // 3. 바탕화면 클릭 시 툴팁 닫기
    document.addEventListener('click', (e) => {
      const tooltipEl = document.getElementById('footer-tooltip');
      if (!tooltipEl || !tooltipEl.classList.contains('active')) return;
      
      // 툴팁 창 내부를 클릭한 경우는 안 닫히게 방어
      if (tooltipEl.contains(e.target)) return;
      
      tooltipEl.classList.remove('active');
      tooltipEl.style.opacity = '0';
      tooltipEl.style.visibility = 'hidden';
      tooltipEl.style.transform = 'translateY(12px)';
    });
  },

  toggleFooterTooltip() {
    const tooltipEl = document.getElementById('footer-tooltip');
    if (!tooltipEl) return;

    // 처음 1회 클릭 시: 캔버스 생성 및 그리기
    if (!this.isInitialized) {
      tooltipEl.innerHTML = ''; 
      tooltipEl.style.padding = '0';
      tooltipEl.style.background = 'transparent';
      tooltipEl.style.boxShadow = 'none';

      const cvs = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      const boxW = 280;
      const boxH = 350;

      cvs.width = boxW * dpr;
      cvs.height = boxH * dpr;
      cvs.style.width = boxW + 'px';
      cvs.style.height = boxH + 'px';
      cvs.style.borderRadius = '20px';
      cvs.style.background = '#ffffff';
      cvs.style.boxShadow = '0 26px 60px rgba(0,0,0,0.16)';

      tooltipEl.appendChild(cvs);

      const ctx = cvs.getContext('2d');
      ctx.scale(dpr, dpr);
      this.drawStaticLegend(ctx, 0, 0);

      this.isInitialized = true;
    }

    // 열고 닫기 토글
    if (tooltipEl.classList.contains('active')) {
      tooltipEl.classList.remove('active');
      tooltipEl.style.opacity = '0';
      tooltipEl.style.visibility = 'hidden';
      tooltipEl.style.transform = 'translateY(12px)';
    } else {
      tooltipEl.classList.add('active');
      tooltipEl.style.zIndex = '99999'; // 무조건 최상단 노출
      tooltipEl.style.opacity = '1';
      tooltipEl.style.visibility = 'visible';
      tooltipEl.style.transform = 'translateY(0)';
    }
  },

  drawStaticLegend(ctx, x, y) {
    function hsbToRgb(h, s, b) {
      h = h / 60;
      let i = Math.floor(h), f = h - i, p = b * (1 - s), q = b * (1 - s * f), t = b * (1 - s * (1 - f));
      let r, g, bl;
      switch (i % 6) { case 0: r=b; g=t; bl=p; break; case 1: r=q; g=b; bl=p; break; case 2: r=p; g=b; bl=t; break; case 3: r=p; g=q; bl=b; break; case 4: r=t; g=p; bl=b; break; case 5: r=b; g=p; bl=q; break; default: r=g=bl=0; }
      return [Math.round(r*255), Math.round(g*255), Math.round(bl*255)];
    }

    function drawRoundedRect(ctx, rx, ry, rw, rh, rr) {
      ctx.moveTo(rx + rr, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
      ctx.arcTo(rx, ry + rh, rx, ry, rr);
      ctx.arcTo(rx, ry, rx + rw, ry, rr);
    }

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgb(50, 50, 50)';
    ctx.font = "bold 15px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('감정별 뜨개 패턴', 15, 15);

    ctx.fillStyle = 'rgb(100, 100, 100)';
    ctx.font = "10px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('타이핑하는 동안 웹캠이 표정 변화(눈썹·눈·입)를', 15, 36);
    ctx.fillText('기준 표정과 비교해 추출한 감정과 타이핑 속도에 따라', 15, 50);
    ctx.fillText('코의 색과 형태 등이 달라져요.', 15, 64);

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

      const [r, g, b] = hsbToRgb(emo.hue, 0.4, 0.9); 
      const [sr, sg, sb] = hsbToRgb(emo.hue, 0.5, 0.7); 

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

    ctx.fillStyle = 'rgb(50, 50, 50)';
    ctx.font = "12px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('■ 형태 및 코 무늬', 15, 168);

    ctx.fillStyle = 'rgb(100, 100, 100)';
    ctx.font = "10px 'HSHwalkong', 'Noto Serif KR', serif";
    ctx.fillText('입꼬리 긴장도', 15, 188);
    ctx.fillText('눈 표정', 130, 188);

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
};

function getCanvasContainerSize(containerId) {
  const container = document.getElementById(containerId);
  const w = container ? container.clientWidth : window.innerWidth;
  const h = container ? container.clientHeight : window.innerHeight;

  return {
    w: Math.max(1, Math.round(w || DEFAULT_STAGE_W)),
    h: Math.max(1, Math.round(h || DEFAULT_STAGE_H))
  };
}

function fitP5CanvasToContainer(containerId) {
  const { w, h } = getCanvasContainerSize(containerId);
  const p5cvs = document.getElementById('p5-knit-canvas');

  if (width !== w || height !== h) resizeCanvas(w, h);
  if (p5cvs) {
    p5cvs.style.width = `${w}px`;
    p5cvs.style.height = `${h}px`;
  }

  return { w, h };
}

// ── p5 라이프사이클 ──

function setup() {
  pixelDensity(displayDensity());
  let cvs = createCanvas(DEFAULT_STAGE_W, DEFAULT_STAGE_H);
  cvs.elt.id = 'p5-knit-canvas';

  cvs.parent('knit-canvas-container');
  cvs.style('position', 'absolute');
  cvs.style('top', '0');
  cvs.style('left', '0');

  window.gridPath = [];
  if (window.page_S4) page_S4.initGridPath();

  if (typeof setupKnitstampInput === 'function') {
    setupKnitstampInput();
    window._knitstampReady = true;
  }

  const ta = document.getElementById('typing-capture');
  if (ta) {
    ta.addEventListener('keydown', function(e) {
      if (!window.state || window.state.currentScreen !== 'p9') return;
      const ignore = ['Shift','Control','Alt','Meta','Escape','CapsLock','Tab'];
      if (ignore.includes(e.key)) return;
      if (typeof recordKnitstampKey === 'function') recordKnitstampKey();
      if (e.key === 'Backspace') {
        window.tempBackspaceFlag = true;
        if (window.tempText.length > 0) window.tempText = window.tempText.slice(0, -1);
      }
    });
    ta.addEventListener('input', function() {
      if (!window.state || window.state.currentScreen !== 'p9') return;
      const baseline = window._tempTextBaseline || 0;
      if (ta.value.length < baseline) {
        // 백스페이스로 이전 초 영역까지 삭제된 경우
        window._tempTextBaseline = ta.value.length;
        window.tempText = '';
      } else {
        window.tempText = ta.value.slice(baseline);
      }
    });
  }
  frameRate(30);
  noLoop();
  window.LegendUI.init();
}

function draw() {
  if (!window.state) return;

  colorMode(RGB);
  clear();

  if (window.state.currentScreen === 'p9') {
    if (window.page_S4) page_S4.updateAndDraw();
  }

  if (window.state.currentScreen === 'p12' || window.state.currentScreen === 'p14') {
    if (window.page_S7_S8 && window._knitSketchPreviewPiece) {
      const panel = document.querySelector('.complete-screen.active .preview-panel');
      if (panel) {
        const pw = panel.offsetWidth;
        const ph = panel.offsetHeight;
        if (width !== pw || height !== ph) resizeCanvas(pw, ph);

        colorMode(RGB);
        clear();
        background(245);

        colorMode(HSB, 360, 100, 100);
        const S8_CELL    = 38;
        const S8_SPACING = 44;
        const S8_GRID_W  = S8_CELL / 2 + 9 * S8_SPACING + S8_CELL / 2;
        const scale      = pw / S8_GRID_W;
        const cellSize   = S8_CELL    * scale;
        const spacing    = S8_SPACING * scale;
        const startX     = cellSize / 2;
        const startY     = cellSize / 2 + 8;

        page_S7_S8.drawKnitGrid(window._knitSketchPreviewPiece.knitArray || window._knitSketchPreviewPiece.cells || [], startX, startY, cellSize, spacing, {
          showText:        false,
          showEmotionInfo: false,
          privacy:         'public',
          clipMinY:        -Infinity,
          clipMaxY:        ph + spacing
        });

      }
    }
  }
}

function windowResized() {
  pixelDensity(displayDensity());
  if (!window.state) return;

  if (window.state.currentScreen === 'p9') {
    fitP5CanvasToContainer('knit-canvas-container');
    redraw();
  } else if (window.state.currentScreen === 'p18') {
    fitP5CanvasToContainer('p18-canvas-container');
    redraw();
  } else if (window.state.currentScreen === 'p12' || window.state.currentScreen === 'p14') {
    if (typeof window.knitSketch_renderPreview === 'function') window.knitSketch_renderPreview();
  }
}

function mousePressed() {
  if (!window.state) return;
  if (window.state.currentScreen === 'p18' && window.page_S7_S8) {
    // 상세 패널 열려있으면 닫기 버튼 체크
    if (page_S7_S8.showDetailPanel) {
      page_S7_S8.handleS8CheckboxClick(mouseX, mouseY);
    } else {
      page_S7_S8.checkS7Click();
    }
  }
}

function keyPressed() {
  if (!window.state) return;
  if (window.state.currentScreen === 'p18' && window.page_S7_S8) {
    if (keyCode === ESCAPE) {
      page_S7_S8.showDetailPanel = false;
      page_S7_S8.selectedPiece = null;
    }
  }
}

function mouseWheel(event) {
  if (!window.state) return false;
  if (window.state.currentScreen === 'p18' && window.page_S7_S8) {
    if (page_S7_S8.showDetailPanel) {
      page_S7_S8.handleS8Scroll(event.delta);
    } else {
      page_S7_S8.handleS7Scroll(event.delta);
    }
    return false;
  }
}

// ── indexDesign.js에서 호출하는 훅 ──

window.knitSketch_onP9Enter = function() {
  const p5cvs = document.getElementById('p5-knit-canvas');
  const container = document.getElementById('knit-canvas-container');
  if (p5cvs && container) {
    container.appendChild(p5cvs);
    p5cvs.style.position = 'absolute';
    p5cvs.style.top = '0';
    p5cvs.style.left = '0';
    p5cvs.style.pointerEvents = 'none';
  }

  window.cells                 = [];
  window.archiveData           = [];
  window.gridPath              = [];
  window.needlePhase           = 0;
  window.currentTypingSpeed    = 0;
  window.lastSecondSpeedTarget = 0;
  window.tempBackspaceFlag     = false;
  window.tempText              = '';
  window.knitstamp             = { seconds: [] };
  window._tempTextBaseline     = 0;

  if (window.page_S4) window.page_S4._prevKnitstampLen = 0;
  if (window.page_S4) page_S4.initGridPath();

  fitP5CanvasToContainer('knit-canvas-container');
  loop();
};

window.knitSketch_onP9Leave = function() {
  noLoop();
  clear();
};

// ── 아카이브(p18) 진입 훅 ──
window.knitSketch_onP18Enter = function() {
  const p5cvs = document.getElementById('p5-knit-canvas');
  const container = document.getElementById('p18-canvas-container');
  
  if (p5cvs && container) {
    container.appendChild(p5cvs);
    p5cvs.style.position = 'absolute';
    p5cvs.style.top = '0';
    p5cvs.style.left = '0';
    p5cvs.style.width = '100%';
    p5cvs.style.height = '100%';
    p5cvs.style.pointerEvents = 'none';
  }

  fitP5CanvasToContainer('p18-canvas-container');

  if (window.state && window.state.currentScreen === 'p18') {
    loop();
    redraw();
  }
};

window.knitSketch_onP18Leave = function() {
  noLoop();
};

// ── p12/p14 미리보기 ──
window.knitSketch_renderPreview = function() {
  const panel = document.querySelector('.complete-screen.active .preview-panel');
  if (!panel) return;

  const p5cvs = document.getElementById('p5-knit-canvas');
  if (!p5cvs) return;

  panel.style.position = 'relative';
  panel.style.overflow = 'hidden';
  p5cvs.style.position = 'absolute';
  p5cvs.style.top = '0';
  p5cvs.style.left = '0';
  p5cvs.style.pointerEvents = 'none';
  panel.appendChild(p5cvs);

  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  resizeCanvas(pw, ph);
  p5cvs.style.width = `${pw}px`;
  p5cvs.style.height = `${ph}px`;

  const previewNickname = window.state && window.state.privacy === 'private'
    ? '익명'
    : ((window.state && window.state.nickname) || '익명');
  const previewPrivacy = (window.state && window.state.privacy) || 'public';
  const piece = new KnitPiece(previewNickname, previewPrivacy);
  piece.absorbArchiveData(window.archiveData);
  window._knitSketchPreviewPiece = piece;

  loop();
};

window.LegendUI = {
  iconRadius: 15,
  isHovered: false,

  drawIcon: function(x, y) {
    push();
    colorMode(RGB);
    
    let d = dist(mouseX, mouseY, x, y);
    this.isHovered = (d < this.iconRadius);

    fill(this.isHovered ? '#666666' : '#999999');
    noStroke();
    ellipse(x, y, this.iconRadius * 2);

    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('?', x, y);
    pop();

    if (this.isHovered) {
      this.drawTooltip(x, y);
    }
  },

  drawTooltip: function(iconX, iconY) {
    push();
    // 툴팁 전체 크기를 기존(350x410)에서 약 3/4 수준으로 압축 (여백 최소화)
    let boxW = 280; 
    let boxH = 350; 
    
    let tX = iconX + 20; 
    if (tX + boxW > width) tX = iconX - boxW - 20;
    if (tX < 10) tX = 10;

    let tY = iconY;
    if (tY + boxH > height) tY = height - boxH - 10;
    if (tY < 10) tY = 10;

    colorMode(RGB);
    fill(255, 245); 
    stroke(200);
    strokeWeight(1);
    rectMode(CORNER);
    rect(tX, tY, boxW, boxH, 12);
    
    textAlign(LEFT, TOP);
    noStroke();
    
    // 제목
    fill(50);
    textSize(15);
    textStyle(BOLD);
    text("감정별 뜨개 패턴", tX + 15, tY + 15);

    // (1) 추가된 설명 문구
    fill(100);
    textSize(10);
    textStyle(NORMAL);
    textLeading(14); // 줄간격
    text("타이핑하는 동안 웹캠이 표정 변화(눈썹·눈·입)를 기준 표정과\n비교해 감정을 추정하고, 그 감정과 타이핑 속도에 따라\n코의 색과 형태 등이 달라져요.", tX + 15, tY + 36);

    // ----------------------------------------
    // [섹션 1] 감정별 베이스 색상
    // ----------------------------------------
    fill(50);
    textSize(12);
    text("■ 감정 베이스 색상", tX + 15, tY + 85);
    
    let emotions = [
      { name: '짜증', hue: 0 }, { name: '중립', hue: 51 },
      { name: '해탈', hue: 103 }, { name: '미묘', hue: 154 },
      { name: '슬픔', hue: 206 }, { name: '긴장', hue: 257 },
      { name: '놀람', hue: 309 }
    ];

    colorMode(HSB, 360, 100, 100);
    for (let i = 0; i < emotions.length; i++) {
      let col = i % 4;
      let row = Math.floor(i / 4);
      let cx = tX + 15 + col * 65; // 간격 축소
      let cy = tY + 105 + row * 24;

      fill(emotions[i].hue, 40, 90);
      stroke(emotions[i].hue, 50, 70);
      strokeWeight(1);
      rect(cx, cy, 13, 13, 3); // 컬러박스 살짝만 축소

      noStroke();
      fill(0, 0, 30);
      textAlign(LEFT, TOP);
      textSize(10.5);
      text(emotions[i].name, cx + 18, cy + 1);
    }

    // ----------------------------------------
    // [섹션 2] 형태 및 코 무늬
    // ----------------------------------------
    colorMode(RGB);
    fill(50);
    textSize(12);
    textAlign(LEFT, TOP);
    text("■ 형태 및 코 무늬", tX + 15, tY + 158);

    textSize(10); fill(100);
    text("입꼬리 긴장도", tX + 15, tY + 178);
    text("눈 표정", tX + 130, tY + 178);

    textAlign(CENTER, TOP);
    
    // 배치 간격 압축 (미니 셀 크기는 최대한 유지)
    this.drawMiniCell(tX + 35, tY + 210, 'circle', 'NEUTRAL', true, 'shape_gray'); 
    text("긍정", tX + 35, tY + 225);
    this.drawMiniCell(tX + 85, tY + 210, 'square', 'NEUTRAL', true, 'shape_gray'); 
    text("부정", tX + 85, tY + 225);

    this.drawMiniCell(tX + 150, tY + 210, 'square', 'FROWN', true, 'shape_gray'); 
    text("찌푸림", tX + 150, tY + 225);
    this.drawMiniCell(tX + 200, tY + 210, 'square', 'SURPRISED', true, 'shape_gray'); 
    text("충격", tX + 200, tY + 225);
    this.drawMiniCell(tX + 250, tY + 210, 'square', 'NEUTRAL', true, 'shape_gray'); 
    text("기본", tX + 250, tY + 225);

    // ----------------------------------------
    // [섹션 3] 타이핑 속도
    // ----------------------------------------
    textAlign(LEFT, TOP);
    fill(50); textSize(12);
    text("■ 타이핑 속도", tX + 15, tY + 255);
    
    textAlign(CENTER, TOP);
    textSize(10); fill(100);
    
    this.drawMiniCell(tX + 45, tY + 295, 'square', 'NEUTRAL', true, 'fast'); 
    text("빠름", tX + 45, tY + 310);
    text("(채움, 채도/명도↑)", tX + 45, tY + 324);
    
    this.drawMiniCell(tX + 140, tY + 295, 'square', 'NEUTRAL', false, 'medium'); 
    text("보통", tX + 140, tY + 310);
    text("(두꺼운 선)", tX + 140, tY + 324);

    this.drawMiniCell(tX + 235, tY + 295, 'square', 'NEUTRAL', false, 'slow'); 
    text("느림", tX + 235, tY + 310);
    text("(얇은 선, 채도/명도↓)", tX + 235, tY + 324);

    pop();
  },

  drawMiniCell: function(x, y, shape, eye = 'NEUTRAL', isFilled = true, speedLevel = 'fast') {
    push();
    translate(x, y);
    colorMode(HSB, 360, 100, 100);
    
    // 셀 크기를 20에서 18로 아주 살짝만 줄여 가독성 유지
    let size = 18; 
    
    let hue = 0; 
    let sat = 0; 
    let bri = 70;
    let sw = 1.5; // 기본 선 두께 축소

    if (speedLevel === 'fast') { 
      bri = 85; 
    } else if (speedLevel === 'medium') { 
      bri = 55; 
      sw = 3; // 두꺼운 테두리
    } else if (speedLevel === 'slow') { 
      bri = 30; 
      sw = 1; // 얇은 테두리
    } else if (speedLevel === 'shape_gray') {
      bri = 55; 
    }

    if (isFilled) {
      fill(hue, sat, bri);
      noStroke();
    } else {
      noFill();
      stroke(hue, sat, bri);
      strokeWeight(sw);
    }

    if (shape === 'square') {
      rectMode(CENTER);
      rect(0, 0, size, size, 4);
    } else {
      ellipse(0, 0, size, size);
    }

    stroke(hue, sat, min(bri + 20, 100)); 
    strokeWeight(1.2);
    noFill();
    let r = size * 0.3;

    if (eye === 'FROWN') {
      line(-r, -r, r, r);
      line(r, -r, -r, r);
    } else if (eye === 'SURPRISED') {
      beginShape();
      for (let i = 0; i < 8; i++) {
        let radius = i % 2 === 0 ? r : r * 0.4;
        let angle = PI / 4 * i;
        vertex(cos(angle) * radius, sin(angle) * radius);
      }
      endShape(CLOSE);
    } else {
      beginShape();
      vertex(-r, -r);
      vertex(0, r * 0.8);
      vertex(r, -r);
      endShape();
    }
    pop();
  }
};
