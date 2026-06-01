// KnitCell.calculateStyles()와 동일한 색상 로직 (S7/S8 공용)
// knitArray: cell.eye = 한글 감정 태그, cell.tension = emotionIntensity (0~1)
function _knitCellColors(cell) {
  const eye = cell.eye || '';
  let baseHue = 154; // 기본: 청록 (표정 변화 등 예외)
  if      (eye === '찌푸림') baseHue = 0;
  else if (eye === '중립')   baseHue = 51;
  else if (eye === '풀림')   baseHue = 103;
  else if (eye === '놀람')   baseHue = 309;
  else if (eye === '무거움') baseHue = 206;
  else if (eye === '긴장')   baseHue = 257;

  const tension = cell.tension || 0;
  const speed   = cell.speed   || 0;
  const noFace  = (eye === '얼굴 없음' || eye === '기준값 없음');

  const h = (baseHue + map(tension, 0, 1, -15, 15) + 360) % 360;
  const s = noFace ? 15 : map(speed, 0, 1, 10, 50);
  let   b = map(speed, 0, 1, 55, 80);
  if (eye === '중립' || eye === '풀림') b = min(b + 10, 100);
  if (noFace) b = 95;

  let stitchShift = 30;
  if      (eye === '찌푸림') stitchShift = 45;
  else if (eye === '놀람')   stitchShift = 110;
  else if (eye === '표정 변화' || eye === 'BLURRY') stitchShift = 180;

  return { h, s, b, stitchH: (h + stitchShift + 360) % 360, stitchBri: min(b + 10, 100) };
}

/**
 * [S7-S8 단계] 팀원 그래픽引擎 이식형 아카이브 뷰어 모듈
 */
