// ==========================================
// 🌍 [마스터 데이터] 프로젝트 전체 공유 전역 변수
// ==========================================
window.cells = window.cells || [];
window.archiveData = window.archiveData || [];

// 뜨개질 기본 설정 및 바늘 상태 마스터 값
const CELL_SIZE = 26;
const SPACING = 30;
let gridPath = []; 
let needlePhase = 0;
let currentTypingSpeed = 0; 
let lastSecondSpeedTarget = 0; 

// 1초 구간 타이핑 캐싱 변수
let tempBackspaceFlag = false;
let tempText = "";

// ==========================================
// 🇰🇷 [한글 IME 처리] 숨김 input 관련 전역 변수
// ==========================================
let _imeInput = null;
let _imeBuffer = '';     // 확정된 텍스트만 추적 (조합 중엔 업데이트 안 함)
let _imeComposing = false; // IME 조합 진행 중 여부

// ==========================================
// 🧭 [중앙 관제탑] 기획서 기준 초기 화면 설정 (S0: 랜딩)
// ==========================================
window.currentScreen = "S0"; 

function setup() {
  createCanvas(1280, 832);

  if (window.page_S4 && page_S4.initGridPath) {
    page_S4.initGridPath(); 
  }
  if (window.page_S5 && page_S5.initDB) {
    page_S5.initDB();
  }
  if (typeof setupKnitstampInput === 'function') {
    setupKnitstampInput();
  }

  // ============================================
  // 🇰🇷 [한글 IME 전용 숨김 input]
  //
  // [버그1 수정] z-index:-1, pointer-events:none 제거
  //   → 이 두 속성이 브라우저의 programmatic focus()를 막고 있었음
  //   → top:-200px으로 화면 밖에 배치해서 보이지 않게 처리
  //
  // [버그2 수정] _imeBuffer를 조합 중엔 절대 업데이트하지 않음
  //   → 기존 코드는 isComposing=true일 때도 _imeBuffer=current를 실행해서
  //     compositionend 시점에 diff가 0이 되어 한글이 통째로 유실됨
  //   → compositionend 이벤트에서만 _imeBuffer를 업데이트하도록 분리
  // ============================================
  _imeInput = document.createElement('input');
  _imeInput.setAttribute('type', 'text');
  _imeInput.setAttribute('autocomplete', 'off');
  _imeInput.setAttribute('autocorrect', 'off');
  _imeInput.setAttribute('autocapitalize', 'off');
  _imeInput.setAttribute('spellcheck', 'false');
  _imeInput.style.cssText = [
    'position:fixed',
    'top:-200px',         // 화면 밖으로 밀어냄 (opacity 트릭 대신)
    'left:50%',
    'width:100px',        // 너무 작으면 IME가 제대로 동작 안 하는 브라우저 있음
    'height:30px',
    'font-size:16px',     // iOS 자동 줌 방지
    'opacity:0',          // 시각적으로만 숨김 (포커스는 정상 동작)
    'border:none',
    'outline:none',
    'background:transparent'
    // z-index:-1 제거 → 포커스 허용
    // pointer-events:none 제거 → 포커스 허용
  ].join(';');
  document.body.appendChild(_imeInput);

  // ─────────────────────────────────────────
  // 이벤트 1: compositionstart — 조합 시작 플래그
  // ─────────────────────────────────────────
  _imeInput.addEventListener('compositionstart', function() {
    _imeComposing = true;
  });

  // ─────────────────────────────────────────
  // 이벤트 2: compositionend — 한글 음절 확정 캡처
  // ─────────────────────────────────────────
  _imeInput.addEventListener('compositionend', function(e) {
    _imeComposing = false;
    if (window.currentScreen !== 'S4') return;

    // e.data = 완성된 한글 음절 ("한", "글", "이번" 등)
    if (e.data) {
      tempText += e.data;
    }
    // ✅ 확정 후에만 _imeBuffer 업데이트
    _imeBuffer = _imeInput.value;
  });

  // ─────────────────────────────────────────
  // 이벤트 3: input — 영문·숫자·백스페이스 처리
  // ─────────────────────────────────────────
  _imeInput.addEventListener('input', function(e) {
    if (window.currentScreen !== 'S4') return;

    // 백스페이스
    if (e.inputType === 'deleteContentBackward') {
      tempBackspaceFlag = true;
      if (tempText.length > 0) tempText = tempText.slice(0, -1);
      _imeBuffer = _imeInput.value;
      return;
    }

    // 조합 중(한글 입력 중)이면 compositionend가 처리하므로 여기선 스킵
    // _imeBuffer도 업데이트하지 않음 (핵심 버그 수정 포인트!)
    if (_imeComposing) return;

    // 영문, 숫자, 스페이스, 특수문자 등 비-IME 문자 캡처
    let current = _imeInput.value;
    if (current.length > _imeBuffer.length) {
      let added = current.slice(_imeBuffer.length);
      tempText += added;
      _imeBuffer = current;
    }

    // 버퍼 오버플로우 방지
    if (_imeInput.value.length > 200) {
      _imeInput.value = '';
      _imeBuffer = '';
    }
  });

  // ─────────────────────────────────────────
  // 포커스 이탈 시 S4에서 자동 복구
  // ─────────────────────────────────────────
  _imeInput.addEventListener('blur', function() {
    if (window.currentScreen === 'S4') {
      setTimeout(function() {
        if (window.currentScreen === 'S4') _imeInput.focus();
      }, 50);
    }
  });

  // 캔버스 클릭 시 포커스 이전
  document.querySelector('canvas').addEventListener('mousedown', _imeFocus);

  // 맥북 한글 IME 조합 중에도 타수를 무조건 기록하는 네이티브 이벤트
  window.addEventListener("keydown", function(e) {
    if (window.currentScreen !== 'S4') return;

    const ignoreKeys = ["Shift", "Control", "Alt", "Meta", "Escape", "CapsLock", "Tab", "Process", "Unidentified"];
    if (ignoreKeys.includes(e.key)) return;

    // ── [DEBUG: 삭제 시 이 블록 제거] ──────────────────────────
    // b키: 기준 표정 수동 재등록 (IME input이 포커스를 가져도 동작)
    if (FACE_DEBUG && e.key === 'b') {
      if (typeof registerFaceBaseline === 'function') {
        let result = registerFaceBaseline();
        console.log('[baseline] 수동 등록 결과:', result);
      }
      return;
    }
    // ────────────────────────────────────────────────────────────

    if (typeof recordKnitstampKey === 'function') {
      recordKnitstampKey();
    }
  });
} // <-- setup() 닫는 중괄호

