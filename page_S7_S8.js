/**
 * [S7-S8 단계] 팀원 그래픽引擎 이식형 아카이브 뷰어 모듈
 */
const page_S7_S8 = {
  archivedPieces: [],
  selectedPiece: null,
  showText: true,
  showEmotionInfo: true,
  scrollY: 0,
  showKnitView: true,
  s7ScrollX: 0,

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

  // [S7] 가로 스크롤 갤러리 — 각 띠를 120px 너비 수직 스트립으로 렌더링
  drawS7Timeline: function() {
    push();
    colorMode(RGB);

    const BAND_W = 120;
    const TOP_Y  = 70;
    const BOT_Y  = height - 30;
    const MAX_H  = BOT_Y - TOP_Y;

    // ── 헤더 바 ──────────────────────────────────────────
    fill(250); stroke(215); strokeWeight(0.5);
    rectMode(CORNER); rect(0, 0, width, TOP_Y);

    fill(30); noStroke(); textSize(15); textStyle(BOLD); textAlign(LEFT, CENTER);
    text("Type to Knit · Archive", 40, TOP_Y / 2 - 7);
    fill(160); textSize(11); textStyle(NORMAL);
    text("클릭 → 상세보기   ·   마우스 휠 → 가로 스크롤   ·   '4' → 새 뜨기", 40, TOP_Y / 2 + 11);

    // 뜨개 ↔ 텍스트 토글 버튼
    let tW = 120, tH = 28, tX = width - tW - 20, tY = (TOP_Y - tH) / 2;
    fill(this.showKnitView ? color(50, 80, 190) : color(65, 65, 65));
    noStroke(); rectMode(CORNER); rect(tX, tY, tW, tH, 6);
    fill(255); textSize(12); textStyle(NORMAL); textAlign(CENTER, CENTER);
    text(this.showKnitView ? "🧶 뜨개 보기" : "📝 텍스트 보기", tX + tW / 2, tY + tH / 2);

    // ── 빈 상태 ──────────────────────────────────────────
    if (this.archivedPieces.length === 0) {
      fill(160); noStroke(); textAlign(CENTER, CENTER); textSize(15); textStyle(NORMAL);
      text("아직 아무도 뜨지 않았어요. 첫 번째 띠를 떠 보세요 🧶", width / 2, height / 2 - 26);
      fill(55, 80, 200); rectMode(CENTER); rect(width / 2, height / 2 + 18, 160, 38, 8);
      fill(255); textSize(14); textStyle(BOLD); textAlign(CENTER, CENTER);
      text("+ 타이핑 시작", width / 2, height / 2 + 18);
      pop();
      return;
    }

    // ── 스크롤 클램프 ─────────────────────────────────────
    let nBands  = this.archivedPieces.length;
    let totalW  = nBands * BAND_W;
    let maxScroll = max(0, totalW - width);
    this.s7ScrollX = constrain(this.s7ScrollX, 0, maxScroll);

    // ── 호버 감지 ─────────────────────────────────────────
    let hoveredIdx = -1;
    if (mouseY >= TOP_Y && mouseY <= BOT_Y) {
      let raw = Math.floor((mouseX + this.s7ScrollX) / BAND_W);
      if (raw >= 0 && raw < nBands) hoveredIdx = raw;
    }
    cursor(hoveredIdx >= 0 ? HAND : ARROW);

    // ── 클리핑 적용 후 띠 렌더 ───────────────────────────
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(0, TOP_Y, width, MAX_H);
    drawingContext.clip();

    for (let i = 0; i < nBands; i++) {
      let bx = i * BAND_W - this.s7ScrollX;
      if (bx + BAND_W < 0 || bx > width) continue;

      let piece    = this.archivedPieces[i];
      let gridData = piece.knitArray || piece.cells || [];
      let totalRows = max(1, Math.ceil(gridData.length / 10));
      let rowH = constrain(MAX_H / totalRows, 2, 18);

      // 호버 Y 오프셋
      let yOff = 0;
      if (hoveredIdx === i) yOff = -8;
      else if (hoveredIdx !== -1 && abs(hoveredIdx - i) === 1) yOff = 2;
      let by = TOP_Y + yOff;

      if (this.showKnitView) {
        // ── 뜨개 뷰 ──────────────────────────────────────
        push();
        colorMode(HSB, 360, 100, 100);
        if (piece.privacy === "private") {
          fill(0, 0, 20); noStroke();
          rectMode(CORNER); rect(bx, by, BAND_W, MAX_H);
        } else {
          colorMode(RGB); fill(245); noStroke();
          rectMode(CORNER); rect(bx, by, BAND_W, MAX_H);
          colorMode(HSB, 360, 100, 100);
          let cW = BAND_W / 10;
          for (let j = 0; j < gridData.length; j++) {
            let col  = j % 10;
            let row  = Math.floor(j / 10);
            let cell = gridData[j];
            let cx = bx + col * cW;
            let cy = by + row * rowH;
            if (cy > BOT_Y + 10) break;
            if (cell.isBackspace) {
              fill(0, 0, 22); noStroke();
            } else {
              let h = map(cell.tension || 0.5, 0, 1, 0, 360);
              let s = map(cell.speed   || 0,   0, 1, 20, 60);
              let b = map(cell.speed   || 0,   0, 1, 65, 90);
              fill(h, s, b); noStroke();
            }
            rectMode(CORNER); rect(cx, cy, cW, rowH);
          }
        }
        pop();
      } else {
        // ── 텍스트 뷰 ────────────────────────────────────
        colorMode(RGB);
        if (piece.privacy === "private") {
          fill(20); noStroke();
          rectMode(CORNER); rect(bx, by, BAND_W, MAX_H);
        } else {
          fill(245); stroke(215); strokeWeight(0.5);
          rectMode(CORNER); rect(bx, by, BAND_W, MAX_H);
          let chars = gridData.map(function(c) { return c.text || ''; }).join('').replace(/ /g, '');
          fill(40); noStroke(); textSize(14); textStyle(NORMAL); textAlign(CENTER, TOP);
          let chH = 19;
          for (let k = 0; k < chars.length; k++) {
            let ty = by + 4 + k * chH;
            if (ty + chH > BOT_Y) break;
            text(chars[k], bx + BAND_W / 2, ty);
          }
        }
      }

      // 호버 테두리
      if (hoveredIdx === i) {
        colorMode(RGB);
        noFill(); stroke(255, 255, 255, 160); strokeWeight(2.5);
        rectMode(CORNER); rect(bx + 1, by, BAND_W - 2, MAX_H - 1);
      }
    }

    drawingContext.restore();

    // ── 호버 툴팁 ─────────────────────────────────────────
    if (hoveredIdx >= 0) {
      let piece = this.archivedPieces[hoveredIdx];
      let bx = hoveredIdx * BAND_W - this.s7ScrollX;

      let eyeLabel = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화' };
      let eGroups = {};
      (piece.cells || []).forEach(function(c) {
        let t = c.emotionTag;
        if (!t || t === 'NEUTRAL') return;
        if (!eGroups[t]) eGroups[t] = { sum: 0, n: 0 };
        eGroups[t].sum += (c.emotionIntensity || 0);
        eGroups[t].n++;
      });
      let eList = Object.entries(eGroups)
        .map(function(e) { return { label: eyeLabel[e[0]] || e[0], avg: e[1].n ? e[1].sum / e[1].n : 0 }; })
        .sort(function(a, b) { return b.avg - a.avg; })
        .slice(0, 3);

      let ttW = 170, ttH = 54 + max(1, eList.length) * 17;
      let ttX = constrain(bx + BAND_W / 2 - ttW / 2, 8, width - ttW - 8);
      let ttY = TOP_Y + 10;

      fill(255, 255, 255, 242); stroke(200); strokeWeight(1);
      rectMode(CORNER); rect(ttX, ttY, ttW, ttH, 7);

      let displayName = piece.privacy === "private" ? "익명의 니터" : (piece.nickname || "anonymous");
      let dObj = new Date(piece.date);
      let dateStr = dObj.getFullYear() + "." +
                    String(dObj.getMonth() + 1).padStart(2, '0') + "." +
                    String(dObj.getDate()).padStart(2, '0');

      fill(30); noStroke(); textSize(13); textStyle(BOLD); textAlign(LEFT, TOP);
      text(displayName, ttX + 10, ttY + 10);
      fill(140); textSize(11); textStyle(NORMAL);
      text(dateStr, ttX + 10, ttY + 28);

      if (eList.length === 0) {
        fill(185); textSize(10); text("감정 태그 없음", ttX + 10, ttY + 47);
      } else {
        eList.forEach(function(e, k) {
          fill(80); textSize(10); textAlign(LEFT, TOP);
          text("· " + e.label, ttX + 10, ttY + 47 + k * 17);
          fill(140); textAlign(RIGHT, TOP);
          text(e.avg.toFixed(2), ttX + ttW - 10, ttY + 47 + k * 17);
        });
      }
    }

    // ── 스크롤바 ──────────────────────────────────────────
    if (totalW > width) {
      let bW = width * 0.5, bX = (width - bW) / 2, bY = height - 14;
      stroke(215); strokeWeight(1); noFill();
      rectMode(CORNER); rect(bX, bY, bW, 5, 2);
      let tW2 = max(24, bW * (width / totalW));
      let tX2 = bX + (this.s7ScrollX / maxScroll) * (bW - tW2);
      fill(175); noStroke(); rect(tX2, bY, tW2, 5, 2);
    }

    pop();
  },

  // [S7] 클릭 처리 — 토글 버튼 / 빈 상태 CTA / 띠 클릭
  checkS7Click: function() {
    const BAND_W = 120;
    const TOP_Y  = 70;
    const BOT_Y  = height - 30;

    // 뜨개 ↔ 텍스트 토글 버튼
    let tW = 120, tH = 28, tX = width - tW - 20, tY = (TOP_Y - tH) / 2;
    if (mouseX >= tX && mouseX <= tX + tW && mouseY >= tY && mouseY <= tY + tH) {
      this.showKnitView = !this.showKnitView;
      return false;
    }

    // 빈 상태 CTA
    if (this.archivedPieces.length === 0) {
      if (mouseX >= width / 2 - 80 && mouseX <= width / 2 + 80 &&
          mouseY >= height / 2 && mouseY <= height / 2 + 38) {
        window.currentScreen = "S4";
      }
      return false;
    }

    // 띠 클릭 → S8
    if (mouseY >= TOP_Y && mouseY <= BOT_Y) {
      let idx = Math.floor((mouseX + this.s7ScrollX) / BAND_W);
      if (idx >= 0 && idx < this.archivedPieces.length) {
        this.selectedPiece = this.archivedPieces[idx];
        this.scrollY = 0;
        window.currentScreen = "S8";
        cursor(ARROW);
        return true;
      }
    }
    return false;
  },

  // [S7] 가로 스크롤 처리 — 메인 스케치의 mouseWheel에서 호출
  handleS7Scroll: function(delta) {
    let maxScroll = max(0, this.archivedPieces.length * 120 - width);
    this.s7ScrollX = constrain(this.s7ScrollX + delta * 0.8, 0, maxScroll);
  },

  // [S8] 마우스 휠 스크롤 처리 — 메인 스케치의 mouseWheel에서 호출
  handleS8Scroll: function(delta) {
    if (!this.selectedPiece) return;
    let gridData = this.selectedPiece.knitArray || this.selectedPiece.cells || [];
    let totalRows = Math.ceil(gridData.length / 10);
    let totalContentH = totalRows * 44;

    this.scrollY -= delta * 0.8;
    this.scrollY = min(this.scrollY, 0);
    this.scrollY = max(this.scrollY, -(max(0, 150 + totalContentH - height + 80)));
  },

  // [S8] 체크박스 토글 클릭 처리 — 메인 스케치의 mousePressed에서 호출
  handleS8CheckboxClick: function(mx, my) {
    let cellSize = 38, spacing = 44;
    let panelX = 50 + cellSize / 2 + 10 * spacing + 20;
    let panelW = width - panelX - 15;

    // [×] 닫기 버튼
    let xBtnX = panelX + panelW - 25, xBtnY = 118;
    if (mx >= xBtnX - 11 && mx <= xBtnX + 11 && my >= xBtnY - 11 && my <= xBtnY + 11) {
      window.currentScreen = "S7";
      return true;
    }

    let cbX = panelX + 20, cbY = 207, cbSize = 15;
    if (mx >= cbX && mx <= cbX + cbSize + 80 && my >= cbY && my <= cbY + cbSize) {
      this.showText = !this.showText;
      return true;
    }
    let cbY2 = cbY + 28;
    if (mx >= cbX && mx <= cbX + cbSize + 100 && my >= cbY2 && my <= cbY2 + cbSize) {
      this.showEmotionInfo = !this.showEmotionInfo;
      return true;
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

    let cellSize = 38;
    let spacing = 44;
    let gridData = piece.knitArray || piece.cells || [];

    // 그리드: 왼쪽 정렬 / 오른쪽 패널 좌표 계산
    let startX = 50 + cellSize / 2;
    let startY = 150 + this.scrollY;
    let panelX = startX + 10 * spacing + 20;
    let panelW = width - panelX - 15;

    // 상단 네비게이션 가이드
    fill(30); noStroke(); textSize(22); textStyle(BOLD); textAlign(LEFT, TOP);
    let titleName = piece.privacy === "private" ? "익명의 니터" : `${piece.nickname}님`;
    text(`🔲 단독 상세 뷰: ${titleName}의 작품`, 50, 40);
    textSize(13); fill(120); textStyle(NORMAL);
    text("마우스를 니트 코 위에 올리면 그 순간의 텍스트와 감정이 복원됩니다. | 목록으로 복귀: '7'", 50, 75);

    // 오른쪽 패널 배경
    fill(248); stroke(210); strokeWeight(1);
    rectMode(CORNER); rect(panelX, 100, panelW, height - 120, 8);

    let px = panelX + 20;
    let cbSize = 15;

    // [×] 닫기 버튼 (S7 복귀)
    let xBtnX = panelX + panelW - 25, xBtnY = 118;
    fill(225); noStroke(); rectMode(CENTER); rect(xBtnX, xBtnY, 22, 22, 4);
    fill(100); textSize(12); textStyle(BOLD); textAlign(CENTER, CENTER);
    text("×", xBtnX, xBtnY + 1);

    // ─ 메타데이터 ─
    textAlign(LEFT, CENTER); noStroke();
    let displayName = piece.privacy === "private" ? "익명의 니터" : (piece.nickname || "anonymous");
    fill(30); textSize(16); textStyle(BOLD);
    text(displayName, px, 133);

    let dateObj = new Date(piece.date);
    let dateStr = `${dateObj.getFullYear()}.${String(dateObj.getMonth()+1).padStart(2,'0')}.${String(dateObj.getDate()).padStart(2,'0')}`;
    fill(140); textSize(12); textStyle(NORMAL);
    text(dateStr, px, 155);

    fill(piece.privacy === "private" ? color(180, 80, 80) : color(60, 140, 100));
    text(piece.privacy === "private" ? "비공개" : "전체공개", px, 175);

    // 구분선
    stroke(215); strokeWeight(1);
    line(panelX + 10, 192, panelX + panelW - 10, 192);

    // ─ 토글 체크박스 ─
    let cbX = px, cbY = 207;

    noStroke();
    fill(this.showText ? color(90, 185, 100) : color(220));
    rectMode(CORNER); rect(cbX, cbY, cbSize, cbSize, 3);
    if (this.showText) {
      stroke(255); strokeWeight(2); noFill();
      line(cbX + 3, cbY + 8, cbX + 6, cbY + 11);
      line(cbX + 6, cbY + 11, cbX + 12, cbY + 4);
    }
    fill(50); noStroke(); textSize(13); textStyle(NORMAL); textAlign(LEFT, CENTER);
    text("텍스트 보기", cbX + cbSize + 8, cbY + cbSize / 2);

    let cbY2 = cbY + 28;
    noStroke();
    fill(this.showEmotionInfo ? color(90, 185, 100) : color(220));
    rectMode(CORNER); rect(cbX, cbY2, cbSize, cbSize, 3);
    if (this.showEmotionInfo) {
      stroke(255); strokeWeight(2); noFill();
      line(cbX + 3, cbY2 + 8, cbX + 6, cbY2 + 11);
      line(cbX + 6, cbY2 + 11, cbX + 12, cbY2 + 4);
    }
    fill(50); noStroke(); textSize(13); textStyle(NORMAL); textAlign(LEFT, CENTER);
    text("감정 정보 보기", cbX + cbSize + 8, cbY2 + cbSize / 2);

    // 구분선
    stroke(215); strokeWeight(1);
    line(panelX + 10, cbY2 + 24, panelX + panelW - 10, cbY2 + 24);

    // ─ 감정 태그 섹션 ─
    fill(80); noStroke(); textSize(13); textStyle(BOLD); textAlign(LEFT, TOP);
    text("감정 태그", px, cbY2 + 32);

    let eyeLabel = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화' };
    let eGroups = {};
    (piece.cells || []).forEach(function(c) {
      let t = c.emotionTag;
      if (!t || t === 'NEUTRAL') return;
      if (!eGroups[t]) eGroups[t] = { sum: 0, n: 0 };
      eGroups[t].sum += (c.emotionIntensity || 0);
      eGroups[t].n++;
    });
    let eList = Object.entries(eGroups)
      .map(function(entry) { return { label: eyeLabel[entry[0]] || entry[0], avg: entry[1].n > 0 ? entry[1].sum / entry[1].n : 0 }; })
      .sort(function(a, b) { return b.avg - a.avg; })
      .slice(0, 3);

    textStyle(NORMAL); textSize(12);
    if (eList.length === 0) {
      fill(170); textAlign(LEFT, TOP);
      text("기록된 감정 태그 없음", px, cbY2 + 55);
    } else {
      eList.forEach(function(e, i) {
        fill(80); textAlign(LEFT, CENTER);
        text("· " + e.label, px, cbY2 + 57 + i * 22);
        fill(130); textAlign(RIGHT, CENTER);
        text(e.avg.toFixed(2), panelX + panelW - 15, cbY2 + 57 + i * 22);
      });
    }

    let hoveredCellInfo = null;
    let emotionCells = [];

    // 🌟 격리된 HSB 컬러 매핑 존 시작
    push(); 
    colorMode(HSB, 360, 100, 100);

    gridData.forEach((cell, idx) => {
      let col = idx % 10;
      let row = Math.floor(idx / 10);
      
      let posX = startX + col * spacing;
      let posY = startY + row * spacing;

      if (posY < 100 || posY > height + spacing) return; // 화면 밖 셀 스킵

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
        // 🌐 글자 출력 매핑 (고채도 배경 대응: 흰색 외곽선 + 어두운 채움으로 가독성 확보)
        else if (this.showText && cell.text && cell.text.trim().length > 0) {
          let textChar = cell.text.trim()[0];
          textSize(18); textStyle(BOLD); textAlign(CENTER, CENTER);
          noStroke();
          drawingContext.shadowBlur = 6;
          drawingContext.shadowColor = 'rgba(255, 255, 255, 0.85)';
          fill(0, 0, 10);
          text(textChar, posX, posY + 1);
          drawingContext.shadowBlur = 0;
        }

        // 감정 정보 수집 (토글 ON 시 RGB 구간에서 화살표 어노테이션 렌더)
        if (this.showEmotionInfo) {
          let eIntensity = cell.emotionIntensity !== undefined ? cell.emotionIntensity : (cell.tension || 0);
          let eyeMap = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화' };
          let eTag = cell.emotionTag || eyeMap[cell.eye] || '';
          if (eIntensity >= 0.5 && eTag) {
            emotionCells.push({ posX, posY, eTag, eIntensity, col });
          }
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

    // [감정 정보 태그] 화살표 어노테이션 (RGB)
    if (this.showEmotionInfo && emotionCells.length > 0) {
      textSize(10); textStyle(NORMAL);
      emotionCells.forEach(({ posX, posY, eTag, eIntensity, col }) => {
        let isLeft = col < 5;
        let labelText = `${eTag} ${(eIntensity * 100).toFixed(0)}%`;
        let tW = textWidth(labelText) + 14;
        let tH = 18;
        let lineLen = 45;
        let lx = isLeft ? posX - cellSize / 2 - lineLen - tW : posX + cellSize / 2 + lineLen;

        // 연결선
        stroke(120); strokeWeight(1.2); noFill();
        if (isLeft) {
          line(posX - cellSize / 2, posY, lx + tW, posY);
        } else {
          line(posX + cellSize / 2, posY, lx, posY);
        }

        // 화살표 촉 (셀 방향)
        fill(120); noStroke();
        if (isLeft) {
          triangle(posX - cellSize / 2,     posY,
                   posX - cellSize / 2 - 8, posY - 4,
                   posX - cellSize / 2 - 8, posY + 4);
        } else {
          triangle(posX + cellSize / 2,     posY,
                   posX + cellSize / 2 + 8, posY - 4,
                   posX + cellSize / 2 + 8, posY + 4);
        }

        // 태그 박스
        fill(255, 248, 215); stroke(195, 170, 75); strokeWeight(1);
        rectMode(CORNER); rect(lx, posY - tH / 2, tW, tH, 4);

        // 태그 텍스트
        fill(60); noStroke(); textAlign(LEFT, CENTER);
        text(labelText, lx + 7, posY);
      });
    }

    // [3] 패널 내부 호버 정보 섹션
    let hsY = 380;
    stroke(215); strokeWeight(1);
    line(panelX + 10, hsY - 12, panelX + panelW - 10, hsY - 12);

    fill(80); noStroke(); textSize(12); textStyle(BOLD); textAlign(LEFT, TOP);
    text("선택된 코 정보", panelX + 20, hsY);

    if (hoveredCellInfo) {
      if (piece.privacy === "private") {
        fill(80); textSize(12); textStyle(BOLD); textAlign(LEFT, TOP);
        text("🔒 비공개 보호 스티치", panelX + 20, hsY + 22);
        fill(130); textSize(11); textStyle(NORMAL);
        text(`태그: ${hoveredCellInfo.eye}`, panelX + 20, hsY + 42);
        text(`텐션: ${(hoveredCellInfo.tension * 100).toFixed(0)}%  |  속도: ${(hoveredCellInfo.speed * 100).toFixed(0)}%`, panelX + 20, hsY + 60);
      } else {
        fill(30); textSize(14); textStyle(BOLD); textAlign(LEFT, TOP);
        text(`"${hoveredCellInfo.text || "공백/엔터"}"`, panelX + 20, hsY + 20);
        fill(110); textSize(11); textStyle(NORMAL);
        text(`페이스 태그: ${hoveredCellInfo.eye}  (긴장: ${(hoveredCellInfo.tension * 100).toFixed(0)}%)`, panelX + 20, hsY + 44);
        text(`타자 속도: ${(hoveredCellInfo.speed * 100).toFixed(0)}%`, panelX + 20, hsY + 62);
      }
    } else {
      fill(190); noStroke(); textSize(11); textStyle(NORMAL); textAlign(LEFT, TOP);
      text("니트 코 위에 마우스를 올리면\n정보가 표시됩니다.", panelX + 20, hsY + 22);
    }
    pop();
  }

  
};

window.page_S7_S8 = page_S7_S8;