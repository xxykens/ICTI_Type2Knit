const state = {
  nickname: '',
  privacy: 'public',
  charCount: 0,
  currentScreen: 'p1'
};
window.state = state;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('p18-overlay-backdrop')) {
    closeP18Overlay();
  }
});

// ── 화면 전환 ──
function goTo(id) {
  if (state.currentScreen === 'p9' && id !== 'p9') {
    if (typeof window.knitSketch_onP9Leave === 'function') window.knitSketch_onP9Leave();
  }

  const cur = document.getElementById(state.currentScreen);
  const next = document.getElementById(id);
  if (!next) return;
  cur.classList.remove('active');
  cur.style.display = 'none';
  next.style.display = 'flex';
  next.classList.add('active');
  state.currentScreen = id;
  onScreenEnter(id);
}

function onScreenEnter(id) {
  if (id === 'p1') {
    state.charCount = 0;
    document.getElementById('typing-capture').value = '';
    document.getElementById('char-count').textContent = '0';
  }
  if (id === 'p3') startIntro(['p3-l1','p3-l2','p3-l3','p3-l4'], () => goTo('p4'));
  if (id === 'p4') startIntro(['p4-l1','p4-l2','p4-l3','p4-l4','p4-l5'], () => goTo('p5'));
  if (id === 'p5') startIntro(['p5-l1','p5-l2','p5-l3','p5-l4'], () => goTo('p6'));
  if (id === 'p6') startIntro(['p6-l1','p6-l2','p6-l3','p6-l4'], () => {
  document.getElementById('p6-start-btn').style.display = 'block';
  });

  if (id === 'p7') {
  knitstampInputController.faceTracker.baseline = null;

  let count = 5;
  const countEl = document.getElementById('p7-countdown');
  if (countEl) countEl.textContent = `${count}초 후 기본 표정이 인식됩니다.`;

  const countInterval = setInterval(() => {
    count--;
    if (countEl) countEl.textContent = `${count}초 후 기본 표정이 인식됩니다.`;
    if (count <= 0) clearInterval(countInterval);
  }, 1000);

  setTimeout(() => {
    if (state.currentScreen !== 'p7') return;
    if (countEl) countEl.textContent = '';

    const updateInterval = setInterval(() => {
      if (typeof registerFaceBaseline === 'function') {
        const result = registerFaceBaseline();
        if (result && result.success) {
          clearInterval(updateInterval);
          if (state.currentScreen === 'p7') goTo('p8');
        }
      }
    }, 300);

  }, 5000);
}

  if (id === 'p8') {
    // p8: 2.5초 후 p9로 이동
    setTimeout(() => goTo('p9'), 2500);
  }

  if (id === 'p9') {
    setTimeout(focusTyping, 300);
    if (typeof window.knitSketch_onP9Enter === 'function') window.knitSketch_onP9Enter();
    // knitstamp 루프는 p7부터 이미 돌고 있음 — 여기선 시작만 확인
    startKnitstampLoop();
  }

  if (id === 'p11') {
    stopKnitstampLoop();
    setTimeout(finishAnimation, 2800);
  }

  if (id === 'p18') {
    if (!window.page_S7_S8 || !window.page_S5) return;
    const doLoad = () => {
      window.page_S7_S8.loadDataFromDB().then((pieces) => {
        renderP18Cards(pieces);
      });
    };
    if (!window.page_S5.db) {
      window.page_S5.initDB().then(doLoad);
    } else {
      doLoad();
    }
  }

  if (id === 'p12') {
    fillCompleteScreen();
    setTimeout(() => {
      if (typeof window.knitSketch_renderPreview === 'function') window.knitSketch_renderPreview();
    }, 100);
  }
  if (id === 'p14') {
    document.getElementById('p14-chars').textContent = state.charCount;
    setTimeout(() => {
      if (typeof window.knitSketch_renderPreview === 'function') window.knitSketch_renderPreview();
    }, 100);
  }
  if (id === 'p16') {
    setTimeout(() => {
      document.getElementById('p16-text').style.opacity = '0';
      setTimeout(() => goTo('p17'), 4000);
    }, 5000);
  }
}

