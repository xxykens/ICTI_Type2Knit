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

  noLoop();

  const p5cvs = document.querySelector('canvas');
  if (!p5cvs) return;

  panel.style.position = 'relative';
  panel.style.overflow = 'hidden';
  p5cvs.style.position = 'absolute';
  p5cvs.style.top = '0';
  p5cvs.style.left = '0';
  panel.appendChild(p5cvs);

  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  resizeCanvas(pw, ph);

  const piece = new KnitPiece('preview', 'public');
  piece.absorbArchiveData(window.archiveData);
  const gridData = piece.knitArray || piece.cells || [];

  const S8_CELL    = 38;
  const S8_SPACING = 44;
  const S8_GRID_W  = S8_CELL / 2 + 9 * S8_SPACING + S8_CELL / 2;
  const scale      = pw / S8_GRID_W;
  const cellSize   = S8_CELL    * scale;
  const spacing    = S8_SPACING * scale;
  const startX     = cellSize / 2;
  const startY     = cellSize / 2 + 8;

  push();
  colorMode(RGB);
  background(245);

  push();
  colorMode(HSB, 360, 100, 100);

  if (window.page_S7_S8) {
    page_S7_S8.drawKnitGrid(gridData, startX, startY, cellSize, spacing, {
      showText:        false,
      showEmotionInfo: false,
      privacy:         'public',
      clipMinY:        -Infinity,
      clipMaxY:        ph + spacing
    });
  }

  pop();
  pop();
};