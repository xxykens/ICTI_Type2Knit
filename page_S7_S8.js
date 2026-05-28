/**
 * [S7-S8 단계] 팀원 그래픽引擎 이식형 아카이브 뷰어 모듈
 */
const page_S7_S8 = {
  archivedPieces: [],
  selectedPiece: null,

  // Dexie 데이터 로드
  loadDataFromDB: function() {
    if (!window.page_S5 || !window.page_S5.db) return Promise.resolve([]);
    return window.page_S5.db.knitTable.toArray()
      .then(data => {
        // 최신 데이터가 위로 오도록 역순(내림차순) 정렬하는 것이 타임라인에 유리합니다!
        data.sort((a, b) => new Date(b.date) - new Date(a.date)); 
        this.archivedPieces = data;
        return data;
      })
      .catch(err => {
        console.error("❌ 아카이브 로드 실패:", err);
        return [];
      });
  },

  // [S7] 아카이브 타임라인 렌더링
  drawS7Timeline: function() {
    push();
    colorMode(RGB);
    
    // 타이틀 텍스트 영역
    fill(30); noStroke(); textSize(22); textStyle(BOLD); textAlign(LEFT, TOP);
    text("📅 아카이브 박물관 타임라인", 50, 40);
    textSize(13); fill(120); textStyle(NORMAL);
    text("사용자들이 방직한 감정의 띠입니다. 클릭하여 상세 뷰를 열어보세요. | 메인 화면 돌아가기: '4'", 50, 75);

    let startX = 50;
    let startY = 130;
    let miniCellSize = 12; // 가시성을 위해 살짝 키움
    let spacing = miniCellSize + 4;
    let pieceGap = 45;

    if (this.archivedPieces.length === 0) {
      fill(150); textAlign(CENTER, CENTER); textSize(15);
      text("아직 등록된 아카이브 띠가 없습니다. 첫 번째 띠를 엮어보세요! 🧶", width / 2, height / 2);
      pop();
      return;
    }

    this.archivedPieces.forEach((piece) => {
      let grid = piece.knitArray || piece.cells || [];
      if (!grid || grid.length === 0) return;

      let totalRows = Math.ceil(grid.length / 10);
      let totalHeight = totalRows * spacing + 25;
      let totalWidth = 10 * spacing + 20;

      // 🌟 [수정] 마우스 호버 히트박스를 실제 미니 띠의 영역 사이즈로 타이트하게 정렬
      let isHovered = mouseX >= startX && mouseX <= startX + totalWidth + 250 &&
                      mouseY >= startY && mouseY <= startY + totalHeight;

      // 마우스 오버 시 하이라이트 인터랙션
      if (isHovered) {
        fill(30, 160, 255);
        cursor(HAND);
        push();
        noFill(); stroke(30, 160, 255, 100); strokeWeight(1);
        rect(startX - 10, startY - 8, totalWidth + 260, totalHeight + 10, 6);
        pop();
      } else {
        fill(50);
      }
      
      let formattedDate = new Date(piece.date).toLocaleString('ko-KR', { hour12: false });
      textSize(14); textStyle(BOLD); textAlign(LEFT, TOP);
      
      // 비공개 상태인 경우 텍스트 마스킹 처리
      let displayNickname = piece.privacy === "private" ? "익명의 니터" : `${piece.nickname}님`;
      let privacyTag = piece.privacy === "private" ? "🔒 비공개" : "🌐 전체공개";
      text(`▶ ${displayNickname}의 감정 띠 (${privacyTag})`, startX, startY);
      
      textSize(11); fill(140); textStyle(NORMAL);
      text(formattedDate, startX + 15, startY + 22);

      // 타임라인 미니 플롯 드로잉
      push();
      colorMode(HSB, 360, 100, 100);
      let cellX = startX + 15;
      let cellY = startY + 42;

      grid.forEach((cell, idx) => {
        let col = idx % 10;
        let row = Math.floor(idx / 10);
        let posX = cellX + col * spacing;
        let posY = cellY + row * spacing;

        // 🌟 비공개 데이터일 경우 타임라인에서도 그레이스케일(🔒)로 블라인드 처리
        if (piece.privacy === "private") {
          fill(0, 0, 40); noStroke();
          rect(posX, posY, miniCellSize, miniCellSize, 1);
          return;
        }

        if (cell.isBackspace) {
          stroke(0, 0, 30); strokeWeight(1.2); noFill();
          line(posX, posY, posX + miniCellSize, posY + miniCellSize);
        } else {
          let bgHue = map(cell.tension || 0.5, 0, 1, 0, 360);
          let sat = map(cell.speed || 0, 0, 1, 15, 60);
          let bri = map(cell.speed || 0, 0, 1, 70, 95);
          
          fill(bgHue, sat, bri); noStroke();
          if ((cell.tension || 0.5) >= 0.5) {
            rect(posX, posY, miniCellSize, miniCellSize, 2);
          } else {
            ellipse(posX + miniCellSize/2, posY + miniCellSize/2, miniCellSize, miniCellSize);
          }
        }
      });
      pop();

      // 다음 아이템을 위한 Y축 피딩 유격 연산
      startY += totalHeight + pieceGap;
    });
    pop();
  },

  // 클릭 히트박스 판정
  checkS7Click: function() {
    let clickStartY = 130;
    let miniCellSize = 12;
    let spacing = miniCellSize + 4;
    let pieceGap = 45;
    let startX = 50;

    for (let piece of this.archivedPieces) {
      let grid = piece.knitArray || piece.cells || [];
      if (!grid || grid.length === 0) continue;

      let totalRows = Math.ceil(grid.length / 10);
      let totalHeight = totalRows * spacing + 25;
      let totalWidth = 10 * spacing + 20;

      let isHovered = mouseX >= startX && mouseX <= startX + totalWidth + 250 &&
                      mouseY >= clickStartY && mouseY <= clickStartY + totalHeight;

      if (isHovered) {
        this.selectedPiece = piece;
        window.currentScreen = "S8";
        cursor(ARROW);
        console.log("🎯 [S8 진입] 선택된 도큐먼트:", piece.nickname);
        return true; // 클릭 성공 반환
      }
      clickStartY += totalHeight + pieceGap;
    }
    return false;
  },

  // [S8] 단독 상세 뷰 
  drawS8SingleView: function() {
    if (!this.selectedPiece) {
      window.currentScreen = "S7";
      return;
    }

    push();
    colorMode(RGB);
    let piece = this.selectedPiece;

    // 상단 네비게이션 가이드
    fill(30); noStroke(); textSize(22); textStyle(BOLD); textAlign(LEFT, TOP);
    let titleName = piece.privacy === "private" ? "익명의 니터" : `${piece.nickname}님`;
    text(`🔲 단독 상세 뷰: ${titleName}의 작품`, 50, 40);
    textSize(13); fill(120); textStyle(NORMAL);
    text("마우스를 니트 코 위에 올리면 그 순간의 텍스트와 감정이 복원됩니다. | 목록으로 복귀: '7'", 50, 75);

    let cellSize = 38;
    let spacing = 44;
    let gridData = piece.knitArray || piece.cells || [];
    
    let startX = width / 2 - (10 * spacing) / 2 + cellSize/2;
    let startY = 150;

    let hoveredCellInfo = null;

    // 🌟 격리된 HSB 컬러 매핑 존 시작
    push(); 
    colorMode(HSB, 360, 100, 100);

    gridData.forEach((cell, idx) => {
      let col = idx % 10;
      let row = Math.floor(idx / 10);
      
      let posX = startX + col * spacing;
      let posY = startY + row * spacing;

      let bgHue = map(cell.tension || 0.5, 0, 1, 0, 360);
      let hueShift = 0;
      
      if (cell.eye === 'FROWN') hueShift = 45;
      else if (cell.eye === 'SURPRISED') hueShift = 110;
      else if (cell.eye === 'BLURRY') hueShift = 180;

      let stitchHue = (bgHue + hueShift + 360) % 360;
      let baseBri = map(cell.speed || 0, 0, 1, 65, 90);
      let bgBri = baseBri;
      let stitchBri = min(baseBri + 15, 100);
      let sat = map(cell.speed || 0, 0, 1, 20, 60);

      // [1] 백스페이스 올 풀림 복원
      if (cell.isBackspace) {
        stroke(bgHue, sat, bgBri); strokeWeight(3.5); noFill();
        line(posX - 12, posY - 12, posX + 5, posY);
        line(posX - 12, posY + 12, posX + 2, posY);
      } 
      // [2] 정상 니트 셀 렌더링
      else {
        let isFilled = (cell.speed || 0) >= 0.6;
        let actualSize = isFilled ? cellSize : cellSize - 5;

        if (isFilled) {
          fill(bgHue, sat, bgBri); noStroke();
        } else {
          noFill(); stroke(bgHue, sat, bgBri);
          strokeWeight(map(cell.speed || 0, 0, 0.6, 2, 4.5));
        }

        if ((cell.tension || 0.5) >= 0.5) {
          rectMode(CENTER); rect(posX, posY, actualSize, actualSize, 6);
        } else {
          ellipse(posX, posY, actualSize, actualSize);
        }

        // 스티치 내부 무늬 드로잉 복원
        let r = cellSize * 0.28;
        stroke(stitchHue, sat, stitchBri); strokeWeight(2.5); noFill();

        if (cell.eye === 'FROWN') {
          line(posX - r, posY - r, posX + r, posY + r);
          line(posX + r, posY - r, posX - r, posY + r);
        } else if (cell.eye === 'SURPRISED') {
          beginShape();
          for (let i = 0; i < 8; i++) {
            let radius = i % 2 === 0 ? r : r * 0.4;
            let angle = PI / 4 * i;
            vertex(posX + cos(angle) * radius, posY + sin(angle) * radius);
          }
          endShape(CLOSE);
        } else {
          beginShape();
          vertex(posX - r, posY - r * 0.6); 
          vertex(posX, posY + r * 0.8); 
          vertex(posX + r, posY - r * 0.6);
          endShape();
        }

        // 🔒 비공개 상태 자물쇠 마스킹 오버레이
        if (piece.privacy === "private") {
          fill(0, 0, 15, 0.96); noStroke();
          rectMode(CENTER); rect(posX, posY, cellSize, cellSize, 4);
          fill(0, 0, 100); textSize(12); textAlign(CENTER, CENTER);
          text("🔒", posX, posY + 1);
        } 
        // 🌐 글자 출력 매핑
        else if (cell.text && cell.text.trim().length > 0) {
          fill(0, 0, 15); noStroke(); textSize(12); textStyle(BOLD); textAlign(CENTER, CENTER);
          text(cell.text.trim()[0], posX, posY + 1);
        }
      }

      // 마우스 호버 검사
      if (mouseX >= posX - cellSize/2 && mouseX <= posX + cellSize/2 &&
          mouseY >= posY - cellSize/2 && mouseY <= posY + cellSize/2) {
        hoveredCellInfo = cell;
        stroke(0, 0, 80); strokeWeight(2); noFill();
        rectMode(CENTER); rect(posX, posY, cellSize + 6, cellSize + 6, 8);
      }
    });
    pop(); // HSB 격리 종료

    // [3] 하단 대시보드 UI 팝업창 (RGB 렌더)
    if (hoveredCellInfo) {
      let totalRows = Math.ceil(gridData.length / 10);
      let popupY = max(startY + totalRows * spacing + 30, height - 160);

      fill(250); stroke(220); strokeWeight(1);
      rectMode(CORNER); rect(50, popupY, width - 100, 110, 8);

      fill(40); noStroke(); textAlign(LEFT, TOP);
      
      if (piece.privacy === "private") {
        textSize(14); textStyle(BOLD);
        text("🔒 작성자가 비공개로 보호한 감정 스티치입니다.", 75, popupY + 22);
        textStyle(NORMAL); textSize(12); fill(120);
        text(`• 연산 태그: ${hoveredCellInfo.eye}  |  얼굴 텐션 수치: ${(hoveredCellInfo.tension * 100).toFixed(0)}%`, 75, popupY + 55);
        text(`• 타자 속도 압박 지표: ${(hoveredCellInfo.speed * 100).toFixed(0)}%`, 75, popupY + 77);
      } else {
        textSize(14); textStyle(BOLD);
        text(`💬 복원된 입력 텍스트: "${hoveredCellInfo.text || "공백 또는 엔터"}"`, 75, popupY + 22);
        textStyle(NORMAL); textSize(12); fill(70);
        text(`• 실시간 페이스 태그: ${hoveredCellInfo.eye} (얼굴 긴장 수치: ${(hoveredCellInfo.tension * 100).toFixed(0)}%)`, 75, popupY + 55);
        text(`• 1초 간 타자 속도 지표: ${(hoveredCellInfo.speed * 100).toFixed(0)}%`, 75, popupY + 77);
      }
    }
    pop();
  }
};

window.page_S7_S8 = page_S7_S8;