// ── knitstamp 루프 관리 ──
function startKnitstampLoop() {
  if (state._knitstampInterval) return; // 이미 돌고 있으면 중복 시작 안 함
  state._knitstampInterval = setInterval(() => {
    if (typeof updateKnitstampInput === 'function') updateKnitstampInput();
  }, 1000);
}

function stopKnitstampLoop() {
  if (state._knitstampInterval) {
    clearInterval(state._knitstampInterval);
    state._knitstampInterval = null;
  }
}

// ── 인트로 애니메이션 ──
function startIntro(lineIds, callback) {
  lineIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
  let delay = 400;
  lineIds.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.add('visible');
      if (i === lineIds.length - 1 && callback) setTimeout(callback, 3000);
    }, delay);
    delay += 700;
  });
}

// ── P2 ──
function updateNicknameCount() {
  const v = document.getElementById('nickname-input').value;
  state.nickname = v;
  document.getElementById('nickname-count').textContent = `(${v.length}/12)`;
}

function selectPrivacy(type) {
  state.privacy = type;
  ['public', 'partial', 'private'].forEach(t =>
    document.getElementById('card-' + t).classList.toggle('selected', t === type)
  );
  const input = document.getElementById('nickname-input');
  if (type === 'private') {
    input.value = ''; input.disabled = true;
    input.placeholder = '닉네임이 남지 않아요';
    document.getElementById('nickname-count').textContent = '(0/12)';
  } else {
    input.disabled = false;
    input.placeholder = '닉네임 입력 (최대 12자)';
  }
}

function confirmP2() {
  if ((state.privacy === 'public' || state.privacy === 'partial') && !document.getElementById('nickname-input').value.trim()) {
    alert('닉네임을 입력해주세요.');
    return;
  }
  state.nickname = state.privacy === 'private'
    ? '' : (document.getElementById('nickname-input').value || '익명');
  goTo('p7');
}

// ── P6: 기준 표정 등록 ──
async function handleBaselineRegister() {
  // predictions 찰 때까지 대기 (200ms마다 체크)
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (knitstampInputController.faceTracker.predictions.length > 0) {
        clearInterval(check);
        resolve();
      }
    }, 200);
    setTimeout(() => { clearInterval(check); resolve(); }, 10000);
  });

  const result = registerFaceBaseline(); // await 필요 없음, 동기 함수
  if (result && result.success) {
    goTo('p8');
  } else {
    const retry = confirm('얼굴을 인식하지 못했어요. 다시 시도할까요?');
    if (retry) await handleBaselineRegister();
  }
}

// ── P9 타이핑 ──
function focusTyping() {
  document.getElementById('typing-capture').focus();
}

function onType() {
  const ta = document.getElementById('typing-capture');
  const count = ta.value.length;
  state.charCount = count;
  document.getElementById('char-count').textContent = count;
  if (count >= 500) {
    ta.value = ta.value.slice(0, 500);
    document.getElementById('limit-popup').style.display = 'block';
  }
}

function endTyping() { goTo('p11'); }

// ── P11 → P12 / P14 ──
function finishAnimation() {
  if (state.privacy === 'private') goTo('p14');
  else goTo('p12');
}

function fillCompleteScreen() {
  document.getElementById('p12-nick').textContent = state.nickname;
  document.getElementById('p12-chars').textContent = state.charCount;
  document.getElementById('p12-privacy').textContent =
    state.privacy === 'public' ? '전체 공개' : '일부 공개';
}

function retryKnit() {
  state.charCount = 0;
  document.getElementById('typing-capture').value = '';
  document.getElementById('char-count').textContent = '0';
  document.getElementById('limit-popup').style.display = 'none';

  if (knitstampInputController) {
    knitstampInputController.lastRecordedAt = 0;
    knitstampInputController.currentSecondIndex = 0;
  }
  
  goTo('p9');
}

function unravelKnit() { goTo('p16'); }

