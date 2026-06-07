/**
 * knitSketch.js — p5.js 글로벌 모드
 * p9 뜨개 엔진 + 웹캠 초기화 전담
 */

// ── 전역 상수/변수 ──
const CELL_SIZE = 26;
const SPACING   = 30;

window.cells                 = [];
window.archiveData           = [];
window.gridPath              = [];
window.needlePhase           = 0;
window.currentTypingSpeed    = 0;
window.lastSecondSpeedTarget = 0;
window.tempBackspaceFlag     = false;
window.tempText              = '';

// ── p5 라이프사이클 ──

function setup() {
  let cvs = createCanvas(1280, 832);
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

        // 🌟 [여기를 수정하세요!] 
        // 980, 260 대신 패널 너비(pw)에서 30px 뺀 위치(우측 상단)에 배치합니다.
        if (window.LegendUI && typeof window.LegendUI.drawIcon === 'function') {
          window.LegendUI.drawIcon(pw - 30, 40);
        }
      }
    }
  }

  if (window.state.currentScreen === 'p18') {
    if (window.page_S7_S8) {
      page_S7_S8.drawS7Timeline();
      if (page_S7_S8.showDetailPanel) page_S7_S8.drawS8SingleView();
    }
  }
}

function windowResized() {
  resizeCanvas(1280, 832);
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
  const p5cvs = document.querySelector('canvas');
  const container = document.getElementById('knit-canvas-container');
  if (p5cvs && container) {
    container.appendChild(p5cvs);
    p5cvs.style.position = 'absolute';
    p5cvs.style.top = '0';
    p5cvs.style.left = '0';
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

  resizeCanvas(1280, 832);
  loop();
};

window.knitSketch_onP9Leave = function() {
  noLoop();
  clear();
};

// ── p12/p14 미리보기 ──
window.knitSketch_renderPreview = function() {
  const panel = document.querySelector('.complete-screen.active .preview-panel');
  if (!panel) return;

  const p5cvs = document.querySelector('canvas');
  if (!p5cvs) return;

  panel.style.position = 'relative';
  panel.style.overflow = 'hidden';
  p5cvs.style.position = 'absolute';
  p5cvs.style.top = '0';
  p5cvs.style.left = '0';
  p5cvs.style.pointerEvents = 'auto';
  panel.appendChild(p5cvs);

  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  resizeCanvas(pw, ph);
  p5cvs.style.width = `${pw}px`;
  p5cvs.style.height = `${ph}px`;

  const piece = new KnitPiece('preview', 'public');
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
    let boxW = 350; 
    let boxH = 410; 
    let tX = (iconX + boxW + 20 > width) ? iconX - boxW - 20 : iconX + 20;
    let tY = (iconY + boxH > height) ? height - boxH - 20 : iconY;

    colorMode(RGB);
    fill(255, 240); 
    stroke(200);
    strokeWeight(1);
    rectMode(CORNER);
    rect(tX, tY, boxW, boxH, 12);
    
    fill(50);
    noStroke();
    textAlign(LEFT, TOP);
    
    textSize(16);
    textStyle(BOLD);
    text("감정별 뜨개 패턴", tX + 20, tY + 20);

    // ----------------------------------------
    // [섹션 1] 감정별 베이스 색상
    // ----------------------------------------
    textSize(13);
    textStyle(NORMAL);
    text("■ 감정 베이스 색상", tX + 20, tY + 55);
    
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
      let cx = tX + 20 + col * 75;
      let cy = tY + 85 + row * 30;

      fill(emotions[i].hue, 40, 90);
      stroke(emotions[i].hue, 50, 70);
      strokeWeight(1);
      rect(cx, cy, 14, 14, 3);

      noStroke();
      fill(0, 0, 30);
      textAlign(LEFT, TOP);
      text(emotions[i].name, cx + 20, cy + 1);
    }

    // ----------------------------------------
    // [섹션 2] 형태 및 코 무늬
    // ----------------------------------------
    colorMode(RGB);
    fill(50);
    textAlign(LEFT, TOP);
    text("■ 형태 및 코 무늬", tX + 20, tY + 160);

    textSize(11); fill(100);
    text("입꼬리 긴장도", tX + 20, tY + 185);
    text("눈 표정", tX + 175, tY + 185);

    textAlign(CENTER, TOP);
    
    // (1) 예시 셀 색상을 어두운 회색('shape_gray')으로 변경
    this.drawMiniCell(tX + 45, tY + 225, 'circle', 'NEUTRAL', true, 'shape_gray'); 
    text("긍정", tX + 45, tY + 245);
    this.drawMiniCell(tX + 105, tY + 225, 'square', 'NEUTRAL', true, 'shape_gray'); 
    text("부정", tX + 105, tY + 245);

    this.drawMiniCell(tX + 195, tY + 225, 'square', 'FROWN', true, 'shape_gray'); 
    text("찌푸림", tX + 195, tY + 245);
    this.drawMiniCell(tX + 250, tY + 225, 'square', 'SURPRISED', true, 'shape_gray'); 
    text("충격", tX + 250, tY + 245);
    this.drawMiniCell(tX + 305, tY + 225, 'square', 'NEUTRAL', true, 'shape_gray'); 
    text("기본", tX + 305, tY + 245);

    // ----------------------------------------
    // [섹션 3] 타이핑 속도
    // ----------------------------------------
    textAlign(LEFT, TOP);
    fill(50); textSize(13);
    text("■ 타이핑 속도", tX + 20, tY + 285);
    
    textAlign(CENTER, TOP);
    textSize(11); fill(100);
    
    // (2) '채도/명도' 텍스트 수정 적용
    this.drawMiniCell(tX + 60, tY + 335, 'square', 'NEUTRAL', true, 'fast'); 
    text("빠름", tX + 60, tY + 355);
    text("(채움, 채도/명도↑)", tX + 60, tY + 370);
    
    this.drawMiniCell(tX + 175, tY + 335, 'square', 'NEUTRAL', false, 'medium'); 
    text("보통", tX + 175, tY + 355);
    text("(두꺼운 선)", tX + 175, tY + 370);

    this.drawMiniCell(tX + 290, tY + 335, 'square', 'NEUTRAL', false, 'slow'); 
    text("느림", tX + 290, tY + 355);
    text("(얇은 선, 채도/명도↓)", tX + 290, tY + 370);

    pop();
  },

  drawMiniCell: function(x, y, shape, eye = 'NEUTRAL', isFilled = true, speedLevel = 'fast') {
    push();
    translate(x, y);
    colorMode(HSB, 360, 100, 100);
    let size = 20;
    
    let hue = 0; 
    let sat = 0; 
    
    let bri = 70;
    let sw = 2;

    if (speedLevel === 'fast') { 
      bri = 85; 
    } else if (speedLevel === 'medium') { 
      bri = 55; 
      sw = 3.5; 
    } else if (speedLevel === 'slow') { 
      bri = 30; 
      sw = 1.2; 
    } else if (speedLevel === 'shape_gray') {
      bri = 55; // 형태 예시용 어두운 회색
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
    strokeWeight(1.5);
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