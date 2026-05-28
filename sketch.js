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

// 🌟 [추가] 한글 IME 조합 상태 플래그
let isComposing = false;

// ==========================================
// 🧭 [중앙 관제탑] 기획서 기준 초기 화면 설정 (S0: 랜딩)
// ==========================================
window.currentScreen = "S0"; 

function setup() {
  createCanvas(1280, 832);

  
  
  // page_S4 내부의 initGridPath 함수를 호출하여 전역 gridPath 배열 초기화
  if (window.page_S4 && page_S4.initGridPath) {
    page_S4.initGridPath(); 
  }

  // 유리님의 IndexedDB 데이터베이스 초기화 (S5 엔진이 로드되어 있다면)
  if (window.page_S5 && page_S5.initDB) {
    page_S5.initDB();
  }
  
  // 인풋 컨트롤러 초기화
  if (typeof setupKnitstampInput === 'function') {
    setupKnitstampInput();
  }

  // 🌟 [추가] 한글 IME 조합 이벤트 리스너 등록
  document.addEventListener('compositionstart', function() {
    isComposing = true;
  });

  document.addEventListener('compositionend', function(e) {
    isComposing = false;
    // 조합이 완료된 온전한 한글 음절만 여기서 받습니다
    if (window.currentScreen === "S4" || window.currentScreen === "S5") {
      if (e.data && e.data.length > 0) {
        tempText += e.data;
      }
    }
  });
}

function draw() {
  colorMode(RGB);
  background('#FAFAFA'); 

  // ==========================================
  // 🏢 [화면 라우팅 시스템] 기획서 플로우 맵핑
  // ==========================================
  
  // S0: Landing (카피 보강 화면)
  if (window.currentScreen === "S0") {
    if (window.page_S0 && page_S0.drawLanding) {
      page_S0.drawLanding();
    } else {
      drawDebugPlaceholder("S0: 랜딩 화면");
    }
    return;
  }

  // S1': 온보딩 통합 단계 (S1 + S2 합쳐진 형태)
  if (window.currentScreen === "S1") {
    if (window.page_S1 && page_S1.drawOnboarding) {
      page_S1.drawOnboarding();
    } else {
      drawDebugPlaceholder("S1': 통합 온보딩 화면");
    }
    return;
  }

  // S3: 작가 이름 및 닉네임 인풋 화면
  if (window.currentScreen === "S3") {
    if (window.page_S3 && page_S3.drawNameInput) {
      page_S3.drawNameInput();
    } else {
      drawDebugPlaceholder("S3: 작가명 입력 화면");
    }
    return;
  }

  // S4: 실시간 감정 뜨개 방직 화면
  if (window.currentScreen === "S4") {
    page_S4.updateAndDraw(); // 유리님이 분리해둔 순수 그래픽 엔진 가동
    return;
  }

  // S5: 아카이브 가이드 UI 및 팝업 (privacy ≠ private 일 때 진입)
  if (window.currentScreen === "S5") {
    page_S4.updateAndDraw(); // 배경에는 실시간 뜨개 무늬 유지
    if (window.page_S5 && page_S5.drawArchiveGuideUI) {
      page_S5.drawArchiveGuideUI(window.archiveData);
    }
    return;
  }

  // S6: 비공개 완료 영수증 화면 (privacy === private 일 때 진입)
  if (window.currentScreen === "S6") {
    if (window.page_S6 && page_S6.drawPrivateReceipt) {
      page_S6.drawPrivateReceipt();
    } else {
      drawDebugPlaceholder("S6: 비공개 완료 페이지 (영수증)");
    }
    return;
  }

  // S7: 전체 아카이브 박물관 타임라인 리스트
  if (window.currentScreen === "S7") {
    if (window.page_S7_S8 && page_S7_S8.drawS7Timeline) {
      page_S7_S8.drawS7Timeline();
    } else {
      drawDebugPlaceholder("S7: 아카이브 박물관 리스트");
    }
    return;
  }

  // S8: 아카이브 단독 상세 뷰 (S7 위에 오버레이로 표현 가능)
  if (window.currentScreen === "S8") {
    if (window.page_S7_S8 && page_S7_S8.drawS8SingleView) {
      page_S7_S8.drawS8SingleView();
    } else {
      drawDebugPlaceholder("S8: 아카이브 단독 상세 뷰");
    }
    return;
  }

}