// ── P12 등록 버튼 ──
function handleRegister() {
  if (!window.page_S5) return;
  const doUpload = () => window.page_S5.handleUpload(state.nickname, state.privacy);
  if (!window.page_S5.db) {
    window.page_S5.initDB().then(doUpload);
  } else {
    doUpload();
  }
}

// ── P18 카드 렌더링 ──
let _p18ScrollIndex = 0;
const P18_CARD_W = 250;
const P18_CARD_H_RATIO = 0.78; // scroll area 높이 대비

function renderP18Cards(pieces) {
  const track = document.getElementById('p18-track');
  const empty = document.getElementById('p18-empty');
  if (!track) return;

  track.innerHTML = '';
  _p18ScrollIndex = 0;
  _updateP18TrackPos();

  if (!pieces || pieces.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  // 카드 높이: 헤더(160px) 제외한 나머지, 위아래 여백 48px
  const CARD_H = 832-160-90;

  pieces.forEach((piece) => {
    const card = document.createElement('div');
    card.style.cssText = `
      flex: 0 0 ${P18_CARD_W}px;
      width: ${P18_CARD_W}px; 
      height: ${CARD_H}px;
      background: #e9e9e9;
      border-radius: 14px;
      position: relative;
      overflow: hidden;
      cursor: default;
      transition: transform 0.2s ease;
    `;
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-6px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    // 뜨개 패턴 canvas — 카드 실제 픽셀 크기로
    const cvs = document.createElement('canvas');
    cvs.width  = P18_CARD_W;
    cvs.height = CARD_H - 90; // 하단 라벨 영역 제외
    cvs.style.cssText = `
      display: block;
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: calc(100% - 60px);
    `;
    card.appendChild(cvs);

    // 하단 닉네임/날짜 라벨
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 48px;
      display: flex; align-items: center;
      padding: 0 16px;
      background: linear-gradient(transparent, rgba(232,229,224,0.95));
      font-size: 17px; color: #888;
      font-family: 'HSHwalkong', serif;
      letter-spacing: 0.04em;
      pointer-events: none;
    `;
    const nick = piece.nickname || '익명';
    const dateStr = piece.date
      ? new Date(piece.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
      : '';
    label.textContent = `${nick}  ${dateStr}`;
    card.appendChild(label);
    card.addEventListener('click', () => {
      openP18Overlay(piece, cvs);
    });
    track.appendChild(card);
    requestAnimationFrame(() => _drawCardPattern(cvs, piece));
  });
}

function _drawCardPattern(cvs, piece) {
  const ctx = cvs.getContext('2d');
  const W = cvs.width;
  const H = cvs.height;
  ctx.clearRect(0, 0, W, H);

  const gridData = piece.knitArray || piece.cells || [];
  if (!gridData.length) return;

  const SP = 24;    // spacing
  const CS = 19;    // cell size
  const startX = CS / 2 + 6;
  const startY = CS / 2 + 14;

  gridData.forEach((cell, idx) => {
    const col = idx % 10;
    const row = Math.floor(idx / 10);
    const px = startX + col * SP;
    const py = startY + row * SP;
    if (py > H + SP) return;

    // 색상
    let h, s, b, stitchH, stitchBri;
    if (cell.bgHue !== undefined) {
      h = cell.bgHue; s = cell.sat; b = cell.bgBri;
      stitchH = cell.stitchHue; stitchBri = cell.stitchBri;
    } else {
      // _knitCellColors는 p5 map()을 씀 — 여기선 직접 계산
      h = 154; s = 20; b = 65; stitchH = 184; stitchBri = 75;
    }

    const [bgR, bgG, bgBl] = _hsbToRgb(h, s / 100, b / 100);
    const [stR, stG, stBl] = _hsbToRgb(stitchH, s / 100, stitchBri / 100);

    const speed = cell.speed || 0;
    const tension = cell.tension !== undefined ? cell.tension : 0.5;
    const isFilled = speed >= 0.6;
    const actualSize = isFilled ? CS : CS - 4;

    if (cell.isBackspace) {
      ctx.strokeStyle = `rgb(${bgR},${bgG},${bgBl})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px - 9, py - 9); ctx.lineTo(px + 3, py);
      ctx.moveTo(px - 9, py + 9); ctx.lineTo(px + 2, py);
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    if (tension >= 0.5) {
      const r = 5, hw = actualSize / 2;
      ctx.roundRect(px - hw, py - hw, actualSize, actualSize, r);
    } else {
      ctx.arc(px, py, actualSize / 2, 0, Math.PI * 2);
    }
    if (isFilled) {
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgBl})`;
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgb(${bgR},${bgG},${bgBl})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 내부 패턴 (코 모양)
    const r2 = CS * 0.28;
    ctx.strokeStyle = `rgb(${stR},${stG},${stBl})`;
    ctx.lineWidth = 1.8;
    const eye = cell.eye || '';
    if (eye === 'FROWN' || eye === '찌푸림' || eye === '짜증') {
      ctx.beginPath();
      ctx.moveTo(px - r2, py - r2); ctx.lineTo(px + r2, py + r2);
      ctx.moveTo(px + r2, py - r2); ctx.lineTo(px - r2, py + r2);
      ctx.stroke();
    } else if (eye === 'SURPRISED' || eye === '놀람') {
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const rad = k % 2 === 0 ? r2 : r2 * 0.4;
        const angle = Math.PI / 4 * k;
        k === 0 ? ctx.moveTo(px + Math.cos(angle)*rad, py + Math.sin(angle)*rad)
                : ctx.lineTo(px + Math.cos(angle)*rad, py + Math.sin(angle)*rad);
      }
      ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(px - r2, py - r2 * 0.6);
      ctx.lineTo(px, py + r2 * 0.8);
      ctx.lineTo(px + r2, py - r2 * 0.6);
      ctx.stroke();
    }
  });
}

function _hsbToRgb(h, s, b) {
  // h: 0-360, s: 0-1, b: 0-1
  h = h / 60;
  const i = Math.floor(h);
  const f = h - i;
  const p = b * (1 - s);
  const q = b * (1 - s * f);
  const t = b * (1 - s * (1 - f));
  let r, g, bl;
  switch (i % 6) {
    case 0: r=b; g=t; bl=p; break;
    case 1: r=q; g=b; bl=p; break;
    case 2: r=p; g=b; bl=t; break;
    case 3: r=p; g=q; bl=b; break;
    case 4: r=t; g=p; bl=b; break;
    case 5: r=b; g=p; bl=q; break;
    default: r=g=bl=0;
  }
  return [Math.round(r*255), Math.round(g*255), Math.round(bl*255)];
}

// ── P18 스크롤 ──
function _updateP18TrackPos() {
  const track = document.getElementById('p18-track');
  if (!track) return;
  const shift = _p18ScrollIndex * (P18_CARD_W + 20);
  track.style.transform = `translateX(-${shift}px)`;
}

function p18ScrollLeft() {
  _p18ScrollIndex = Math.max(0, _p18ScrollIndex - 1);
  _updateP18TrackPos();
}

function p18ScrollRight() {
  const track = document.getElementById('p18-track');
  if (!track) return;
  const total   = track.children.length;
  const visible = Math.floor((1280 - 120) / (P18_CARD_W + 20));
  const maxIdx  = Math.max(0, total - visible);
  _p18ScrollIndex = Math.min(maxIdx, _p18ScrollIndex + 1);
  _updateP18TrackPos();
}

// ── P18 오버레이 (클릭 시 상세뷰) ──
function openP18Overlay(piece, sourceCvs) {
  closeP18Overlay();

  const p18 = document.getElementById('p18');
  if (!p18) return;

  // 반투명 배경
  const backdrop = document.createElement('div');
  backdrop.id = 'p18-overlay-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.3);
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 40px 0;
    box-sizing: border-box;
  `;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeP18Overlay();
  });

  // 오버레이 내부 패널 (카드와 동일 너비, 스크롤 가능)
  const panel = document.createElement('div');
  panel.style.cssText = `
    display: flex;
    flex-direction: row;
    gap: 32px;
    align-items: flex-start;
    pointer-events: auto;
    min-height : min-content;
  `;

  // 오버레이 카드 너비: 화면 높이 기준 비율 유지
  const CARD_H   = 832 - 160 - 90; // renderP18Cards와 동일한 값
  const overlayW = Math.round(P18_CARD_W * 1.5);

  // 패턴 실제 행 수로 높이 동적 계산
  const gridData = piece.knitArray || piece.cells || [];
  const totalRows = Math.ceil(gridData.length / 10);
  const SP = Math.floor((overlayW - 8) / 10);
  const overlayH = Math.max(832 - 80, totalRows * SP + SP);

  const bigCvs = document.createElement('canvas');
  bigCvs.width  = overlayW;
  bigCvs.height = overlayH;
  bigCvs.style.cssText = `
    display: block;
    border-radius: 14px;
    background: #E8E5E0;
    flex-shrink: 0;
    width: ${overlayW}px;
    height: ${overlayH}px;
  `;

  _p18DrawCardBig(bigCvs, piece, overlayW, overlayH);

  bigCvs.addEventListener('wheel', (e) => {
    backdrop.scrollTop += e.deltaY;
    e.preventDefault();
  }, { passive: false });

  panel.appendChild(bigCvs);

  // 우측 정보 패널
  const info = document.createElement('div');
  info.style.cssText = `
    min-width: 220px;
    background: rgba(255,255,255,0.92);
    border-radius: 14px;
    padding: 28px 24px;
    font-family: 'HSHwalkong', serif;
    pointer-events: auto;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  `;

  // 닉네임 + 날짜
  const nick = piece.nickname || '익명';
  const dateStr = piece.date
    ? new Date(piece.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '';
  info.innerHTML = `
    <div style="font-size:22px; font-weight:600; margin-bottom:6px;">${nick}</div>
    <div style="font-size:15px; color:#aaa; margin-bottom:24px;">${dateStr}</div>
  `;

  // 감정태그
  const tagMap = { FROWN:'찌푸림', SURPRISED:'놀람', BLURRY:'미묘함', NEUTRAL:'중립' };
  const eGroups = {};
  (piece.cells || []).forEach(c => {
    const t = c.emotionTagKo || tagMap[c.emotionTag] || c.emotionTag || '';
    if (!t || t === '중립' || t === 'NEUTRAL') return;
    if (!eGroups[t]) eGroups[t] = { sum: 0, n: 0 };
    eGroups[t].sum += (c.emotionIntensity || 0);
    eGroups[t].n++;
  });
  const eList = Object.entries(eGroups)
    .map(([k, v]) => ({ label: k, avg: v.n ? v.sum / v.n : 0 }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  // 감정태그 목록 렌더링
  const tagTitle = document.createElement('div');
  tagTitle.style.cssText = 'font-size:14px; font-weight:600; margin-bottom:10px; color:#333;';
  tagTitle.textContent = '[감정태그]';
  info.appendChild(tagTitle);

  if (eList.length === 0) {
    const none = document.createElement('div');
    none.style.cssText = 'font-size:13px; color:#bbb;';
    none.textContent = '기록된 태그 없음';
    info.appendChild(none);
  } else {
    eList.forEach(e => {
      const row = document.createElement('div');
      row.style.cssText = 'font-size:14px; color:#666; margin-bottom:4px;';
      row.textContent = `• ${e.label}  ${e.avg.toFixed(2)}`;
      info.appendChild(row);
    });
  }

  // 구분선
  const hr = document.createElement('div');
  hr.style.cssText = 'border-top:1px solid #e0e0e0; margin:20px 0;';
  info.appendChild(hr);

  // 텍스트 보기 체크박스
  const cbWrap = document.createElement('label');
  cbWrap.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:#555;';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = false;
  cb.style.cssText = 'width:16px; height:16px; cursor:pointer;';
  cb.addEventListener('change', () => {
    _p18DrawCardBig(bigCvs, piece, overlayW, overlayH, cb.checked);
  });
  cbWrap.appendChild(cb);
  cbWrap.appendChild(document.createTextNode('텍스트 보기'));
  info.appendChild(cbWrap);

  panel.appendChild(info);
  backdrop.appendChild(panel);
  p18.appendChild(backdrop);
}

function closeP18Overlay() {
  const backdrop = document.getElementById('p18-overlay-backdrop');
  if (backdrop) backdrop.remove();
}

function _p18DrawCardBig(cvs, piece, W, H, showText) {
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#E8E5E0';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 14);
  ctx.fill();

  const gridData = piece.knitArray || piece.cells || [];
  if (!gridData.length) return;

  const SP     = Math.floor((W - 8) / 10);
  const CS     = SP - 4;
  const startX = SP / 2 + 4;
  const startY = SP / 2 + 10;

  gridData.forEach((cell, idx) => {
    const col = idx % 10;
    const row = Math.floor(idx / 10);
    const px  = startX + col * SP;
    const py  = startY + row * SP;
    if (py > H + SP) return;

    let h, s, b, stitchH, stitchBri;
    if (cell.bgHue !== undefined) {
      h = cell.bgHue; s = cell.sat; b = cell.bgBri;
      stitchH = cell.stitchHue; stitchBri = cell.stitchBri;
    } else {
      h = 154; s = 20; b = 65; stitchH = 184; stitchBri = 75;
    }

    const [bgR, bgG, bgBl] = _hsbToRgb(h, s / 100, b / 100);
    const [stR, stG, stBl] = _hsbToRgb(stitchH, s / 100, stitchBri / 100);

    const speed      = cell.speed   || 0;
    const tension    = cell.tension !== undefined ? cell.tension : 0.5;
    const isFilled   = speed >= 0.6;
    const actualSize = isFilled ? CS : CS - 3;

    if (cell.isBackspace) {
      ctx.strokeStyle = `rgb(${bgR},${bgG},${bgBl})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - CS*0.4, py - CS*0.4); ctx.lineTo(px + CS*0.15, py);
      ctx.moveTo(px - CS*0.4, py + CS*0.4); ctx.lineTo(px + CS*0.1,  py);
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    const hw = actualSize / 2;
    if (tension >= 0.5) {
      ctx.roundRect(px - hw, py - hw, actualSize, actualSize, 5);
    } else {
      ctx.arc(px, py, hw, 0, Math.PI * 2);
    }
    if (isFilled) {
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgBl})`;
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgb(${bgR},${bgG},${bgBl})`;
      ctx.lineWidth = Math.max(1, SP * 0.08);
      ctx.stroke();
    }

    const r2 = CS * 0.28;
    ctx.strokeStyle = `rgb(${stR},${stG},${stBl})`;
    ctx.lineWidth = Math.max(1.5, CS * 0.1);
    const eye = cell.eye || '';
    if (eye === 'FROWN' || eye === '찌푸림' || eye === '짜증') {
      ctx.beginPath();
      ctx.moveTo(px - r2, py - r2); ctx.lineTo(px + r2, py + r2);
      ctx.moveTo(px + r2, py - r2); ctx.lineTo(px - r2, py + r2);
      ctx.stroke();
    } else if (eye === 'SURPRISED' || eye === '놀람') {
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const rad   = k % 2 === 0 ? r2 : r2 * 0.4;
        const angle = (Math.PI / 4) * k;
        k === 0
          ? ctx.moveTo(px + Math.cos(angle)*rad, py + Math.sin(angle)*rad)
          : ctx.lineTo(px + Math.cos(angle)*rad, py + Math.sin(angle)*rad);
      }
      ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(px - r2, py - r2 * 0.6);
      ctx.lineTo(px,      py + r2 * 0.8);
      ctx.lineTo(px + r2, py - r2 * 0.6);
      ctx.stroke();
    }

    if (showText && cell.text && cell.text.trim().length > 0 && piece.privacy !== 'private') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.font = `bold ${Math.round(CS * 0.55)}px 'HSHwalkong', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.text.trim()[0], px, py + 1);
    }
  });
}