const page_S7_S8 = {
  archivedPieces: [],
  selectedPiece: null,
  showText: true,
  showEmotionInfo: true,
  scrollY: 0,
  s7ScrollX: 0,

  // Dexie 데이터 로드
  loadDataFromDB: function() {
    if (!window.page_S5 || !window.page_S5.db) return Promise.resolve([]);
    return window.page_S5.db.knitTable.toArray()
      .then(data => {
        // 최신 데이터가 위로 오도록 역순(내림차순) 정렬하는 것이 타임라인에 유리합니다!
        data.sort((a, b) => new Date(b.date) - new Date(a.date)); 

        // Normalize legacy Korean emotion tag names saved in older archives
        const tagMap = {
          '찌푸림': '짜증',
          '무거움': '슬픔',
          '풀림': '해탈',
          '표정 변화': '미묘함'
        };

        data.forEach(piece => {
          let arr = piece.knitArray || piece.cells || [];
          arr.forEach(cell => {
            if (cell && cell.emotionTag && tagMap[cell.emotionTag]) {
              cell.emotionTag = tagMap[cell.emotionTag];
            }
            // also normalize any text labels that might appear in fields
            if (cell && cell.eye && typeof cell.eye === 'string') {
              // nothing to map for English eye constants (FROWN, SURPRISED, BLURRY)
            }
          });
        });

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

    const BAND_W  = 162;
    const TOP_Y   = 70;
    const BOT_Y   = height - 30;
    const MAX_H   = BOT_Y - TOP_Y;

    // S7_SP를 BAND_W에서 분리 → 내/외부 간격을 독립적으로 제어
    const S7_SP   = 16;    // 셀 중심 간격 고정
    const S7_CELL = 14.4;  // 셀 크기: gap 1.6px (기존 2px × 0.8)
    // inter-band gap = BAND_W - 9×S7_SP - S7_CELL = 162 - 144 - 14.4 ≈ 3.6px (기존 2px × ~1.8)
    const S7_PADX = 0;
    const S7_PADY = 0;

    // ── 헤더 바 ──────────────────────────────────────────
    fill(250); stroke(215); strokeWeight(0.5);
    rectMode(CORNER); rect(0, 0, width, TOP_Y);

    fill(30); noStroke(); textSize(15); textStyle(BOLD); textAlign(LEFT, CENTER);
    text("Type to Knit · Archive", 40, TOP_Y / 2 - 7);
    fill(160); textSize(11); textStyle(NORMAL);
    text("클릭 → 상세보기   ·   ◀ ▶ 버튼 → 가로 이동   ·   '4' → 새 뜨기", 40, TOP_Y / 2 + 11);

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

    // ── 좌우 이동 버튼 고정 좌표 ──────────────────────────
    const BTN_X_L = 30, BTN_X_R = width - 30;
    const BTN_Y_C = (TOP_Y + BOT_Y) / 2, BTN_R = 24;

    // ── 호버 감지 ─────────────────────────────────────────
    let overLeftBtn  = dist(mouseX, mouseY, BTN_X_L, BTN_Y_C) < BTN_R;
    let overRightBtn = dist(mouseX, mouseY, BTN_X_R, BTN_Y_C) < BTN_R;
    let hoveredIdx = -1;
    if (!overLeftBtn && !overRightBtn && mouseY >= TOP_Y && mouseY <= BOT_Y) {
      let raw = Math.floor((mouseX + this.s7ScrollX) / BAND_W);
      if (raw >= 0 && raw < nBands) hoveredIdx = raw;
    }
    cursor((hoveredIdx >= 0 || overLeftBtn || overRightBtn) ? HAND : ARROW);

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

      // 호버 Y 오프셋
      let yOff = 0;
      if (hoveredIdx === i) yOff = -8;
      else if (hoveredIdx !== -1 && abs(hoveredIdx - i) === 1) yOff = 2;
      let by = TOP_Y + yOff;

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
        for (let j = 0; j < gridData.length; j++) {
          let col  = j % 10;
          let row  = Math.floor(j / 10);
          let cell = gridData[j];
          let cx = bx + S7_PADX + col * S7_SP + S7_CELL * 0.5;
          let cy = by + S7_PADY + row * S7_SP + S7_CELL * 0.5;
          if (cy - S7_CELL * 0.5 > BOT_Y + 10) break;

          const cellW  = S7_CELL - 1;
          const cellH  = S7_CELL - 1;
          const minDim = S7_CELL;

          let { h, s, b, stitchH, stitchBri } = (cell.bgHue !== undefined)
            ? { h: cell.bgHue, s: cell.sat, b: cell.bgBri, stitchH: cell.stitchHue, stitchBri: cell.stitchBri }
            : _knitCellColors(cell);

          if (cell.isBackspace) {
            // S8과 동일: 색상 있는 선 2개로 해탈(풀림) 표현
            let lineR = minDim * 0.4;
            stroke(h, s, b); strokeWeight(max(0.5, minDim * 0.15)); noFill();
            line(cx - lineR, cy - lineR, cx + lineR * 0.4, cy);
            line(cx - lineR, cy + lineR, cx + lineR * 0.2, cy);
          } else {
            let isFilled = (cell.speed || 0) >= 0.6;
            let isSquare = (cell.tension || 0.5) >= 0.5;
            let sw = max(0.4, minDim * 0.12);

            if (isFilled) {
              fill(h, s, b); noStroke();
            } else {
              noFill(); stroke(h, s, b); strokeWeight(sw);
            }

            if (isSquare) {
              rectMode(CENTER); rect(cx, cy, cellW, cellH, max(0.5, minDim * 0.08));
            } else {
              ellipse(cx, cy, cellW, cellH);
            }

            // 내부 감정 패턴 — S8과 동일한 로직, 셀이 충분히 클 때만 표시
            if (minDim >= 6) {
              let r = minDim * 0.25;
              stroke(stitchH, s, stitchBri); strokeWeight(max(0.4, minDim * 0.08)); noFill();

              if (cell.eye === 'FROWN' || cell.eye === '찌푸림') {
                line(cx - r, cy - r, cx + r, cy + r);
                line(cx + r, cy - r, cx - r, cy + r);
              } else if (cell.eye === 'SURPRISED' || cell.eye === '놀람') {
                // S8과 동일: 8꼭짓점 별
                beginShape();
                for (let k = 0; k < 8; k++) {
                  let radius = k % 2 === 0 ? r : r * 0.4;
                  let angle  = PI / 4 * k;
                  vertex(cx + cos(angle) * radius, cy + sin(angle) * radius);
                }
                endShape(CLOSE);
              } else {
                // S8과 동일: 아래 방향 삼각형, 열린 shape
                beginShape();
                vertex(cx - r, cy - r * 0.6);
                vertex(cx, cy + r * 0.8);
                vertex(cx + r, cy - r * 0.6);
                endShape();
              }
            }
          }
        }
      }
      pop();

      // 호버 테두리
      if (hoveredIdx === i) {
        colorMode(RGB);
        noFill(); stroke(255, 255, 255, 160); strokeWeight(2.5);
        rectMode(CORNER); rect(bx + 1, by, BAND_W - 2, MAX_H - 1);
      }
    }

    drawingContext.restore();

    // ── 좌우 이동 버튼 ───────────────────────────────────
    colorMode(RGB);
    let canGoLeft  = this.s7ScrollX > 0;
    let canGoRight = this.s7ScrollX < maxScroll;

    let leftAlpha = canGoLeft ? (overLeftBtn ? 245 : 210) : 55;
    fill(255, 255, 255, leftAlpha); stroke(190, 190, 190, canGoLeft ? 210 : 55); strokeWeight(1);
    rectMode(CENTER); rect(BTN_X_L, BTN_Y_C, BTN_R * 2, BTN_R * 2, BTN_R);
    fill(60, 60, 60, canGoLeft ? 210 : 55); noStroke(); textSize(26); textStyle(BOLD); textAlign(CENTER, CENTER);
    text('‹', BTN_X_L, BTN_Y_C + 1);

    let rightAlpha = canGoRight ? (overRightBtn ? 245 : 210) : 55;
    fill(255, 255, 255, rightAlpha); stroke(190, 190, 190, canGoRight ? 210 : 55); strokeWeight(1);
    rectMode(CENTER); rect(BTN_X_R, BTN_Y_C, BTN_R * 2, BTN_R * 2, BTN_R);
    fill(60, 60, 60, canGoRight ? 210 : 55); noStroke(); textSize(26); textStyle(BOLD); textAlign(CENTER, CENTER);
    text('›', BTN_X_R, BTN_Y_C + 1);

    // ── 호버 툴팁 ─────────────────────────────────────────
    if (hoveredIdx >= 0) {
      let piece = this.archivedPieces[hoveredIdx];
      let bx = hoveredIdx * BAND_W - this.s7ScrollX;

      let eyeLabel = { FROWN: '짜증', SURPRISED: '놀람', BLURRY: '미묘함' };
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
    const BAND_W = 162;
    const TOP_Y  = 70;
    const BOT_Y  = height - 30;

    // ── 좌우 이동 버튼 ───────────────────────────────────
    const BTN_X_L = 30, BTN_X_R = width - 30;
    const BTN_Y_C = (TOP_Y + BOT_Y) / 2, BTN_R_HIT = 24;
    const SCROLL_STEP = BAND_W * 4;
    let maxScrollC = max(0, this.archivedPieces.length * BAND_W - width);

    if (dist(mouseX, mouseY, BTN_X_L, BTN_Y_C) < BTN_R_HIT) {
      this.s7ScrollX = constrain(this.s7ScrollX - SCROLL_STEP, 0, maxScrollC);
      return false;
    }
    if (dist(mouseX, mouseY, BTN_X_R, BTN_Y_C) < BTN_R_HIT) {
      this.s7ScrollX = constrain(this.s7ScrollX + SCROLL_STEP, 0, maxScrollC);
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
    let maxScroll = max(0, this.archivedPieces.length * 162 - width);
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
      // anonymous 작품은 텍스트 보기 비활성
      if (!this.selectedPiece || this.selectedPiece.privacy !== "anonymous") {
        this.showText = !this.showText;
      }
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

    let _isAnonymous = piece.privacy === "anonymous";
    noStroke();
    fill(_isAnonymous ? color(210) : (this.showText ? color(90, 185, 100) : color(220)));
    rectMode(CORNER); rect(cbX, cbY, cbSize, cbSize, 3);
    if (this.showText && !_isAnonymous) {
      stroke(255); strokeWeight(2); noFill();
      line(cbX + 3, cbY + 8, cbX + 6, cbY + 11);
      line(cbX + 6, cbY + 11, cbX + 12, cbY + 4);
    }
    fill(_isAnonymous ? color(180) : color(50)); noStroke(); textSize(13); textStyle(NORMAL); textAlign(LEFT, CENTER);
    text(_isAnonymous ? "텍스트 보기 (익명 보호)" : "텍스트 보기", cbX + cbSize + 8, cbY + cbSize / 2);

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

    let eyeLabel = { FROWN: '짜증', SURPRISED: '놀람', BLURRY: '미묘함' };
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
    let seenEmotionTags = new Set();

    // 🌟 격리된 HSB 컬러 매핑 존 시작
    push(); 
    colorMode(HSB, 360, 100, 100);

    gridData.forEach((cell, idx) => {
      let col = idx % 10;
      let row = Math.floor(idx / 10);
      
      let posX = startX + col * spacing;
      let posY = startY + row * spacing;

      if (posY < 100 || posY > height + spacing) return; // 화면 밖 셀 스킵

      let { h: bgHue, s: sat, b: baseBri, stitchH: stitchHue, stitchBri } = (cell.bgHue !== undefined)
        ? { h: cell.bgHue, s: cell.sat, b: cell.bgBri, stitchH: cell.stitchHue, stitchBri: cell.stitchBri }
        : _knitCellColors(cell);
      let bgBri = baseBri;

      // [1] 백스페이스 올 해탈(풀림) 복원
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

        if (cell.eye === 'FROWN' || cell.eye === '찌푸림') {
          line(posX - r, posY - r, posX + r, posY + r);
          line(posX + r, posY - r, posX - r, posY + r);
        } else if (cell.eye === 'SURPRISED' || cell.eye === '놀람') {
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
        else if (this.showText && piece.privacy !== "anonymous" && cell.text && cell.text.trim().length > 0) {
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
          // 표시용 한국어 태그: emotionTagKo(원본) > 영문→한국어 변환 > 그대로
          const _eyeToKoMap = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화', NEUTRAL: '중립' };
          let eTag = cell.emotionTagKo || _eyeToKoMap[cell.emotionTag] || _eyeToKoMap[cell.eye] || cell.emotionTag || cell.eye || '';
          if (eIntensity >= 0.5 && eTag && !seenEmotionTags.has(eTag)) {
            emotionCells.push({ posX, posY, eTag, eIntensity, col });
            seenEmotionTags.add(eTag);
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
      const _labelToKo = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화', NEUTRAL: '중립' };
      emotionCells.forEach(({ posX, posY, eTag, eIntensity, col }) => {
        let displayTag = _labelToKo[eTag] || eTag;
        let labelText = `${displayTag} ${(eIntensity * 100).toFixed(0)}%`;
        let tW = textWidth(labelText) + 14;
        let tH = 18;
        let lineLen = 45;
        // rise = 행 간격의 절반 → 라벨이 현재 행과 위 행 사이에 위치, 위 셀 안 가림
        let rise    = spacing * 0.5;
        let lxLeft  = posX - cellSize / 2 - lineLen - tW;
        let lxRight = posX + cellSize / 2 + lineLen;
        let isLeft  = col < 5 && lxLeft >= 8;
        let lx = isLeft ? lxLeft : lxRight;
        // 라인 끝점 & 라벨 y: 셀 중심에서 rise만큼 위
        let ly = posY - rise;

        // 연결선 (셀 → 우상향 대각선)
        stroke(120); strokeWeight(1.2); noFill();
        if (isLeft) {
          line(posX - cellSize / 2, posY, lx + tW, ly);
        } else {
          line(posX + cellSize / 2, posY, lx, ly);
        }

        // 화살표 촉 (셀 방향, 대각선에 맞게 약간 상향)
        fill(120); noStroke();
        if (isLeft) {
          triangle(posX - cellSize / 2,     posY,
                   posX - cellSize / 2 - 9, posY - 3,
                   posX - cellSize / 2 - 5, posY + 4);
        } else {
          triangle(posX + cellSize / 2,     posY,
                   posX + cellSize / 2 + 9, posY - 3,
                   posX + cellSize / 2 + 5, posY + 4);
        }

        // 태그 박스 (라인 끝점 기준)
        fill(255, 248, 215); stroke(195, 170, 75); strokeWeight(1);
        rectMode(CORNER); rect(lx, ly - tH / 2, tW, tH, 4);

        // 태그 텍스트
        fill(60); noStroke(); textAlign(LEFT, CENTER);
        text(labelText, lx + 7, ly);
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
        const _eyeToKo = { FROWN: '짜증', SURPRISED: '놀람', BLURRY: '미묘함', NEUTRAL: '중립' };
        const _eyeLabel = _eyeToKo[hoveredCellInfo.eye] || hoveredCellInfo.eye || '알 수 없음';
        text(`${_eyeLabel}  (${(hoveredCellInfo.tension * 100).toFixed(0)}%)`, panelX + 20, hsY + 44);
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