// 숨김 input 포커스 헬퍼 (S4 전용)
function _imeFocus() {
  if (window.currentScreen === 'S4' && _imeInput) {
    _imeInput.focus();
  }
}


function draw() {
  colorMode(RGB);
  background('#FAFAFA'); 

  if (window.currentScreen === "S0") {
    if (window.page_S0 && page_S0.drawLanding) {
      page_S0.drawLanding();
    } else {
      drawDebugPlaceholder("S0: 랜딩 화면");
    }
    return;
  }

  if (window.currentScreen === "S1") {
    if (window.page_S1 && page_S1.drawOnboarding) {
      page_S1.drawOnboarding();
    } else {
      drawDebugPlaceholder("S1': 통합 온보딩 화면");
    }
    return;
  }

  if (window.currentScreen === "S3") {
    if (window.page_S3 && page_S3.drawNameInput) {
      page_S3.drawNameInput();
    } else {
      drawDebugPlaceholder("S3: 작가명 입력 화면");
    }
    return;
  }

  if (window.currentScreen === "S4") {
    page_S4.updateAndDraw();
    return;
  }

  if (window.currentScreen === "S5") {
    page_S4.updateAndDraw();
    if (window.page_S5 && page_S5.drawArchiveGuideUI) {
      page_S5.drawArchiveGuideUI(window.archiveData);
    }
    return;
  }

  if (window.currentScreen === "S6") {
    if (window.page_S6 && page_S6.drawPrivateReceipt) {
      page_S6.drawPrivateReceipt();
    } else {
      drawDebugPlaceholder("S6: 비공개 완료 페이지 (영수증)");
    }
    return;
  }

  if (window.currentScreen === "S7") {
    if (window.page_S7_S8 && page_S7_S8.drawS7Timeline) {
      page_S7_S8.drawS7Timeline();
    } else {
      drawDebugPlaceholder("S7: 아카이브 박물관 리스트");
    }
    return;
  }

  if (window.currentScreen === "S8") {
    if (window.page_S7_S8 && page_S7_S8.drawS8SingleView) {
      page_S7_S8.drawS8SingleView();
    } else {
      drawDebugPlaceholder("S8: 아카이브 단독 상세 뷰");
    }
    return;
  }

  // [DEBUG: 삭제 시 이 줄 제거]
  if (typeof FACE_DEBUG !== 'undefined' && FACE_DEBUG) console.log(window.archiveData);
}

