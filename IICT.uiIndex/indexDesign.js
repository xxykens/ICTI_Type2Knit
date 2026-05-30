const state = {
  nickname: '',
  privacy: 'public',
  charCount: 0,
  currentScreen: 'p1'
};

// ── 화면 전환 ──
function goTo(id) {
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
  if (id === 'p6') startIntro(['p6-l1','p6-l2','p6-l3','p6-l4'], null);
  if (id === 'p7') setTimeout(() => goTo('p8'), 3000);
  if (id === 'p8') setTimeout(() => goTo('p9'), 2500);

  // ─── P9 진입: KnitstampInput 초기화 + 타이핑 루프 시작 ───
  if (id === 'p9') {
    setTimeout(focusTyping, 300);

    // setupKnitstampInput()은 앱 최초 진입 시 1회만 호출
    // 이미 초기화됐으면 다시 호출하지 않도록 플래그 사용
    if (!state._knitstampReady && typeof setupKnitstampInput === 'function') {
      setupKnitstampInput();
      state._knitstampReady = true;
    }

    // updateKnitstampInput()을 1초마다 반복 호출 (draw() 역할)
    if (state._knitstampInterval) clearInterval(state._knitstampInterval);
    state._knitstampInterval = setInterval(() => {
      if (typeof updateKnitstampInput === 'function') {
        updateKnitstampInput();
      }
    }, 1000);
  }

  if (id === 'p11') {
    // 타이핑 끝나면 루프 정지
    if (state._knitstampInterval) {
      clearInterval(state._knitstampInterval);
      state._knitstampInterval = null;
    }
    setTimeout(finishAnimation, 2800);
  }

  if (id === 'p12') fillCompleteScreen();
  if (id === 'p14') document.getElementById('p14-chars').textContent = state.charCount;
  if (id === 'p16') {
    setTimeout(() => {
      const txt = document.getElementById('p16-text');
      txt.style.opacity = '0';
      setTimeout(() => goTo('p17'), 4000);
    }, 5000);
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
      if (i === lineIds.length - 1 && callback) {
        setTimeout(callback, 3000);
      }
    }, delay);
    delay += 700;
  });
}

// ── P2 닉네임 / 공개 설정 ──
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
    input.value = '';
    input.disabled = true;
    input.placeholder = '닉네임이 남지 않아요';
    document.getElementById('nickname-count').textContent = '(0/12)';
  } else {
    input.disabled = false;
    input.placeholder = '닉네임 입력 (최대 12자)';
  }
}

function confirmP2() {
  state.nickname = state.privacy === 'private'
    ? ''
    : (document.getElementById('nickname-input').value || '익명');
  goTo('p3');
}

// ── P6: 기준 표정 등록 ──
// registerFaceBaseline()은 P6의 start.png 버튼 클릭 시 호출
// 반환값: { success: true, baseline: {...} } 또는 { success: false, baseline: "NO_FACE" }
async function handleBaselineRegister() {
  if (typeof registerFaceBaseline !== 'function') {
    // KnitstampInputController.js 로드 전이면 그냥 P7으로 진행
    goTo('p7');
    return;
  }
  const result = await registerFaceBaseline();
  if (result.success) {
    goTo('p7');
  } else {
    // 얼굴 감지 실패: 안내 후 재시도 유도 (필요시 토스트 추가 가능)
    alert('얼굴을 인식하지 못했어요. 정면을 바라봐 주세요.');
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

  // 주희님: 키 입력마다 recordKnitstampKey() 호출 (keypressed() 역할)
  if (typeof recordKnitstampKey === 'function') {
    recordKnitstampKey();
  }

  if (count >= 500) {
    ta.value = ta.value.slice(0, 500);
    document.getElementById('limit-popup').style.display = 'block';
  }
}

function getLatestKnitstampSecond() {
  if (!window.knitstamp || !window.knitstamp.seconds) return null;
  const seconds = window.knitstamp.seconds;
  if (seconds.length === 0) return null;
  return seconds[seconds.length - 1]; // 가장 최신 second
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

// ── 재시도 ──
function retryKnit() {
  state.charCount = 0;
  document.getElementById('typing-capture').value = '';
  document.getElementById('char-count').textContent = '0';
  goTo('p9');
}

// ── 비공개 해산 ──
function unravelKnit() { goTo('p16'); }