// ==========================================
// ⌨️ 키 입력 이벤트 및 디버깅 핫키 스위치
// ==========================================
function keyPressed() {
  // 시스템 제어 단축키 패스
  if (keyCode === SHIFT || keyCode === CONTROL || keyCode === ALT || keyCode === ESCAPE) return;

  // 🌟 [추가] 숫자키를 눌러 강제 화면 이동 시 S5 인풋 폼들을 깨끗하게 지워줍니다.
  if (['0','1','3','4','5','6','7','8'].includes(key)) {
    if (window.page_S5 && page_S5.removeUI) {
      page_S5.removeUI(); 
    }
  }

  // 🛠️ 임시 화면 제어 단축키 (숫자 입력 시 해당 페이지로 강제 트랜지션)
  if (key === '0') { window.currentScreen = "S0"; return false; }
  if (key === '1') { window.currentScreen = "S1"; return false; } // S1' 통합본으로 연결
  if (key === '3') { window.currentScreen = "S3"; return false; }
  if (key === '4') { window.currentScreen = "S4"; return false; }
  if (key === '5') { window.currentScreen = "S5"; return false; }
  if (key === '6') { window.currentScreen = "S6"; return false; }
  if (key === '7') { 
    // S7로 갈 때는 조원분들의 로드 함수가 있다면 실행 후 이동
    if (window.page_S7_S8 && page_S7_S8.loadDataFromDB) {
      page_S7_S8.loadDataFromDB().then(() => { window.currentScreen = "S7"; });
    } else {
      window.currentScreen = "S7";
    }
    return false; 
  }
  if (key === '8') { window.currentScreen = "S8"; return false; }

  // 🧶 S4나 S5 타이핑 모드일 때만 한 글자씩 빌드업 캐싱
  if (window.currentScreen === "S4" || window.currentScreen === "S5") {
    if (keyCode === BACKSPACE) {
      tempBackspaceFlag = true;

      //백스페이스 누르면 지워지도록 처리
      if (tempText.length > 0) {
        tempText = tempText.slice(0, -1);
      }
    } 
  }
  
  // 팀원분 키 타이핑 트래커 연동
  if (typeof recordKnitstampKey === 'function') {
    recordKnitstampKey();
  }

  // 스페이스바 브라우저 튕김 방지
  if (key === ' ') return false;
}

// 2) 🌟 [새로 추가] 화면에 진짜 글자가 타이핑되는 순간 한글을 온전하게 가로챕니다!
function keyTyped() {
  if (window.currentScreen === "S4" || window.currentScreen === "S5") {
    // 스페이스바 처리
    if (key === ' ') {
      tempText += ' ';
      return false; 
    }

    // 🌟 [핵심 수정] IME 조합 중이면 완전히 무시 (한글 중간 자모 차단)
    // 조합이 끝난 한글은 compositionend에서 처리하므로 여기선 영문/숫자만 받습니다
    if (isComposing || key === 'Process') {
      return false;
    }
    
    // 완성된 온전한 한글 문자만 tempText에 누적합니다.
    if (key.length === 1) {
      tempText += key; 
    }
  }
}

function mousePressed() {
  // S7 타임라인 화면일 때 클릭 인터랙션 핸들러 가동
  if (window.currentScreen === "S7" && window.page_S7_S8 && page_S7_S8.checkS7Click) {
    
    // 🌟 [추가] 마우스 클릭으로 S8 상세 뷰에 진입하기 직전, S5의 좀비 UI들을 싹 청소합니다!
    if (window.page_S5 && page_S5.removeUI) {
      page_S5.removeUI();
    }

    page_S7_S8.checkS7Click();
  }
}

// 📌 아직 구현되지 않은 조원분들의 화면 영역을 안내해 주는 디버깅 가이드 플레이스홀더
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