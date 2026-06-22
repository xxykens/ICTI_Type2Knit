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
  showDetailPanel: false,
  showText: true,
  showEmotionInfo: true,
  scrollY: 0,
  s7ScrollX: 0,
  _emotionTagOffsets: {},   // { eTag: { ox, oy } } — lerp 보간용 현재 오프셋
  _textFade:    0,           // 텍스트 보기 페이드 (0→1)
  _emotionFade: 0,           // 감정 정보 페이드 (0→1)

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

  // ══════════════════════════════════════════════════════
  // [S7] 갤러리 뷰 — 세로 카드 가로 나열, 좌우 화살표
  // ══════════════════════════════════════════════════════
  checkS7Click: function() {
  // 홈 링크 클릭 (우상단 "▶ 홈으로")
  const HOME_X = width - 36;
  const HOME_Y = 60;
  if (mouseX >= HOME_X - 80 && mouseX <= HOME_X + 10 && mouseY >= HOME_Y - 20 && mouseY <= HOME_Y + 20) {
    if (typeof goTo === 'function') goTo('p1');
    return;
  }

  // 카드 클릭 → S8 상세뷰 열기
  const HEADER_H = 120;
  const BTN_X_L  = 36;
  const BTN_R    = 24;
  const CARD_W   = 162;
  const offsetX  = BTN_X_L + BTN_R + 10;
  const CARD_TOP = HEADER_H + 30;
  const CARD_BOT = height - 40;

  // 좌우 화살표 스크롤
  const BTN_Y   = CARD_TOP + (CARD_BOT - CARD_TOP) / 2;
  const BTN_X_R = width - 36;
  if (dist(mouseX, mouseY, BTN_X_L, BTN_Y) < BTN_R) {
    this.s7ScrollX = max(0, this.s7ScrollX - CARD_W * 2);
    return;
  }
  if (dist(mouseX, mouseY, BTN_X_R, BTN_Y) < BTN_R) {
    this.s7ScrollX += CARD_W * 2;
    return;
  }

  // 카드 선택
  if (mouseY >= CARD_TOP && mouseY <= CARD_BOT) {
    const raw = Math.floor((mouseX - offsetX + this.s7ScrollX) / CARD_W);
    if (raw >= 0 && raw < this.archivedPieces.length) {
      this.selectedPiece   = this.archivedPieces[raw];
      this.showDetailPanel = true;
      this.scrollY         = 0;
    }
  }
},
  
  drawS7Timeline: function() {
    push();
    colorMode(RGB);
    background(250);

    const HEADER_H  = 120;           // 헤더 높이
    const CARD_W    = 162;           // 카드 너비
    const CARD_TOP  = HEADER_H + 30; // 카드 시작 Y
    const CARD_BOT  = height - 40;   // 카드 끝 Y
    const CARD_H    = CARD_BOT - CARD_TOP;
    const BTN_R     = 24;
    const BTN_Y     = CARD_TOP + CARD_H / 2;
    const BTN_X_L   = 36;
    const BTN_X_R   = width - 36;

    // ── 헤더 ──────────────────────────────────────────
    noStroke(); fill(250);
    rectMode(CORNER); rect(0, 0, width, HEADER_H);

    fill(30); textSize(44); textStyle(BOLD); textAlign(LEFT, CENTER);
    text("아카이브", 62, HEADER_H / 2);

    // ── 빈 상태 ──────────────────────────────────────
    if (this.archivedPieces.length === 0) {
      fill(160); noStroke(); textAlign(CENTER, CENTER); textSize(22); textStyle(NORMAL);
      text("아직 등록된 작품이 없어요.", width / 2, height / 2);
      pop();
      return;
    }

    // ── 스크롤 클램프 ────────────────────────────────
    const nCards    = this.archivedPieces.length;
    const totalW    = nCards * CARD_W;
    const maxScroll = max(0, totalW - (width - BTN_X_L - (width - BTN_X_R)));
    this.s7ScrollX  = constrain(this.s7ScrollX, 0, maxScroll);

    // ── 호버 감지 ────────────────────────────────────
    const overL = dist(mouseX, mouseY, BTN_X_L, BTN_Y) < BTN_R;
    const overR = dist(mouseX, mouseY, BTN_X_R, BTN_Y) < BTN_R;
    let hoveredIdx = -1;
    if (!overL && !overR && mouseY >= CARD_TOP && mouseY <= CARD_BOT) {
      const offsetX = BTN_X_L + BTN_R + 10; // 왼쪽 버튼 이후 카드 시작
      const raw = Math.floor((mouseX - offsetX + this.s7ScrollX) / CARD_W);
      if (raw >= 0 && raw < nCards) hoveredIdx = raw;
    }
    cursor((hoveredIdx >= 0 || overL || overR) ? HAND : ARROW);

    // ── 카드 렌더 ────────────────────────────────────
    const S7_SP   = 16;
    const S7_CELL = 14.4;
    const offsetX = BTN_X_L + BTN_R + 10;

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(offsetX, CARD_TOP, width - offsetX - (width - BTN_X_R) - BTN_R - 10, CARD_H);
    drawingContext.clip();

    for (let i = 0; i < nCards; i++) {
      const bx = offsetX + i * CARD_W - this.s7ScrollX;
      if (bx + CARD_W < offsetX || bx > width) continue;

      const piece    = this.archivedPieces[i];
      const gridData = piece.knitArray || piece.cells || [];
      const isHover  = hoveredIdx === i;
      const yOff     = isHover ? -8 : 0;
      const by       = CARD_TOP + yOff;

      // 카드 배경
      colorMode(RGB);
      fill(isHover ? 235 : 242); noStroke();
      rectMode(CORNER); rect(bx, by, CARD_W - 4, CARD_H, 6);

      // 뜨개 셀
      colorMode(HSB, 360, 100, 100);
      for (let j = 0; j < gridData.length; j++) {
        const col  = j % 10;
        const row  = Math.floor(j / 10);
        const cell = gridData[j];
        const cx   = bx + col * S7_SP + S7_CELL * 0.5 + 4;
        const cy   = by + row * S7_SP + S7_CELL * 0.5 + 8;
        if (cy > by + CARD_H - 4) break;

        let h, s, b, stitchH, stitchBri;
        if (cell.bgHue !== undefined) {
          h = cell.bgHue; s = cell.sat; b = cell.bgBri;
          stitchH = cell.stitchHue; stitchBri = cell.stitchBri;
        } else {
          const c = _knitCellColors(cell);
          h = c.h; s = c.s; b = c.b; stitchH = c.stitchH; stitchBri = c.stitchBri;
        }

        const cw = S7_CELL - 1;
        if (cell.isBackspace) {
          stroke(h, s, b); strokeWeight(max(0.5, S7_CELL * 0.15)); noFill();
          line(cx - cw*0.4, cy - cw*0.4, cx + cw*0.2, cy);
          line(cx - cw*0.4, cy + cw*0.4, cx + cw*0.1, cy);
        } else {
          const isFilled = (cell.speed || 0) >= 0.6;
          if (isFilled) { fill(h, s, b); noStroke(); }
          else { noFill(); stroke(h, s, b); strokeWeight(max(0.4, S7_CELL * 0.12)); }
          if ((cell.tension || 0.5) >= 0.5) {
            rectMode(CENTER); rect(cx, cy, cw, cw, max(0.5, S7_CELL * 0.08));
          } else {
            ellipse(cx, cy, cw, cw);
          }
          if (S7_CELL >= 6) {
            const r = S7_CELL * 0.25;
            stroke(stitchH, s, stitchBri); strokeWeight(max(0.4, S7_CELL * 0.08)); noFill();
            if (cell.eye === 'FROWN' || cell.eye === '찌푸림') {
              line(cx-r, cy-r, cx+r, cy+r); line(cx+r, cy-r, cx-r, cy+r);
            } else if (cell.eye === 'SURPRISED' || cell.eye === '놀람') {
              beginShape();
              for (let k = 0; k < 8; k++) {
                const rk = k % 2 === 0 ? r : r * 0.4;
                vertex(cx + cos(PI/4*k)*rk, cy + sin(PI/4*k)*rk);
              }
              endShape(CLOSE);
            } else {
              beginShape();
              vertex(cx-r, cy-r*0.6); vertex(cx, cy+r*0.8); vertex(cx+r, cy-r*0.6);
              endShape();
            }
          }
        }
      }

      // 호버 테두리
      if (isHover) {
        colorMode(RGB);
        noFill(); stroke(180); strokeWeight(1.5);
        rectMode(CORNER); rect(bx, by, CARD_W - 4, CARD_H, 6);
      }
    }
    drawingContext.restore();

    // ── 호버 툴팁 ────────────────────────────────────
    if (hoveredIdx >= 0) {
      colorMode(RGB);
      const piece = this.archivedPieces[hoveredIdx];
      const bx    = offsetX + hoveredIdx * CARD_W - this.s7ScrollX;
      const name  = piece.privacy === 'private' ? '익명의 니터' : (piece.nickname || 'anonymous');
      const dObj  = new Date(piece.date);
      const dateStr = `${dObj.getFullYear()}.${String(dObj.getMonth()+1).padStart(2,'0')}.${String(dObj.getDate()).padStart(2,'0')}`;

      let eyeLabel = { FROWN: '짜증', SURPRISED: '놀람', BLURRY: '미묘함' };
      let eGroups = {};
      (piece.cells || []).forEach(c => {
        let t = c.emotionTag;
        if (!t || t === 'NEUTRAL' || t === '중립') return;
        if (!eGroups[t]) eGroups[t] = { sum: 0, n: 0 };
        eGroups[t].sum += (c.emotionIntensity || 0); eGroups[t].n++;
      });
      let eList = Object.entries(eGroups)
        .map(([k, v]) => ({ label: eyeLabel[k] || k, avg: v.n ? v.sum/v.n : 0 }))
        .sort((a, b) => b.avg - a.avg).slice(0, 3);

      const ttW = 170;
      const ttH = 60 + max(1, eList.length) * 20;
      const ttX = constrain(bx + (CARD_W - 4) / 2 - ttW / 2, 8, width - ttW - 8);
      const ttY = CARD_TOP - ttH - 8;

      fill(255, 255, 255, 245); stroke(210); strokeWeight(1);
      rectMode(CORNER); rect(ttX, ttY, ttW, ttH, 8);

      fill(30); noStroke(); textSize(14); textStyle(BOLD); textAlign(LEFT, TOP);
      text(name, ttX + 12, ttY + 12);
      fill(150); textSize(11); textStyle(NORMAL);
      text(dateStr, ttX + 12, ttY + 32);

      fill(80); textSize(11); textStyle(BOLD);
      text('[감정태그]', ttX + 12, ttY + 50);
      eList.forEach((e, k) => {
        fill(90); textSize(11); textStyle(NORMAL); textAlign(LEFT, TOP);
        text(`• ${e.label} ${e.avg.toFixed(2)}`, ttX + 12, ttY + 66 + k * 20);
      });
    }

    // ── 좌우 화살표 버튼 ─────────────────────────────
    colorMode(RGB);
    const canL = this.s7ScrollX > 0;
    const canR = this.s7ScrollX < maxScroll;

    [[BTN_X_L, canL, overL, '‹'], [BTN_X_R, canR, overR, '›']].forEach(([bx, can, over, ch]) => {
      fill(255, 255, 255, can ? (over ? 240 : 200) : 80);
      stroke(200, 200, 200, can ? 200 : 80); strokeWeight(1);
      rectMode(CENTER); rect(bx, BTN_Y, BTN_R*2, BTN_R*2, BTN_R);
      fill(60, 60, 60, can ? 220 : 80); noStroke();
      textSize(28); textStyle(BOLD); textAlign(CENTER, CENTER);
      text(ch, bx, BTN_Y + 2);
    });

    pop();
  },

  // [S7] 클릭 처리
  checkS7Click: function() {
    const CARD_W    = 162;
    const HEADER_H  = 120;
    const CARD_TOP  = HEADER_H + 30;
    const CARD_BOT  = height - 40;
    const BTN_R     = 24;
    const BTN_Y     = CARD_TOP + (CARD_BOT - CARD_TOP) / 2;
    const BTN_X_L   = 36;
    const BTN_X_R   = width - 36;
    const offsetX   = BTN_X_L + BTN_R + 10;
    const maxScroll = max(0, this.archivedPieces.length * CARD_W - (width - offsetX - (width - BTN_X_R) - BTN_R - 10));
    const SCROLL_STEP = CARD_W * 3;

    if (dist(mouseX, mouseY, BTN_X_L, BTN_Y) < BTN_R) {
      this.s7ScrollX = constrain(this.s7ScrollX - SCROLL_STEP, 0, maxScroll);
      return false;
    }
    if (dist(mouseX, mouseY, BTN_X_R, BTN_Y) < BTN_R) {
      this.s7ScrollX = constrain(this.s7ScrollX + SCROLL_STEP, 0, maxScroll);
      return false;
    }
    if (mouseY >= CARD_TOP && mouseY <= CARD_BOT) {
      const raw = Math.floor((mouseX - offsetX + this.s7ScrollX) / CARD_W);
      if (raw >= 0 && raw < this.archivedPieces.length) {
        this.selectedPiece = this.archivedPieces[raw];
        this.scrollY = 0;
        this.showDetailPanel = true;
        return true;
      }
    }
    return false;
  },

  // [S7] 가로 스크롤
  handleS7Scroll: function(delta) {
    const maxScroll = max(0, this.archivedPieces.length * 162 - width);
    this.s7ScrollX = constrain(this.s7ScrollX + delta * 0.8, 0, maxScroll);
  },

  // [S8] 세로 스크롤
  handleS8Scroll: function(delta) {
    if (!this.selectedPiece) return;
    const gridData = this.selectedPiece.knitArray || this.selectedPiece.cells || [];
    const totalRows = Math.ceil(gridData.length / 10);
    const totalContentH = totalRows * 44;
    this.scrollY -= delta * 0.8;
    this.scrollY = min(this.scrollY, 0);
    this.scrollY = max(this.scrollY, -(max(0, totalContentH - 400)));
  },

  // [S8] 체크박스/닫기 클릭
  handleS8CheckboxClick: function(mx, my) {
    const piece = this.selectedPiece;
    if (!piece) return false;

    const INFO_W   = 220;
    const INFO_X   = width - INFO_W - 20;
    // PANEL_Y와 knitInfoLines는 drawS8SingleView와 동일한 공용 헬퍼로 계산해야 클릭 좌표가 어긋나지 않는다
    const _s8Layout = this._computeS8PanelLayout(piece);
    const PANEL_Y  = _s8Layout.panelY;
    const PANEL_H  = height - PANEL_Y;

    // 닫기 버튼
    const closeX = INFO_X + INFO_W - 20;
    const closeY = PANEL_Y + 26;
    if (mx >= closeX - 16 && mx <= closeX + 16 && my >= closeY - 16 && my <= closeY + 16) {
      this.showDetailPanel = false;
      this.selectedPiece = null;
      return true;
    }

    // 체크박스 Y 계산 (drawS8SingleView와 동일한 로직)
    const _knitInfoLines = _s8Layout.knitInfoLines;
    const _eList = _s8Layout.eList;
    const cbX  = INFO_X + 18;
    const cbSz = 15;
    let knitInfoBottomY = PANEL_Y + 72 + 22 + _knitInfoLines.length * 17;
    if (_eList.length > 0) {
      knitInfoBottomY += 8 + _eList.length * 20;
    }
    const cbY  = knitInfoBottomY + 18;
    const cbY2 = cbY + 28;

    // 텍스트 보기 토글
    if (mx >= cbX && mx <= cbX + cbSz + 90 && my >= cbY && my <= cbY + cbSz) {
      if (piece.privacy !== 'partial') this.showText = !this.showText;
      return true;
    }
    // 감정 정보 보기 토글
    if (mx >= cbX && mx <= cbX + cbSz + 100 && my >= cbY2 && my <= cbY2 + cbSz) {
      this.showEmotionInfo = !this.showEmotionInfo;
      return true;
    }
    // ESC는 keyPressed에서 처리
    return false;
  },

  // 현재 textSize 기준으로 maxWidth를 넘지 않도록 어절 단위 줄바꿈
  _wrapTextLines: function(str, maxWidth) {
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    words.forEach(w => {
      const test = cur ? (cur + ' ' + w) : w;
      if (cur && textWidth(test) > maxWidth) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    });
    if (cur) lines.push(cur);
    return lines;
  },

  // 선택된 작품의 감정 태그·타이핑 속도를 분석해 "뜨개물 정보" 안내 문구와 감정 태그 목록을 만든다
  _buildKnitInfo: function(piece) {
    const posTags = ['해탈', '미묘함'];
    const negTags = ['짜증', '놀람', '슬픔', '긴장'];
    const eyeLabel = { FROWN: '짜증', SURPRISED: '놀람', BLURRY: '미묘함' };
    let emoOrder = [];
    let emoCount = {};
    let eGroups = {};
    let posCount = 0, negCount = 0;
    let speedSum = 0, speedN = 0;
    (piece.cells || piece.knitArray || []).forEach(c => {
      const t = c.emotionTag;
      if (t && t !== 'NEUTRAL' && t !== '중립') {
        if (!emoCount[t]) { emoCount[t] = 0; emoOrder.push(t); }
        emoCount[t]++;
        if (posTags.indexOf(t) !== -1) posCount++;
        else if (negTags.indexOf(t) !== -1) negCount++;

        if (!eGroups[t]) eGroups[t] = { sum: 0, n: 0 };
        eGroups[t].sum += (c.emotionIntensity || 0); eGroups[t].n++;
      }
      // piece.cells 항목은 typingSpeed, piece.knitArray 항목은 speed 필드를 쓴다 (KnitPiece.js 참고)
      const sp = (typeof c.speed === 'number') ? c.speed : c.typingSpeed;
      if (typeof sp === 'number') { speedSum += sp; speedN++; }
    });
    const avgSpeed = speedN ? speedSum / speedN : 0;
    const knitName = piece.privacy === 'private' ? '익명의 니터' : (piece.nickname || 'anonymous');

    let text = '';
    if (emoOrder.length === 1) {
      text = `${knitName}님이 느끼시는 지배적인 감정은 ${emoOrder[0]}입니다. 오늘 그럴만한 일이 있으셨나봐요.`;
    } else if (emoOrder.length === 2) {
      // {감정명1}→{감정명2}는 뜨개 코 배열에서 먼저 등장한 순서(emoOrder)를 그대로 사용해 "변화"를 표현
      text = `${knitName}님, ${emoOrder[0]}에서 ${emoOrder[1]}로 감정이 변화하는 것을 보았어요. 오늘 하루를 잘 되짚어 보아요`;
    } else if (emoOrder.length >= 3) {
      // {감정명1}은 평균 강도가 아니라 등장 횟수(비중) 기준 1위
      const byCount  = Object.keys(emoCount).sort((a, b) => emoCount[b] - emoCount[a]);
      const polarity = posCount >= negCount ? '긍정' : '부정';
      text = `${knitName}님이 느끼시는 지배적인 감정은 ${byCount[0]}입니다. ${byCount[1]}, ${byCount[2]}도 함께 묻어나는 복합적인 하루였네요. 전체적으로는 주로 ${polarity}적인 감정이 많이 담겼어요.`;
    }
    if (text) {
      if (avgSpeed >= 0.6) {
        text += ' 마음 속의 말을 술술 풀어내어 타이핑 속도가 꽤 빠르셨군요.';
      } else if (avgSpeed > 0 && avgSpeed < 0.4) {
        text += ' 마음 속으로 정리할 시간이 필요하셨나요? 타이핑 속도가 조금 느린 편이었어요.';
      }
    }

    const eList = Object.entries(eGroups)
      .map(([k, v]) => ({ label: eyeLabel[k] || k, avg: v.n ? v.sum/v.n : 0 }))
      .sort((a, b) => b.avg - a.avg).slice(0, 3);

    textSize(11); textStyle(NORMAL);
    const lines = this._wrapTextLines(text || '기록된 감정 정보가 부족해요.', 220 - 36);
    return { text, lines, eList };
  },

  // S8 상세 패널의 시작 Y(PANEL_Y)를 콘텐츠 길이에 맞춰 동적으로 계산.
  // drawS8SingleView(렌더링)와 handleS8CheckboxClick(히트테스트)이 같은 좌표를 쓰도록 공유한다.
  // ※ 아래 오프셋은 drawS8SingleView의 실제 렌더링 순서(뜨개물정보(요약+감정태그)→텍스트보기→선택된코)와 동일해야 함
  _computeS8PanelLayout: function(piece) {
    const ki = this._buildKnitInfo(piece);
    const tagsExtra = ki.eList.length > 0 ? (8 + ki.eList.length * 20) : 0;
    const contentBottom = 245 + ki.lines.length * 17 + tagsExtra;
    const panelY = Math.max(60, Math.min(height / 2 + 10, height - 20 - contentBottom));
    return { panelY: panelY, knitInfoLines: ki.lines, eList: ki.eList };
  },

  // [S8] 클릭한 작품 상세 패널 (S7 위에 오버레이)
  drawS8SingleView: function() {
    if (!this.selectedPiece || !this.showDetailPanel) return;

    const piece    = this.selectedPiece;
    const gridData = piece.knitArray || piece.cells || [];

    // 정보창에 표시할 "뜨개물 정보" 문구 + 그에 맞춰 늘어난 패널 시작 Y
    // (handleS8CheckboxClick의 히트테스트와 반드시 같은 값을 써야 하므로 공용 헬퍼로 계산)
    push();
    colorMode(RGB);
    const _s8Layout = this._computeS8PanelLayout(piece);
    pop();
    const _knitInfoLines = _s8Layout.knitInfoLines;
    const _eList = _s8Layout.eList;

    const PANEL_Y  = _s8Layout.panelY;
    const PANEL_H  = height - PANEL_Y;
    const GRID_X   = 40;               // 뜨개 그리드 시작 X
    const INFO_W   = 220;              // 우측 정보창 너비
    const INFO_X   = width - INFO_W - 20;

    // 어두운 오버레이
    colorMode(RGB);
    fill(30, 30, 30, 210);
    noStroke(); rectMode(CORNER);
    rect(0, PANEL_Y, width, PANEL_H);

    // 정보창 배경
    fill(255); stroke(220); strokeWeight(1);
    rect(INFO_X, PANEL_Y + 10, INFO_W, PANEL_H - 20, 8);

    // ── 닫기 버튼 ──────────────────────────────────
    const closeX = INFO_X + INFO_W - 20;
    const closeY = PANEL_Y + 26;
    fill(230); noStroke(); rectMode(CENTER); rect(closeX, closeY, 22, 22, 4);
    fill(100); textSize(13); textStyle(BOLD); textAlign(CENTER, CENTER);
    text('×', closeX, closeY + 1);

    // ── 메타데이터 ──────────────────────────────────
    const px  = INFO_X + 18;
    const name = piece.privacy === 'private' ? '익명의 니터' : (piece.nickname || 'anonymous');
    const dObj = new Date(piece.date);
    const dateStr = `${dObj.getFullYear()}.${String(dObj.getMonth()+1).padStart(2,'0')}.${String(dObj.getDate()).padStart(2,'0')}`;

    fill(30); noStroke(); textSize(16); textStyle(BOLD); textAlign(LEFT, TOP);
    text(name, px, PANEL_Y + 18);
    fill(150); textSize(11); textStyle(NORMAL);
    text(dateStr, px, PANEL_Y + 40);

    // 구분선
    stroke(220); strokeWeight(1);
    line(INFO_X + 10, PANEL_Y + 60, INFO_X + INFO_W - 10, PANEL_Y + 60);

    // ── 뜨개물 정보 (요약 메시지 + 감정 태그) ────────────
    const knitInfoY = PANEL_Y + 72;
    push();
    fill(80); noStroke(); textSize(12); textStyle(BOLD); textAlign(LEFT, TOP);
    text('뜨개물 정보', px, knitInfoY);
    fill(110); textSize(11); textStyle(NORMAL);
    textLeading(17);
    text(_knitInfoLines.join('\n'), px, knitInfoY + 22);
    pop();

    let knitInfoBottomY = knitInfoY + 22 + _knitInfoLines.length * 17;

    if (_eList.length > 0) {
      const tagListY = knitInfoBottomY + 8;
      _eList.forEach((e, k) => {
        fill(80); noStroke(); textSize(11); textStyle(NORMAL); textAlign(LEFT, TOP);
        text(`• ${e.label} ${e.avg.toFixed(2)}`, px, tagListY + k * 20);
      });
      knitInfoBottomY = tagListY + _eList.length * 20;
    }

    // 구분선
    stroke(220); strokeWeight(1);
    line(INFO_X + 10, knitInfoBottomY + 8, INFO_X + INFO_W - 10, knitInfoBottomY + 8);

    // ── 텍스트 보기 체크박스 ────────────────────────
    const cbX  = px;
    const cbY  = knitInfoBottomY + 18;
    const cbSz = 15;
    const textProtected = piece.privacy === 'partial';
    noStroke();
    fill(textProtected ? color(235) : (this.showText ? color(90, 185, 100) : color(220)));
    rectMode(CORNER); rect(cbX, cbY, cbSz, cbSz, 3);
    if (this.showText && !textProtected) {
      stroke(255); strokeWeight(2); noFill();
      line(cbX+3, cbY+8, cbX+6, cbY+11); line(cbX+6, cbY+11, cbX+12, cbY+4);
    }
    fill(textProtected ? color(190) : color(50)); noStroke(); textSize(12); textStyle(NORMAL); textAlign(LEFT, CENTER);
    text(textProtected ? '원문은 보호됩니다' : '텍스트 보기', cbX + cbSz + 8, cbY + cbSz/2);

    // ── 감정 정보 보기 체크박스 ──────────────────────
    const cbY2 = cbY + 28;
    noStroke();
    fill(this.showEmotionInfo ? color(90, 185, 100) : color(220));
    rectMode(CORNER); rect(cbX, cbY2, cbSz, cbSz, 3);
    if (this.showEmotionInfo) {
      stroke(255); strokeWeight(2); noFill();
      line(cbX+3, cbY2+8, cbX+6, cbY2+11); line(cbX+6, cbY2+11, cbX+12, cbY2+4);
    }
    fill(50); noStroke(); textSize(12); textStyle(NORMAL); textAlign(LEFT, CENTER);
    text('감정 정보 보기', cbX + cbSz + 8, cbY2 + cbSz/2);

    // ── 뜨개 그리드 ────────────────────────────────
    const cellSize = 24;
    const spacing  = 28;
    const gridW    = 10 * spacing;
    const gStartX  = (INFO_X - GRID_X - gridW) / 2 + GRID_X + spacing / 2;
    const gStartY  = PANEL_Y + 20 + this.scrollY;

    let hoveredCellInfo = null;
    let emotionCells = [];
    let seenEmotionTags = new Set();

    push();
    colorMode(HSB, 360, 100, 100);

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(GRID_X, PANEL_Y, INFO_X - GRID_X - 10, PANEL_H);
    drawingContext.clip();

    // 토글 페이드 lerp
    this._textFade    = lerp(this._textFade,    this.showText        ? 1 : 0, 0.1);
    this._emotionFade = lerp(this._emotionFade, this.showEmotionInfo ? 1 : 0, 0.1);

    this.drawKnitGrid(gridData, gStartX, gStartY, cellSize, spacing, {
      showText:        this._textFade > 0.01,
      textAlpha:       this._textFade,
      showEmotionInfo: this._emotionFade > 0.01,
      privacy:         piece.privacy,
      clipMinY:        PANEL_Y,
      clipMaxY:        height + spacing,
      seenEmotionTags: seenEmotionTags,
      onHover: (cell, posX, posY) => {
        hoveredCellInfo = cell;
        // 셀 어둡게 호버 오버레이
        fill(0, 0, 0, 55); noStroke();
        rectMode(CENTER); rect(posX, posY, cellSize, cellSize, 6);
        // 테두리
        stroke(0, 0, 88); strokeWeight(2); noFill();
        rectMode(CENTER); rect(posX, posY, cellSize + 6, cellSize + 6, 6);
      },
      onEmotionCell: (info) => {
        emotionCells.push(info);
      }
    });

    drawingContext.restore();
    pop();

    // ── 감정 정보 태그 화살표 어노테이션 ──────────────
    if (this._emotionFade > 0.01 && emotionCells.length > 0) {
      drawingContext.globalAlpha = this._emotionFade;
      colorMode(RGB);
      textSize(13); textStyle(NORMAL);
      const _labelToKo = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화', NEUTRAL: '중립' };
      const PAD_LEFT   = GRID_X + 20;
      const PAD_RIGHT  = INFO_X - 30;
      const PAD_TOP    = PANEL_Y + 20;
      const PAD_BOTTOM = height - 20;
      emotionCells.forEach(({ posX, posY, eTag, eIntensity, col }) => {
        let displayTag = _labelToKo[eTag] || eTag;
        let labelText = `${displayTag}  ${(eIntensity * 100).toFixed(0)}%`;
        let tW = textWidth(labelText) + 24;
        let tH = 28;
        let lineLen = 10;
        let rise    = spacing * 0.35;
        let lxLeft  = posX - cellSize / 2 - lineLen - tW;
        let lxRight = posX + cellSize / 2 + lineLen;

        // 좌우 스마트 배치: 기본 방향 → 벗어나면 반대로
        let isLeft = col < 5;
        if (isLeft  && lxLeft  < PAD_LEFT)       isLeft = false;
        if (!isLeft && lxRight + tW > PAD_RIGHT)  isLeft = true;
        let lx = constrain(isLeft ? lxLeft : lxRight, PAD_LEFT, PAD_RIGHT - tW);

        // 상하 스마트 배치: 기본 위 → 벗어나면 아래로
        let ly = posY - rise;
        if (ly - tH / 2 < PAD_TOP) ly = posY + rise;
        ly = constrain(ly, PAD_TOP + tH / 2, PAD_BOTTOM - tH / 2);

        // 해당 셀 호버 시에만 태그 살짝 이동 (lerp 보간)
        if (!this._emotionTagOffsets[eTag]) this._emotionTagOffsets[eTag] = { ox: 0, oy: 0 };
        const off = this._emotionTagOffsets[eTag];
        const onCell = (mouseX >= posX - cellSize / 2 && mouseX <= posX + cellSize / 2 &&
                        mouseY >= posY - cellSize / 2 && mouseY <= posY + cellSize / 2);
        const targetOx = onCell ? (isLeft ? -6 : 6) : 0;
        const targetOy = onCell ? -8 : 0;
        off.ox = lerp(off.ox, targetOx, 0.055);
        off.oy = lerp(off.oy, targetOy, 0.055);
        lx = constrain(lx + off.ox, PAD_LEFT, PAD_RIGHT - tW);
        ly = constrain(ly + off.oy, PAD_TOP + tH / 2, PAD_BOTTOM - tH / 2);

        // 태그에 가장 가까운 셀 꼭짓점에서 x/y 각 6px 안쪽
        const dotX = isLeft ? posX - cellSize / 2 + 3 : posX + cellSize / 2 - 3;
        const dotY = ly < posY ? posY - cellSize / 2 + 3 : posY + cellSize / 2 - 3;
        drawingContext.shadowBlur = 6;
        drawingContext.shadowColor = 'rgba(0,0,0,0.1)';
        drawingContext.shadowOffsetY = 1;
        fill(255, 255, 255); stroke(215, 208, 198); strokeWeight(1.5);
        ellipseMode(CENTER);
        circle(dotX, dotY, 13);
        drawingContext.shadowBlur = 0;
        drawingContext.shadowOffsetY = 0;

        // 태그 배경 + 그림자
        drawingContext.shadowBlur = 12;
        drawingContext.shadowColor = 'rgba(0,0,0,0.14)';
        drawingContext.shadowOffsetY = 3;
        fill(255, 255, 255); stroke(215, 208, 198); strokeWeight(1);
        rectMode(CORNER); rect(lx, ly - tH / 2, tW, tH, 10);
        drawingContext.shadowBlur = 0;
        drawingContext.shadowOffsetY = 0;

        // 태그 텍스트
        fill(60, 52, 42); noStroke(); textAlign(LEFT, CENTER);
        text(labelText, lx + 11, ly);
      });
      drawingContext.globalAlpha = 1;
    }

    // ── 선택된 코 정보 ────────────────────────────────
    colorMode(RGB);
    const infoY = cbY2 + cbSz + 20;
    stroke(215); strokeWeight(1);
    line(INFO_X + 10, infoY - 10, INFO_X + INFO_W - 10, infoY - 10);
    fill(80); noStroke(); textSize(12); textStyle(BOLD); textAlign(LEFT, TOP);
    text('선택된 코 정보', px, infoY);

    if (hoveredCellInfo) {
      const _eyeToKo = { FROWN: '짜증', SURPRISED: '놀람', BLURRY: '미묘함', NEUTRAL: '중립' };
      const eyeKo = _eyeToKo[hoveredCellInfo.eye] || hoveredCellInfo.eye || '알 수 없음';
      let lineY = infoY + 20;
      if (!textProtected) {
        fill(30); textSize(13); textStyle(BOLD);
        text(`"${hoveredCellInfo.text || '—'}"`, px, lineY);
        lineY += 20;
      }
      fill(120); textSize(11); textStyle(NORMAL);
      text(`${eyeKo}  (${(hoveredCellInfo.tension*100||0).toFixed(0)}%)`, px, lineY);
      text(`속도: ${((hoveredCellInfo.speed||0)*100).toFixed(0)}%`, px, lineY + 18);
    } else {
      fill(190); noStroke(); textSize(11); textStyle(NORMAL); textAlign(LEFT, TOP);
      text('니트 코 위에 마우스를 올리면\n정보가 표시됩니다.', px, infoY + 20);
    }

    // 하단 안내
    colorMode(RGB);
    fill(160); noStroke(); textSize(10); textStyle(NORMAL); textAlign(CENTER, BOTTOM);
    text('스크롤해서 더보기  ·  esc 눌러서 나가기', width / 2, height - 8);
  },

  // ── 공용 뜨개 그리드 렌더러 ──────────────────────────────────────────
  // S8 상세뷰, 미리보기(p12/p14) 등에서 공통으로 호출
  // opts: { showText, showEmotionInfo, privacy, clipMinY, seenEmotionTags, onHover, onEmotionCell }
  drawKnitGrid: function(gridData, startX, startY, cellSize, spacing, opts) {
    opts = opts || {};
    const showText        = opts.showText        !== undefined ? opts.showText        : false;
    const showEmotionInfo = opts.showEmotionInfo  !== undefined ? opts.showEmotionInfo : false;
    const privacy         = opts.privacy          || 'public';
    const clipMinY        = opts.clipMinY         !== undefined ? opts.clipMinY        : -Infinity;
    const clipMaxY        = opts.clipMaxY         !== undefined ? opts.clipMaxY        : height + spacing;
    const seenEmotionTags = opts.seenEmotionTags  || new Set();
    const onHover         = opts.onHover          || null;
    const onEmotionCell   = opts.onEmotionCell    || null;
    const textAlpha       = opts.textAlpha        !== undefined ? opts.textAlpha : 1;

    // colorMode(HSB) 는 호출부에서 이미 설정했다고 가정
    // push/pop으로 감싸 fill/stroke/noFill 등 드로잉 상태가
    // 호출부 바깥(p9 대바늘 렌더링 등)으로 새어나가지 않도록 함
    push();
    gridData.forEach((cell, idx) => {
      const col  = idx % 10;
      const row  = Math.floor(idx / 10);
      const posX = startX + col * spacing;
      const posY = startY + row * spacing;

      if (posY < clipMinY || posY > clipMaxY) return;

      let bgHue, sat, bgBri, stitchHue, stitchBri;
      if (cell.bgHue !== undefined) {
        bgHue = cell.bgHue; sat = cell.sat; bgBri = cell.bgBri;
        stitchHue = cell.stitchHue; stitchBri = cell.stitchBri;
      } else {
        const c = _knitCellColors(cell);
        bgHue = c.h; sat = c.s; bgBri = c.b;
        stitchHue = c.stitchH; stitchBri = c.stitchBri;
      }

      // [1] 백스페이스 — 끊긴 실
      if (cell.isBackspace) {
        stroke(bgHue, sat, bgBri); strokeWeight(3.5); noFill();
        line(posX - 12, posY - 12, posX + 5, posY);
        line(posX - 12, posY + 12, posX + 2, posY);

      // [2] 일반 셀
      } else {
        const isFilled   = (cell.speed || 0) >= 0.6;
        const actualSize = isFilled ? cellSize : cellSize - 5;

        if (isFilled) { fill(bgHue, sat, bgBri); noStroke(); }
        else          { noFill(); stroke(bgHue, sat, bgBri); strokeWeight(map(cell.speed || 0, 0, 0.6, 2, 4.5)); }

        if ((cell.tension || 0.5) >= 0.5) {
          rectMode(CENTER); rect(posX, posY, actualSize, actualSize, 6);
        } else {
          ellipse(posX, posY, actualSize, actualSize);
        }

        // 내부 감정 패턴
        const r = cellSize * 0.28;
        stroke(stitchHue, sat, stitchBri); strokeWeight(2.5); noFill();
        if (cell.eye === 'FROWN' || cell.eye === '찌푸림' || cell.eye === '짜증') {
          line(posX - r, posY - r, posX + r, posY + r);
          line(posX + r, posY - r, posX - r, posY + r);
        } else if (cell.eye === 'SURPRISED' || cell.eye === '놀람') {
          beginShape();
          for (let k = 0; k < 8; k++) {
            const radius = k % 2 === 0 ? r : r * 0.4;
            vertex(posX + cos(PI/4*k)*radius, posY + sin(PI/4*k)*radius);
          }
          endShape(CLOSE);
        } else {
          beginShape();
          vertex(posX - r, posY - r * 0.6);
          vertex(posX,     posY + r * 0.8);
          vertex(posX + r, posY - r * 0.6);
          endShape();
        }

        // 🔒 비공개 마스킹
        if (privacy === 'private') {
          fill(0, 0, 15, 0.96); noStroke();
          rectMode(CENTER); rect(posX, posY, cellSize, cellSize, 4);
          fill(0, 0, 100); textSize(12); textAlign(CENTER, CENTER);
          text('🔒', posX, posY + 1);

        // 글자 오버레이
        } else if (showText && privacy !== 'partial' && cell.text && cell.text.trim().length > 0) {
          const textChar = cell.text.trim()[0];
          textSize(18); textStyle(BOLD); textAlign(CENTER, CENTER); noStroke();
          drawingContext.globalAlpha = textAlpha;
          drawingContext.shadowBlur = 6;
          drawingContext.shadowColor = 'rgba(255,255,255,0.85)';
          fill(0, 0, 10);
          text(textChar, posX, posY + 1);
          drawingContext.shadowBlur = 0;
          drawingContext.globalAlpha = 1;
        }

        // 감정 정보 수집
        if (showEmotionInfo && onEmotionCell) {
          const _eyeToKoMap = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화', NEUTRAL: '중립' };
          const eIntensity = cell.emotionIntensity !== undefined ? cell.emotionIntensity : (cell.tension || 0);
          const eTag = cell.emotionTagKo || _eyeToKoMap[cell.emotionTag] || _eyeToKoMap[cell.eye] || cell.emotionTag || cell.eye || '';
          if (eIntensity >= 0.5 && eTag && eTag !== '중립' && eTag !== 'NEUTRAL' && !seenEmotionTags.has(eTag)) {
            onEmotionCell({ posX, posY, eTag, eIntensity, col });
            seenEmotionTags.add(eTag);
          }
        }
      }

      // 호버 콜백
      if (onHover &&
          mouseX >= posX - cellSize/2 && mouseX <= posX + cellSize/2 &&
          mouseY >= posY - cellSize/2 && mouseY <= posY + cellSize/2) {
        onHover(cell, posX, posY);
      }
    });
    pop();
  }

};

window.page_S7_S8 = page_S7_S8;