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

        if (window.LegendUI && typeof window.LegendUI.drawIcon === 'function') {
          window.LegendUI.drawIcon(pw - 30, ph - 40);
        }
      }
    }
  }

  if (window.state.currentScreen === 'p18') {
    if (window.LegendUI && window.LegendUI.canvasTooltip && window.LegendUI.canvasTooltip.active) {
      window.LegendUI.drawTooltip(window.LegendUI.canvasTooltip.x, window.LegendUI.canvasTooltip.y);
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

// ==========================================
// 💡 뜨개 패턴 감정 범례 (Tooltip UI) 전역 객체
// ==========================================
window.LegendUI = {
  iconRadius: 15,
  isHovered: false,
  canvasTooltip: { active: false, x: 0, y: 0 },

  drawIcon: function(x, y) {
    push();
    colorMode(RGB);
    
    let d = dist(mouseX, mouseY, x, y);
    this.isHovered = (d < this.iconRadius);

    this.drawHelpIcon(x, y, this.iconRadius * 1.9, this.isHovered ? '#666666' : '#999999');
    pop();

    if (this.isHovered) {
      this.drawTooltip(x, y);
    }
  },

  drawHelpIcon: function(x, y, size, iconColor) {
    push();
    colorMode(RGB);
    translate(x - size / 2, y - size / 2);
    scale(size / 100);

    const c = color(iconColor);
    noStroke();
    fill(red(c), green(c), blue(c), 41);
    ellipse(49.9999, 50, 83.3334, 83.3334);

    noFill();
    stroke(c);
    strokeWeight(6.25);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    beginShape();
    vertex(49.2916, 58.3333);
    vertex(49.2916, 55.7458);
    bezierVertex(49.2896, 54.0405, 49.7368, 52.3648, 50.5882, 50.8873);
    bezierVertex(51.4396, 49.4097, 52.6652, 48.1825, 54.1416, 47.3292);
    bezierVertex(58.8333, 44.5792, 60.4499, 38.7583, 57.6999, 34.0667);
    bezierVertex(54.9499, 29.375, 49.1291, 27.7583, 44.4374, 30.5083);
    bezierVertex(41.5208, 32.2917, 39.5833, 35.3625, 39.5833, 38.9208);
    endShape();
    line(49.9999, 70.8333, 49.9666, 70.8333);
    ellipse(49.9999, 50, 83.3334, 83.3334);
    pop();
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

    this.drawStaticLegend(tX, tY, true);
  },

  // 🌟 [추가됨] 내용물만 렌더링하는 고정 뷰 함수
  drawStaticLegend: function(tX, tY, showBackground = true) {
    push();
    let boxW = 280; 
    let boxH = 350; 

    // showBackground가 true일 때만 하얀 둥근 테두리 박스를 그립니다.
    if (showBackground) {
      colorMode(RGB);
      fill(255, 245); 
      stroke(200);
      strokeWeight(1);
      rectMode(CORNER);
      rect(tX, tY, boxW, boxH, 12);
    }
    
    textFont('HSHwalkong');
    textWrap(WORD);
    const margin = 15;
    const contentX = tX + margin;
    const contentW = boxW - margin * 2;
    const legendSpec = window.KnitLegendSpec || {
      title: '감정별 뜨개 패턴',
      descriptionLines: [
        '타이핑하는 동안 웹캠이 표정 변화(눈썹·눈·입)를',
        '기준 표정과 비교해 추출한 감정과 타이핑 속도에 따라',
        '코의 색과 형태 등이 달라져요.'
      ],
      emotions: [
        { name: '짜증', hue: 0 }, { name: '중립', hue: 51 },
        { name: '해탈', hue: 103 }, { name: '미묘', hue: 154 },
        { name: '슬픔', hue: 206 }, { name: '긴장', hue: 257 },
        { name: '놀람', hue: 309 }
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

    textAlign(LEFT, TOP);
    noStroke();
    
    // 제목
    fill(50);
    textSize(15);
    textStyle(BOLD);
    text(legendSpec.title, contentX, tY + margin, contentW);

    // (1) 추가된 설명 문구
    fill(100);
    textSize(10);
    textStyle(NORMAL);
    textLeading(14);
    text(legendSpec.descriptionLines.join('\n'), contentX, tY + margin + 24, contentW);

    // ----------------------------------------
    // [섹션 1] 감정별 베이스 색상
    // ----------------------------------------
    fill(50);
    textSize(12);
    text("■ 감정 베이스 색상", tX + 15, tY + 95, contentW);
    
    let emotions = legendSpec.emotions;

    colorMode(HSB, 360, 100, 100);
    for (let i = 0; i < emotions.length; i++) {
      let col = i % 4;
      let row = Math.floor(i / 4);
      let cx = tX + 15 + col * 65; // 간격 축소
      let cy = tY + 115 + row * 24;

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
    text("■ 형태 및 코 무늬", contentX, tY + 168, contentW);

    textSize(10);
    fill(100);
    const shapeExamples = legendSpec.shapeExamples;
    const mouthExamples = shapeExamples[0] && shapeExamples[0].items ? shapeExamples[0].items : [];
    const eyeExamples = shapeExamples[1] && shapeExamples[1].items ? shapeExamples[1].items : [];
    text(shapeExamples[0] ? shapeExamples[0].title : "입꼬리 긴장도", contentX, tY + 188);
    text(shapeExamples[1] ? shapeExamples[1].title : "눈 표정", contentX + contentW * 0.45, tY + 188);

    textAlign(CENTER, TOP);
    
    // 배치 간격 압축 (미니 셀 크기는 최대한 유지)
    [20, 60].forEach((offset, idx) => {
      const item = mouthExamples[idx];
      if (!item) return;
      this.drawMiniCell(contentX + offset, tY + 220, item.shape, item.eye, item.filled, item.speedLevel); 
      text(item.label, contentX + offset, tY + 235);
    });

    [125, 167.5, 210].forEach((offset, idx) => {
      const item = eyeExamples[idx];
      if (!item) return;
      this.drawMiniCell(contentX + offset, tY + 220, item.shape, item.eye, item.filled, item.speedLevel); 
      text(item.label, contentX + offset, tY + 235);
    });

    // ----------------------------------------
    // [섹션 3] 타이핑 속도
    // ----------------------------------------
    textAlign(LEFT, TOP);
    fill(50);
    textSize(12);
    text("■ 타이핑 속도", contentX, tY + 265, contentW);
    
    textAlign(CENTER, TOP);
    textSize(10);
    fill(100);
    
    [30, 105, 180].forEach((offset, idx) => {
      const item = legendSpec.speedExamples[idx];
      if (!item) return;
      this.drawMiniCell(contentX + offset, tY + 295, item.shape, item.eye, item.filled, item.speedLevel); 
      text(item.label, contentX + offset, tY + 310);
      text(item.note || '', contentX + offset, tY + 324);
    });

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
  },

  setCanvasTooltipState: function(active, x, y) {
    this.canvasTooltip = this.canvasTooltip || { active: false, x: 0, y: 0 };
    this.canvasTooltip.active = active;
    if (typeof x === 'number') this.canvasTooltip.x = x;
    if (typeof y === 'number') this.canvasTooltip.y = y;
  },

  updateCanvasTooltipPosition: function() {
    const button = document.getElementById('p18-tooltip-button');
    const canvas = document.getElementById('p5-knit-canvas');
    if (!button || !canvas) return;
    const btnRect = button.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    this.setCanvasTooltipState(true,
      btnRect.left - canvasRect.left + btnRect.width / 2,
      btnRect.top - canvasRect.top + btnRect.height / 2
    );
  }
};

window.addEventListener('DOMContentLoaded', () => {
  const p18TooltipButton = document.getElementById('p18-tooltip-button');
  if (!p18TooltipButton) return;

  p18TooltipButton.addEventListener('mouseenter', () => {
    if (window.LegendUI) {
      window.LegendUI.updateCanvasTooltipPosition();
      if (window.state && window.state.currentScreen === 'p18') redraw();
    }
  });
  p18TooltipButton.addEventListener('mousemove', () => {
    if (window.LegendUI && window.LegendUI.canvasTooltip && window.LegendUI.canvasTooltip.active) {
      window.LegendUI.updateCanvasTooltipPosition();
      if (window.state && window.state.currentScreen === 'p18') redraw();
    }
  });
  p18TooltipButton.addEventListener('mouseleave', () => {
    if (window.LegendUI) {
      window.LegendUI.setCanvasTooltipState(false);
      if (window.state && window.state.currentScreen === 'p18') redraw();
    }
  });
});