// ==========================================
// ⌨️ 키 입력 이벤트
// ==========================================
function keyPressed() {
  if (keyCode === SHIFT || keyCode === CONTROL || keyCode === ALT || keyCode === ESCAPE) return;

  // 숫자키 화면 이동 시 S5 인풋 폼 청소
  if (['0','1','3','4','5','6','7','8'].includes(key)) {
    if (window.page_S5 && page_S5.removeUI) {
      page_S5.removeUI(); 
    }
  }

  if (key === '0') { window.currentScreen = "S0"; return false; }
  if (key === '1') { window.currentScreen = "S1"; return false; }
  if (key === '3') { window.currentScreen = "S3"; return false; }

  if (key === '4') {
    window.currentScreen = "S4";
    setTimeout(() => _imeFocus(), 50); // S4 진입 시 포커스 이전
    return false;
  }

  if (key === '5') { window.currentScreen = "S5"; return false; }
  if (key === '6') { window.currentScreen = "S6"; return false; }
  if (key === '7') {
    window.currentScreen = "S7"; // 즉시 전환 — S5 UI 재생성 방지
    if (window.page_S7_S8 && page_S7_S8.loadDataFromDB) {
      page_S7_S8.loadDataFromDB(); // 백그라운드 데이터 갱신
    }
    return false;
  }
  if (key === '8') { window.currentScreen = "S8"; return false; }

  // S4 타이핑 모드
  if (window.currentScreen === "S4") {

    // 🇰🇷 키 입력 시 _imeInput에 포커스가 없으면 즉시 복구
    // (다른 요소가 포커스를 가져갔을 경우 대비)
    if (_imeInput && document.activeElement !== _imeInput) {
      _imeInput.focus();
    }

    // 백스페이스: _imeInput에 포커스가 없을 때만 폴백 처리
    // (포커스가 있으면 input 이벤트의 deleteContentBackward가 처리함)
    if (keyCode === BACKSPACE && document.activeElement !== _imeInput) {
      tempBackspaceFlag = true;
      if (tempText.length > 0) tempText = tempText.slice(0, -1);
    }
  }

  if (key === ' ') return false;
}

// keyTyped: 텍스트 수집 역할 없음 (스크롤 방지만)
function keyTyped() {
  if (key === ' ') return false;
}

function mousePressed() {
  if (window.currentScreen === "S7" && window.page_S7_S8 && page_S7_S8.checkS7Click) {
    if (window.page_S5 && page_S5.removeUI) {
      page_S5.removeUI();
    }
    page_S7_S8.checkS7Click();
  }
  if (window.currentScreen === "S8" && window.page_S7_S8 && page_S7_S8.handleS8CheckboxClick) {
    page_S7_S8.handleS8CheckboxClick(mouseX, mouseY);
  }
}

function mouseWheel(event) {
  if (window.currentScreen === "S8" && window.page_S7_S8 && page_S7_S8.handleS8Scroll) {
    page_S7_S8.handleS8Scroll(event.delta);
    return false;
  }
  if (window.currentScreen === "S7" && window.page_S7_S8 && page_S7_S8.handleS7Scroll) {
    page_S7_S8.handleS7Scroll(event.delta);
    return false;
  }
}

function drawDebugPlaceholder(screenName) {
  push();
  textAlign(CENTER, CENTER);
  fill(120); textSize(24);
  text(`[ ${screenName} ]`, width / 2, height / 2 - 20);
  textSize(13); fill(160);
  text("임시 플레이스홀더 상태입니다. 상단 숫자 단축키를 눌러 테스트해 보세요!", width / 2, height / 2 + 20);
  text("단축키 안내 -> 0:랜딩 | 1:온보딩 | 3:작가명 | 4:뜨개질 | 5:공개팝업 | 6:비공개영수증 | 7:박물관", width / 2, height - 50);
  pop();
}