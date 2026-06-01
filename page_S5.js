/**
 * [S5 단계] 아카이브 등록 컨펌 및 데이터베이스(Dexie) 적재 엔진 모듈
 */
const page_S5 = {
  db: null,
  failCount: 0, // 저장 실패 카운터 트래킹

  // DOM 인풋/버튼 요소 보관용 변수
  nicknameInput: null,
  privacySelect: null,
  submitBtn: null,
  resetBtn: null,

  // 등록 확인 미리보기 상태
  pendingPayload:    null,
  previewMode:       false,
  confirmBtn:        null,
  cancelPreviewBtn:  null,

  // 1. 데이터베이스 초기화
  initDB: function() {
    this.db = new Dexie("KnitArchiveDB");
    // 메타데이터 및 쿼리 최적화를 위한 인덱스 지정
    this.db.version(1).stores({
      knitTable: '++id, nickname, privacy, date'
    });
    console.log("💾 [S5] 유리님의 Dexie 아카이브 DB 엔진 세팅 완료!");
    return Promise.resolve();
  },

  // 2. S5 진입 시 한 번만 실행되어 인풋 UI들을 화면에 배치하는 함수
  setupUI: function() {
    // 기존에 존재하던 엘리먼트가 있다면 중복 생성 방지를 위해 제거
    this.removeUI();

    // 닉네임 입력 인풋 생성 (+50 라인에 맞춤)
    this.nicknameInput = createInput('');
    this.nicknameInput.attribute('placeholder', '닉네임을 입력하세요 (미입력시 anonymous)');
    this.nicknameInput.size(230, 30);
    this.nicknameInput.position(width / 2 - 30, height / 2 + 35);

    // 공개 설정 셀렉트 박스 생성 (+100 라인에 맞춤)
    this.privacySelect = createSelect();
    this.privacySelect.size(120, 34);
    this.privacySelect.position(width / 2 - 30, height / 2 + 83);
    this.privacySelect.option('전체공개', 'public');
    this.privacySelect.option('비공개', 'private');

    // [아카이브에 등록] 버튼 (+210 라인으로 소폭 내림)
    this.submitBtn = createButton('아카이브에 등록');
    this.submitBtn.size(140, 40);
    this.submitBtn.position(width / 2 + 20, height / 2 + 210);
    this.submitBtn.style('background-color', '#4CAF50');
    this.submitBtn.style('color', 'white');
    this.submitBtn.style('border', 'none');
    this.submitBtn.style('cursor', 'pointer');
    this.submitBtn.mousePressed(() => this.handleUpload());

    // [다시 만들기] 버튼 (+210 라인으로 소폭 내림)
    this.resetBtn = createButton('다시 만들기');
    this.resetBtn.size(120, 40);
    this.resetBtn.position(width / 2 - 140, height / 2 + 210);
    this.resetBtn.style('background-color', '#f44336');
    this.resetBtn.style('color', 'white');
    this.resetBtn.style('border', 'none');
    this.resetBtn.style('cursor', 'pointer');
    this.resetBtn.mousePressed(() => this.handleResetFlow());
  },

  // 3. 화면이 전환될 때 DOM 인풋들을 깔끔하게 청소하는 함수
  removeUI: function() {
    if (this.nicknameInput)    { this.nicknameInput.remove();    this.nicknameInput    = null; }
    if (this.privacySelect)    { this.privacySelect.remove();    this.privacySelect    = null; }
    if (this.submitBtn)        { this.submitBtn.remove();        this.submitBtn        = null; }
    if (this.resetBtn)         { this.resetBtn.remove();         this.resetBtn         = null; }
    if (this.confirmBtn)       { this.confirmBtn.remove();       this.confirmBtn       = null; }
    if (this.cancelPreviewBtn) { this.cancelPreviewBtn.remove(); this.cancelPreviewBtn = null; }
    this.previewMode    = false;
    this.pendingPayload = null;
  },

  // 4. 메인 렌더링 레이아웃 (p5.js draw 루프에서 호출됨)
  drawArchiveGuideUI: function(rawArchiveData) {
    // 💡 만약 인자값으로 데이터가 안 들어왔다면 전역 마스터 배열을 기본값으로 바인딩 (방어 코드)
    let currentData = rawArchiveData || window.archiveData || [];

    // 인풋 UI가 아직 안 만들어졌다면 띄워주기
    if (!this.nicknameInput) {
      this.setupUI();
    }

    push();
    rectMode(CENTER);
    colorMode(RGB);

    // 배경 어두운 모달 팝업 레이아웃 (Y축 크기를 버튼 위치에 맞춰 550으로 살짝 확장)
    fill(255, 255, 255, 240);
    stroke(220); strokeWeight(1);
    rect(width / 2, height / 2 + 10, 500, 550, 12);

    // 타이틀 텍스트
    fill(30); noStroke(); textAlign(CENTER, TOP);
    textSize(22); textStyle(BOLD);
    text("당신의 띠가 완성되었어요 🧶", width / 2, height / 2 - 220);
    if (this.previewMode) {
      fill(80); textSize(13); textStyle(NORMAL);
      text("이렇게 아카이브에 등록됩니다. 확인해보세요.", width / 2, height / 2 - 193);
    }

    // 미리보기 영역
    if (this.previewMode && this.pendingPayload) {
      let pvW = 120, pvH = 100;
      let pvX = width / 2 - pvW / 2, pvY = height / 2 - 150;
      colorMode(RGB); stroke(200); strokeWeight(1); noFill();
      rectMode(CORNER); rect(pvX, pvY, pvW, pvH, 6);
      this.drawKnitPreview(pvX, pvY, pvW, pvH);
    } else {
      fill(240); stroke(200);
      rect(width / 2, height / 2 - 100, 120, 100, 6);
      fill(130); noStroke(); textSize(12); textStyle(NORMAL);
      text("[ 미리보기 영역 ]", width / 2, height / 2 - 106);
    }

    // 🌟 [수정] 메타데이터 라벨 좌표를 순서대로 정렬 (+50 -> +100 -> +150)
    textAlign(RIGHT, CENTER); textSize(14); fill(80);
    text("닉네임 : ", width / 2 - 50, height / 2 + 50);
    text("공개 설정 : ", width / 2 - 50, height / 2 + 100);
    text("글자수 : ", width / 2 - 50, height / 2 + 150);

    // 글자수 동적 연산 (안전하게 계산)
    let totalChars = 0;
    currentData.forEach(cell => {
      if (cell && cell.text) totalChars += cell.text.length;
    });

    // 🌟 [수정] 글자수 데이터 출력 좌표도 +150 라인으로 매칭
    textAlign(LEFT, CENTER); fill(30);
    text(`${totalChars} / 500`, width / 2 - 30, height / 2 + 150);

    // 미리보기 모드: 닉네임·공개설정 값을 p5.js 텍스트로 표시 (DOM 입력 필드 숨김 대체)
    if (this.previewMode && this.pendingPayload) {
      textAlign(LEFT, CENTER); textSize(13); fill(30); textStyle(NORMAL);
      text(this.pendingPayload.nickname, width / 2 - 30, height / 2 + 50);
      let privacyLabel = this.pendingPayload.privacy === 'private' ? '비공개' : '전체공개';
      text(privacyLabel, width / 2 - 30, height / 2 + 100);
    }

    // 경고 문구 강조 (+180 라인으로 조정)
    textAlign(CENTER, CENTER);
    fill(230, 81, 0); textStyle(BOLD); textSize(12);
    text("⚠ 등록 후에는 뜨개 코를 수정·삭제할 수 없습니다.", width / 2, height / 2 + 182);
    pop();
  },

  // 5. [다시 만들기] 시나리오 핸들러
  handleResetFlow: function() {
    let confirmResult = confirm("현재까지 생성된 띠가 완전히 폐기됩니다.\n정말 다시 시작할까요?");
    if (confirmResult) {
      this.clearProjectState();
      this.removeUI();
      window.currentScreen = "S0"; // 랜딩 페이지로 롤백
      console.log("♻️ [S5] 프로젝트 상태 초기화 및 S0 이동 완료");
    }
  },

  // 6. [아카이브에 등록] → 미리보기 확인 단계로 전환
  handleUpload: function() {
    if (!this.db) { alert("데이터베이스가 연결되지 않았습니다."); return; }

    let chosenNickname = this.nicknameInput.value().trim();
    if (chosenNickname === "") chosenNickname = "anonymous";
    let chosenPrivacy = this.privacySelect.value();
    if (chosenNickname === "anonymous") chosenPrivacy = "anonymous";

    let myKnitPiece = new KnitPiece(chosenNickname, chosenPrivacy);
    myKnitPiece.absorbArchiveData(window.archiveData);

    this.pendingPayload = {
      nickname:  myKnitPiece.nickname,
      privacy:   myKnitPiece.privacy,
      date:      myKnitPiece.date,
      cells:     myKnitPiece.cells,
      knitArray: myKnitPiece.knitArray
    };

    this.showPreviewModal();
  },

  // 7. 기획서 기준: 저장 실패 처리 및 3회 누적 플로우 제어
  processFailure: function() {
    this.failCount++;
    console.warn(`❌ 저장 실패 트래킹 카운트: ${this.failCount}/3`);
    
    if (this.failCount >= 3) {
      alert("🚨 [시스템 안내] 서버 및 저장소 연결에 3회 실패하였습니다.\n현재 데이터는 로컬 임시 저장 상태이며, 새로고침 시 사라집니다.");
      this.removeUI();
      window.currentScreen = "S7"; // 강제로 임시 전송 패스
    } else {
      alert(`⚠ 저장 처리에 실패했습니다. 다시 시도해 주세요. (재시도 횟수: ${this.failCount}/3)`);
    }
  },

  // 8. 전역 변수 데이터 완전 초기화 유틸리티
  clearProjectState: function() {
    window.cells = [];
    window.archiveData = [];
    window.tempText = "";
    window.tempBackspaceFlag = false;
    window.currentTypingSpeed = 0;
    window.lastSecondSpeedTarget = 0;
    window.needlePhase = 0;
    this.failCount = 0;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // [등록 확인 미리보기 블록] — UI 디자이너 응용 구역
  //   showPreviewModal  : '아카이브에 등록' 클릭 시 미리보기 모드 진입
  //   cancelPreview     : '돌아가기' 클릭 시 S5 입력 화면 복귀
  //   commitUpload      : '확인 및 등록' 클릭 시 실제 DB 저장 + S7 이동
  //   drawKnitPreview   : S7 갤러리뷰 스타일 니트 띠 렌더러
  //     └ 호출 인자: drawKnitPreview(bx, by, bandW, bandH)
  //       bx·by = 렌더 영역 좌상단 좌표, bandW·bandH = 너비·높이
  // ═══════════════════════════════════════════════════════════════════════════

  // 9. 미리보기 모달 진입: 기존 버튼·입력 필드 숨기고 확인/취소 버튼 생성
  showPreviewModal: function() {
    this.previewMode = true;
    if (this.submitBtn)     this.submitBtn.hide();
    if (this.resetBtn)      this.resetBtn.hide();
    if (this.nicknameInput) this.nicknameInput.hide();
    if (this.privacySelect) this.privacySelect.hide();

    this.cancelPreviewBtn = createButton('← 돌아가기');
    this.cancelPreviewBtn.size(120, 40);
    this.cancelPreviewBtn.position(width / 2 - 140, height / 2 + 210);
    this.cancelPreviewBtn.style('background-color', '#9E9E9E');
    this.cancelPreviewBtn.style('color', 'white');
    this.cancelPreviewBtn.style('border', 'none');
    this.cancelPreviewBtn.style('cursor', 'pointer');
    this.cancelPreviewBtn.mousePressed(() => this.cancelPreview());

    this.confirmBtn = createButton('확인 및 등록 ✓');
    this.confirmBtn.size(140, 40);
    this.confirmBtn.position(width / 2 + 20, height / 2 + 210);
    this.confirmBtn.style('background-color', '#1976D2');
    this.confirmBtn.style('color', 'white');
    this.confirmBtn.style('border', 'none');
    this.confirmBtn.style('cursor', 'pointer');
    this.confirmBtn.mousePressed(() => this.commitUpload());
  },

  // 10. 미리보기 취소: 원래 S5 입력 화면 복귀
  cancelPreview: function() {
    this.previewMode    = false;
    this.pendingPayload = null;
    if (this.confirmBtn)       { this.confirmBtn.remove();       this.confirmBtn       = null; }
    if (this.cancelPreviewBtn) { this.cancelPreviewBtn.remove(); this.cancelPreviewBtn = null; }
    if (this.submitBtn)     this.submitBtn.show();
    if (this.resetBtn)      this.resetBtn.show();
    if (this.nicknameInput) this.nicknameInput.show();
    if (this.privacySelect) this.privacySelect.show();
  },

  // 11. 확인 후 실제 DB 저장 및 화면 전환 (기존 handleUpload의 저장 로직)
  commitUpload: function() {
    let payload = this.pendingPayload;
    if (!payload) return;

    // 비공개 → S6 (DB 저장 없음)
    if (payload.privacy === 'private') {
      this.removeUI();
      window.currentScreen = "S6";
      return;
    }

    // 💡 10%의 확률로 의도적 실패 토스트 테스트
    let simulationSuccess = random(1) > 0.1;

    if (simulationSuccess) {
      this.db.knitTable.add(payload)
        .then(generatedId => {
          this.failCount = 0;
          this.removeUI();
          window.currentScreen = "S7";
          alert(`🎉 아카이브 등록 성공! (ID: ${generatedId})`);
          if (window.page_S7_S8 && page_S7_S8.loadDataFromDB) {
            page_S7_S8.loadDataFromDB();
          }
        })
        .catch(() => this.processFailure());
    } else {
      this.processFailure();
    }
  },

  // 12. S7 갤러리뷰 스타일 니트 띠 렌더러
  //   bx, by  : 렌더 영역 좌상단 좌표
  //   bandW   : 너비 (10셀 × PREV_SP 기준, 기본 120px)
  //   bandH   : 높이 (rows × PREV_SP 만큼 렌더 후 클립)
  drawKnitPreview: function(bx, by, bandW, bandH) {
    let gridData = (this.pendingPayload && (this.pendingPayload.knitArray || this.pendingPayload.cells)) || [];
    if (gridData.length === 0) return;

    const PREV_SP   = 12;   // 셀 중심 간격 (S7: 16)
    const PREV_CELL = 10;   // 셀 크기     (S7: 14.4)

    push();
    colorMode(RGB); fill(245); noStroke();
    rectMode(CORNER); rect(bx, by, bandW, bandH, 6);

    colorMode(HSB, 360, 100, 100);

    for (let j = 0; j < gridData.length; j++) {
      let col  = j % 10;
      let row  = Math.floor(j / 10);
      let cell = gridData[j];
      let cx   = bx + col * PREV_SP + PREV_CELL * 0.5;
      let cy   = by + row * PREV_SP + PREV_CELL * 0.5;
      if (cy - PREV_CELL * 0.5 > by + bandH) break;

      let { h, s, b, stitchH, stitchBri } = (cell.bgHue !== undefined)
        ? { h: cell.bgHue, s: cell.sat, b: cell.bgBri, stitchH: cell.stitchHue, stitchBri: cell.stitchBri }
        : _knitCellColors(cell);

      const cellW  = PREV_CELL - 1;
      const cellH  = PREV_CELL - 1;
      const minDim = PREV_CELL;

      if (cell.isBackspace) {
        let lineR = minDim * 0.4;
        stroke(h, s, b); strokeWeight(max(0.5, minDim * 0.15)); noFill();
        line(cx - lineR, cy - lineR, cx + lineR * 0.4, cy);
        line(cx - lineR, cy + lineR, cx + lineR * 0.2, cy);
      } else {
        let isFilled = (cell.speed || 0) >= 0.6;
        let isSquare = (cell.tension || 0.5) >= 0.5;
        let sw = max(0.4, minDim * 0.12);

        if (isFilled) { fill(h, s, b); noStroke(); }
        else          { noFill(); stroke(h, s, b); strokeWeight(sw); }

        if (isSquare) { rectMode(CENTER); rect(cx, cy, cellW, cellH, max(0.5, minDim * 0.08)); }
        else          { ellipse(cx, cy, cellW, cellH); }

        if (minDim >= 6) {
          let r = minDim * 0.25;
          stroke(stitchH, s, stitchBri); strokeWeight(max(0.4, minDim * 0.08)); noFill();
          if (cell.eye === 'FROWN' || cell.eye === '찌푸림') {
            line(cx - r, cy - r, cx + r, cy + r);
            line(cx + r, cy - r, cx - r, cy + r);
          } else if (cell.eye === 'SURPRISED' || cell.eye === '놀람') {
            beginShape();
            for (let k = 0; k < 8; k++) {
              let radius = k % 2 === 0 ? r : r * 0.4;
              vertex(cx + cos(PI / 4 * k) * radius, cy + sin(PI / 4 * k) * radius);
            }
            endShape(CLOSE);
          } else {
            beginShape();
            vertex(cx - r, cy - r * 0.6);
            vertex(cx,     cy + r * 0.8);
            vertex(cx + r, cy - r * 0.6);
            endShape();
          }
        }
      }
    }
    pop();
  }
};

window.page_S5 = page_S5;