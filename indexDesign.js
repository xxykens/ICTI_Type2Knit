const state = {
  nickname: '',
  privacy: 'public',
  charCount: 0,
  currentScreen: 'p1',
  p9Hint: null,
  p7MessageTimer: null
};
window.state = state;
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  const qrBackdrop = document.getElementById('knit-qr-backdrop');
  if (qrBackdrop && qrBackdrop.classList.contains('is-visible')) {
    closeKnitQrPopup();
    return;
  }

  if (document.getElementById('p18-overlay-backdrop')) {
    closeP18Overlay();
  }
});

document.addEventListener('click', (e) => {
  const qrBackdrop = document.getElementById('knit-qr-backdrop');
  if (qrBackdrop && e.target === qrBackdrop) closeKnitQrPopup();
});

// ── 화면 전환 ──
function goTo(id) {
  if (state.currentScreen === 'p9' && id !== 'p9') {
    if (typeof window.knitSketch_onP9Leave === 'function') window.knitSketch_onP9Leave();
  }
  if (state.currentScreen === 'p18' && id !== 'p18') {
    if (typeof window.knitSketch_onP18Leave === 'function') window.knitSketch_onP18Leave();
  }

  const cur = document.getElementById(state.currentScreen);
  const next = document.getElementById(id);
  if (!next) return;
  cur.classList.remove('active');
  cur.style.display = 'none';
  next.style.display = id === 'p10' ? 'grid' : 'flex';
  next.classList.add('active');
  state.currentScreen = id;
  document.body.classList.toggle('is-landing', id === 'p1');
  document.body.classList.toggle('is-preview', id === 'p10');
  setFaceRecognitionPreviewScreen(id);
  onScreenEnter(id);
}

function setFaceRecognitionPreviewScreen(id) {
  const tracker = knitstampInputController?.faceTracker;
  if (tracker && typeof tracker.setPreviewScreen === 'function') {
    tracker.setPreviewScreen(id);
  }
}

function onScreenEnter(id) {
  if (id === 'p1') {
    state.charCount = 0;
    document.getElementById('typing-capture').value = '';
    document.getElementById('char-count').textContent = '0';
    document.getElementById('limit-popup').style.display = 'none';
  }
  if (id === 'p2') {
    const input = document.getElementById('nickname-input');
    if (input) { input.value = ''; input.disabled = false; input.placeholder = '닉네임 입력 (최대 12자)'; }
    const countEl = document.getElementById('nickname-count');
    if (countEl) countEl.textContent = '(0/12)';
    state.nickname = '';
    state.privacy = 'public';
    ['public', 'partial', 'private'].forEach(t =>
      document.getElementById('card-' + t).classList.toggle('selected', t === 'public')
    );
  }
  if (id === 'p3') startIntro(['p3-l1','p3-l2','p3-l3','p3-l4'], () => goTo('p4'));
  if (id === 'p4') startIntro(['p4-l1','p4-l2','p4-l3','p4-l4','p4-l5'], () => goTo('p5'));
  if (id === 'p5') startIntro(['p5-l1','p5-l2','p5-l3','p5-l4'], () => goTo('p6'));
  if (id === 'p6') {
    startIntro(['p6-l1','p6-l2','p6-l3','p6-l4'], () => {
      document.getElementById('p6-start-btn').style.display = 'block';
    });
    /*
    // p7 진입 전 JSON만 미리 fetch (덜컥임 방지)
    if (!window._p7AnimData) {
      fetch('images/face_loading.json')
        .then(r => r.json())
        .then(animData => {
          if (animData.assets) {
            animData.assets.forEach(asset => {
              if (asset.p && asset.p.startsWith('data:')) asset.e = 1;
            });
          }
          window._p7AnimData = animData;
        });
    }
    */
  }

  if (id === 'p7') {
    knitstampInputController.faceTracker.baseline = null;

    /*
    // Lottie 초기화 (p7이 visible 상태일 때 loadAnimation)
    const lottieContainer = document.getElementById('p7-lottie');
    if (lottieContainer) {
      if (window._p7Lottie) {
        window._p7Lottie.goToAndPlay(0, true);
      } else if (window._p7AnimData) {
        window._p7Lottie = lottie.loadAnimation({
          container: lottieContainer,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: window._p7AnimData
        });
      } else {
        // p6를 건너뛰고 바로 p7 진입한 경우 fallback
        fetch('images/face_loading.json')
          .then(r => r.json())
          .then(animData => {
            if (animData.assets) {
              animData.assets.forEach(asset => {
                if (asset.p && asset.p.startsWith('data:')) asset.e = 1;
              });
            }
            window._p7AnimData = animData;
            window._p7Lottie = lottie.loadAnimation({
              container: lottieContainer,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: animData
            });
          });
      }
    }
    */

    // 재진입 시 실패 화면 초기화
    const measuringEl = document.getElementById('p7-measuring');
    const failEl = document.getElementById('p7-fail');
    if (measuringEl) measuringEl.style.display = '';
    if (failEl) failEl.style.display = 'none';
    startCalibrationMessageAnimation();

    /*
    let count = P7_CALIBRATION_DURATION_SECONDS;
    const countEl = document.getElementById('p7-countdown');
    renderP7Countdown(countEl, count);

    const countInterval = setInterval(() => {
      if (state.currentScreen !== 'p7') { clearInterval(countInterval); return; }
      count--;
      if (count <= 0) {
        clearInterval(countInterval);
        return;
      }
      renderP7Countdown(countEl, count);
    }, 1000);
    */

    setTimeout(() => {
      if (state.currentScreen !== 'p7') return;
      // if (countEl) countEl.textContent = '';
      const messageEl = document.getElementById('p7-face-message');
      const registrationMessageTimeout = setTimeout(() => {
        if (state.currentScreen !== 'p7' || !messageEl) return;
        messageEl.textContent = '기준표정을 등록하고 있어요.';
        messageEl.classList.remove('animated-message', 'is-final-message');
      }, 2000);

      const updateInterval = setInterval(() => {
        if (typeof registerFaceBaseline === 'function') {
          const result = registerFaceBaseline();
          if (result && result.success) {
            clearInterval(updateInterval);
            clearTimeout(failTimeout);
            clearTimeout(registrationMessageTimeout);
            if (state.currentScreen === 'p7') goTo('p8');
          }
        }
      }, 300);

      // 15초 후 인식 실패 처리
      const failTimeout = setTimeout(() => {
        if (state.currentScreen !== 'p7') return;
        clearInterval(updateInterval);
        clearTimeout(registrationMessageTimeout);
        showP7Fail();
      }, 15000);

    }, P7_CALIBRATION_DURATION_SECONDS * 1000);
  }

  if (id === 'p8') {
    // p8: 2.5초 후 p9로 이동
    setTimeout(() => goTo('p9'), 2500);
  }

  if (id === 'p9') {
    resetTypingHint();
    setTimeout(focusTyping, 300);
    if (typeof window.knitSketch_onP9Enter === 'function') window.knitSketch_onP9Enter();
    // knitstamp 루프는 p7부터 이미 돌고 있음 — 여기선 시작만 확인
    startKnitstampLoop();
  }

  if (id === 'p10') {
    if (window.page_S10 && typeof window.page_S10.render === 'function') {
      window.page_S10.render();
    }
  }

  if (id === 'p19') {
    if (window.page_S19 && typeof window.page_S19.render === 'function') {
      window.page_S19.render();
    }
  }

  if (id === 'p11') {
    stopKnitstampLoop();
    setTimeout(finishAnimation, 2800);
  }

  if (id === 'p18') {
    if (typeof window.knitSketch_onP18Enter === 'function') window.knitSketch_onP18Enter();
    if (!window.page_S7_S8 || !window.page_S5) return;
    const doLoad = () => {
      // 아카이브 진입마다 비어있는지 확인 후 디폴트 예시 3개를 재등록 (DB가 외부에서 초기화된 경우 자가복구)
      window.page_S5.seedDefaultArchive().then(() => {
        window.page_S7_S8.loadDataFromDB().then((pieces) => {
          renderP18Cards(pieces);
        });
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
    fillPrivateCompleteScreen();
    setTimeout(() => {
      if (typeof window.knitSketch_renderPreview === 'function') window.knitSketch_renderPreview();
    }, 100);
  }
  if (id === 'p16') {
    _cleanupP16();
    const textEl = document.getElementById('p16-text');
    textEl.style.transition = 'none';
    textEl.style.opacity = '1';

    const t1 = setTimeout(() => {
      textEl.style.transition = 'opacity 1.5s';
      textEl.style.opacity = '0';
      const t2 = setTimeout(() => startP16UnravelAnimation(), 1800);
      window._p16Timers.push(t2);
    }, 5000);
    window._p16Timers.push(t1);
  }
}

const P7_CALIBRATION_DURATION_SECONDS = 6;
const P7_CALIBRATION_MESSAGE_INTERVAL_MS = 2000;
const P7_CALIBRATION_MESSAGES = [
  '정면을 바라보고 무표정을 유지해주세요.',
  '얼굴 정보는 저장되지 않습니다.',
  '이제 기준표정을 등록할게요.'
];

/*
function renderP7Countdown(countEl, count) {
  if (!countEl) return;
  countEl.innerHTML = `
    <span class="face-countdown-number">${count}</span>
    <span class="face-countdown-label">초 후 기준 표정이 인식됩니다</span>
  `;
}
*/

function startCalibrationMessageAnimation() {
  const messageEl = document.getElementById('p7-face-message');
  if (!messageEl) return;

  if (state.p7MessageTimer) {
    clearTimeout(state.p7MessageTimer);
    state.p7MessageTimer = null;
  }

  let index = 0;
  function showMessage() {
    if (state.currentScreen !== 'p7') return;

    const isFinalMessage = index === P7_CALIBRATION_MESSAGES.length - 1;
    messageEl.innerHTML = P7_CALIBRATION_MESSAGES[index];
    messageEl.classList.remove('animated-message', 'is-final-message');
    void messageEl.offsetWidth;
    messageEl.classList.add('animated-message');
    if (isFinalMessage) messageEl.classList.add('is-final-message');

    index += 1;
    if (index < P7_CALIBRATION_MESSAGES.length) {
      state.p7MessageTimer = setTimeout(showMessage, P7_CALIBRATION_MESSAGE_INTERVAL_MS);
    } else {
      state.p7MessageTimer = null;
    }
  }

  showMessage();
}

// ── P7 인식 실패 처리 ──
function showP7Fail() {
  const measuringEl = document.getElementById('p7-measuring');
  const failEl = document.getElementById('p7-fail');
  if (measuringEl) measuringEl.style.display = 'none';
  if (failEl) failEl.style.display = 'flex';

  let failCount = 5;
  const failCountEl = document.getElementById('p7-fail-countdown');
  if (failCountEl) failCountEl.textContent = `${failCount}초 후 홈으로 돌아갑니다.`;

  const failCountInterval = setInterval(() => {
    if (state.currentScreen !== 'p7') { clearInterval(failCountInterval); return; }
    failCount--;
    if (failCountEl) failCountEl.textContent = `${failCount}초 후 홈으로 돌아갑니다.`;
    if (failCount <= 0) {
      clearInterval(failCountInterval);
      goTo('p1');
    }
  }, 1000);
}

// ── knitstamp 루프 관리 ──
function startKnitstampLoop() {
  if (state._knitstampInterval) return; // 이미 돌고 있으면 중복 시작 안 함
  state._knitstampInterval = setInterval(() => {
    if (typeof updateKnitstampInput === 'function') updateKnitstampInput();
    updateTypingHint();
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
// 사용자의 현재 입력(글자 수) 상태에 따라 달라지는 안내 문구.
// 각 구간은 minCount(이 글자 수 이상일 때 적용)로 정의되며,
// 내림차순으로 정렬되어 현재 글자 수에 맞는 첫 구간이 선택된다.
const END_BUTTON_VISIBLE_COUNT = 100; // 종료 버튼이 뜨기 시작하는 최소 글자 수
const END_HINT_MIN_COUNT = 200; // 종료 안내 문구가 뜨는 최소 글자 수

const TYPING_HINT_STAGES = [
  {
    kind: 'base',
    minCount: 0,
    line1: '문장을 이어가면 새로운 짜임이 만들어져요.',
    line2: '지금 떠오르는 감정을 적어보세요.'
  },
  {
    kind: 'base',
    minCount: 20,
    line1: '계속 타이핑해보세요.',
    line2: '글과 표정이 쌓일수록 패턴이 더 풍부해져요.'
  },
  {
    kind: 'calmPattern',
    minCount: 70,
    line1: '색과 패턴을 더 다양하게 만들고 싶다면',
    line2: '눈썹, 입꼬리, 시선을 조금씩 바꾸며 글자를 입력해보세요.'
  },
  {
    kind: 'calmPattern',
    minCount: 130,
    line1: '표정과 글이 함께 움직이면',
    line2: '색과 무늬가 더 풍부하게 이어져요.'
  },
  {
    kind: 'slow',
    minCount: END_HINT_MIN_COUNT,
    line1: '이제 충분히 많은 마음을 짜냈어요.',
    line2: '마음껏 감정을 표출하고 종료 버튼을 눌러도 좋아요.'
  }
];

// 200자 이상에서 일정 시간 입력이 멈추면 보여줄 종료 유도 문구
const TYPING_IDLE_MS = 3000; // 마지막 입력 후 이 시간 이상 멈추면 idle
const TYPING_HINT_IDLE_MESSAGE = {
  kind: 'slow',
  line1: '더 쓸 말이 없다면',
  line2: '종료 버튼을 눌러 끝내도 좋아요.'
};

const TYPING_HINT_FADE_MS = 360;

function createTypingHintState() {
  const now = Date.now();
  return {
    enteredAt: now,
    lastTypedAt: now,
    lastHintKey: '',
    transitionTimer: null
  };
}

function resetTypingHint() {
  if (state.p9Hint?.transitionTimer) {
    clearTimeout(state.p9Hint.transitionTimer);
  }
  state.p9Hint = createTypingHintState();
  state.charCount = 0;
  const charCountEl = document.getElementById('char-count');
  if (charCountEl) charCountEl.textContent = '0';
  updateEndButtonVisibility(0);
  updateTypingHint({ force: true });
}

function getTypingHintState() {
  if (!state.p9Hint) state.p9Hint = createTypingHintState();
  return state.p9Hint;
}

function pickHintByCharCount(count, isIdle) {
  // 200자 이상이고 일정 시간 입력이 멈췄으면 종료 유도 문구를 보여준다.
  if (count >= END_HINT_MIN_COUNT && isIdle) return TYPING_HINT_IDLE_MESSAGE;
  // minCount 내림차순으로 현재 글자 수에 맞는 첫 구간을 찾는다.
  for (let i = TYPING_HINT_STAGES.length - 1; i >= 0; i--) {
    if (count >= TYPING_HINT_STAGES[i].minCount) return TYPING_HINT_STAGES[i];
  }
  return TYPING_HINT_STAGES[0];
}

function applyTypingHintText(hintEl, line1El, line2El, message) {
  hintEl.dataset.hintKind = message.kind;
  line1El.textContent = message.line1;
  line2El.textContent = message.line2;
}

function updateTypingHint(options = {}) {
  if (state.currentScreen !== 'p9') return;

  const hintEl = document.getElementById('typing-hint');
  const line1El = document.getElementById('typing-hint-line-1');
  const line2El = document.getElementById('typing-hint-line-2');
  if (!hintEl || !line1El || !line2El) return;

  const hintState = getTypingHintState();
  const count = state.charCount || 0;
  const isIdle = (Date.now() - hintState.lastTypedAt) >= TYPING_IDLE_MS;
  const message = pickHintByCharCount(count, isIdle);

  const hintKey = `${message.kind}:${message.line1}:${message.line2}`;
  if (hintState.lastHintKey === hintKey) return;

  hintState.lastHintKey = hintKey;

  if (hintState.transitionTimer) {
    clearTimeout(hintState.transitionTimer);
    hintState.transitionTimer = null;
  }

  if (options.force) {
    hintEl.classList.remove('is-changing');
    applyTypingHintText(hintEl, line1El, line2El, message);
    return;
  }

  hintEl.classList.add('is-changing');
  hintState.transitionTimer = setTimeout(() => {
    if (state.currentScreen !== 'p9') {
      hintState.transitionTimer = null;
      return;
    }

    applyTypingHintText(hintEl, line1El, line2El, message);
    requestAnimationFrame(() => {
      hintEl.classList.remove('is-changing');
      hintState.transitionTimer = null;
    });
  }, TYPING_HINT_FADE_MS);
}

function focusTyping() {
  document.getElementById('typing-capture').focus();
}

function onType() {
  const ta = document.getElementById('typing-capture');
  let count = ta.value.length;
  if (count >= 500) {
    ta.value = ta.value.slice(0, 500);
    count = ta.value.length;
    document.getElementById('limit-popup').style.display = 'block';
  }

  state.charCount = count;
  document.getElementById('char-count').textContent = count;
  const hintState = getTypingHintState();
  hintState.lastTypedAt = Date.now();
  updateEndButtonVisibility(count);
  updateTypingHint();
}

// 종료 버튼은 일정 글자 수 이상 입력했을 때만 노출한다.
function updateEndButtonVisibility(count) {
  const endBtn = document.querySelector('#p9 .end-btn');
  if (!endBtn) return;
  const isVisible = count >= END_BUTTON_VISIBLE_COUNT;
  endBtn.classList.toggle('is-visible', isVisible);
  endBtn.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

function endTyping() { goTo('p11'); }


(function() {
  const ta = document.getElementById('typing-capture');
  const indicator = document.getElementById('lang-indicator');

let isKorean = true;

function set(korean) {
  isKorean = korean;
  if (indicator) indicator.textContent = korean ? '한글' : 'ENG';
}

set(true);

if (ta) {
  let isComposing = false;

  ta.addEventListener('compositionstart', () => {
    isComposing = true;
    set(true);
  });

  ta.addEventListener('compositionend', () => {
    isComposing = false;
  });

  ta.addEventListener('keydown', function(e) {
    // 조합 중이면 무시
    if (isComposing) return;
    // 문자 키가 아니면 무시 (화살표, shift 등)
    if (e.key.length !== 1) return;
    // 문장부호/특수문자면 무시
    if (/[^\p{L}\p{N}]/u.test(e.key)) return;

    // 조합 없이 ASCII 문자 → 영문 모드
    if (/^[\x00-\x7F]$/.test(e.key)) {
      set(false);
    }
  });
}
})();

// ── P11 → P12 / P14 ──
function finishAnimation() {
  if (state.privacy === 'private') goTo('p14');
  else goTo('p12');
}

function fillCompleteScreen() {
  fillCompleteDetails('p12');
}

function fillPrivateCompleteScreen() {
  fillCompleteDetails('p14');
}

function _createCompletePreviewPiece() {
  if (typeof KnitPiece !== 'function') return null;

  const nickname = state.privacy === 'private' ? '익명' : (state.nickname || '익명');
  const piece = new KnitPiece(nickname, state.privacy);
  piece.absorbArchiveData(window.archiveData || []);
  window._knitSketchPreviewPiece = piece;
  return piece;
}

function _formatCompleteDate(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function _normalizeCompleteEmotionTag(cell) {
  const tagMap = {
    FROWN: '짜증',
    SURPRISED: '놀람',
    BLURRY: '미묘함',
    NEUTRAL: '중립',
    '찌푸림': '짜증',
    '미묘': '미묘함'
  };
  const raw = cell.emotionTagKo || tagMap[cell.emotionTag] || tagMap[cell.eye] || cell.emotionTag || cell.eye || '';
  return tagMap[raw] || raw;
}

function _getCompleteEmotionStats(piece) {
  const groups = {};
  const order = [];
  const cells = piece ? (piece.cells || piece.knitArray || []) : [];

  cells.forEach((cell) => {
    const tag = _normalizeCompleteEmotionTag(cell);
    if (!tag || tag === '중립' || tag === 'NEUTRAL') return;

    if (!groups[tag]) {
      groups[tag] = { label: tag, count: 0, intensitySum: 0 };
      order.push(tag);
    }

    const intensity = typeof cell.emotionIntensity === 'number'
      ? cell.emotionIntensity
      : (typeof cell.tension === 'number' ? cell.tension : 0);

    groups[tag].count += 1;
    groups[tag].intensitySum += intensity;
  });

  return order
    .map((tag) => ({
      label: tag,
      count: groups[tag].count,
      avg: groups[tag].count ? groups[tag].intensitySum / groups[tag].count : 0
    }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg);
}

function _getCompleteAverageTypingSpeed(piece) {
  const cells = piece ? (piece.cells || piece.knitArray || []) : [];
  let sum = 0;
  let count = 0;

  cells.forEach((cell) => {
    const speed = typeof cell.speed === 'number' ? cell.speed : cell.typingSpeed;
    if (typeof speed !== 'number') return;
    sum += speed;
    count += 1;
  });

  return count ? sum / count : 0;
}

function _formatCompleteAverageSpeed(avgSpeed) {
  if (!avgSpeed) return '기록 없음';
  let label = '보통';
  if (avgSpeed >= 0.6) label = '빠름';
  else if (avgSpeed < 0.4) label = '느림';
  return `${label} ${Math.round(avgSpeed * 100)}%`;
}

// 배열을 제자리에서 뒤섞은 새 배열을 반환 (Fisher-Yates)
function _shuffleArray(arr) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 최종 텍스트에서 '오늘'과 '{nickname}님'이 각각 한 번씩만 등장하도록 중복 제거
function _filterDuplicateTerms(text, nickname) {
  const nicknameEsc = nickname ? nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
  let todaySeen = false;
  let nickSeen = false;

  return text.split(/(?<=[.!?])\s+/).map(s => {
    let m = s;

    if (nicknameEsc && m.includes(nickname + '님')) {
      if (nickSeen) {
        m = m
          .replace(new RegExp(nicknameEsc + '님[은이을가]?\\s*', 'g'), '')
          .replace(/,\s*([.!?])/g, '$1')
          .replace(/,\s*$/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        nickSeen = true;
      }
    }

    if (m.includes('오늘')) {
      if (todaySeen) {
        m = m.replace(/오늘은?\s*/g, '').replace(/\s+/g, ' ').trim();
      } else {
        todaySeen = true;
      }
    }

    return m;
  }).filter(s => s.trim()).join(' ');
}

const KNITSTAMP_CHAR_COUNT_THRESHOLD = 150; // 글자 수 많음/적음 기준
const KNITSTAMP_SPEED_VERY_SLOW = 0.15;     // 포문 B로 전환되는 "현저히 느림" 기준
const KNITSTAMP_SPEED_SLOW = 0.4;           // [3] 느림 문장 기준
const KNITSTAMP_SPEED_FAST = 0.6;           // [3] 빠름 문장 기준
const KNITSTAMP_POS_EMOTION_TAGS = ['해탈', '미묘함'];
const KNITSTAMP_NEG_EMOTION_TAGS = ['짜증', '놀람', '슬픔', '긴장'];

// Knitstamp 최종 메시지: [1] 포문 + [2] 감정 태그 문장 + [3] 추가 문장을 블록 단위로 셔플해 조합
function _buildKnitstampFinalMessage(piece, charCountOverride) {
  const cells = piece ? (piece.cells || piece.knitArray || []) : [];
  if (!cells.length) return '기록된 감정 정보가 부족해요.';

  const nickname = piece.privacy === 'private' ? '익명의 니터' : (piece.nickname || '익명');

  // 감정 태그 집계: 등장 순서(emoOrder, 2개 태그 변화 표현용)와 비중 순위(byCount, 지배 감정 판단용)
  let emoOrder = [];
  let emoCount = {};
  let posCount = 0, negCount = 0;
  let speedSum = 0, speedN = 0;
  let charCount = 0;

  cells.forEach((cell) => {
    const tag = _normalizeCompleteEmotionTag(cell);
    if (tag && tag !== '중립' && tag !== 'NEUTRAL') {
      if (!emoCount[tag]) { emoCount[tag] = 0; emoOrder.push(tag); }
      emoCount[tag]++;
      if (KNITSTAMP_POS_EMOTION_TAGS.indexOf(tag) !== -1) posCount++;
      else if (KNITSTAMP_NEG_EMOTION_TAGS.indexOf(tag) !== -1) negCount++;
    }

    const speed = typeof cell.speed === 'number' ? cell.speed : cell.typingSpeed;
    if (typeof speed === 'number') { speedSum += speed; speedN++; }

    charCount += cell.syllables || 0;
  });

  if (typeof charCountOverride === 'number') charCount = charCountOverride;

  const avgSpeed = speedN ? speedSum / speedN : 0;
  const byCount = Object.keys(emoCount).sort((a, b) => emoCount[b] - emoCount[a]);
  const tagCount = byCount.length;

  // [1] 포문: A(글자 수, 항상 첫 문장) + C(시간대) 또는 B(타이핑 속도 현저히 느림일 때만 C 대신)
  const sentenceA = charCount >= KNITSTAMP_CHAR_COUNT_THRESHOLD
    ? `오늘 ${nickname}님은 참 많은 이야기를 써내려가셨어요.`
    : `오늘 ${nickname}님은 짧지만 선명한 감정을 남기셨어요.`;

  const isVerySlow = avgSpeed > 0 && avgSpeed < KNITSTAMP_SPEED_VERY_SLOW;
  let sentenceCorB;
  if (isVerySlow) {
    sentenceCorB = `오늘은 천천히, 조심스럽게 한 자 한 자 써내려가셨군요, ${nickname}님.`;
  } else {
    const hour = (piece.date ? new Date(piece.date) : new Date()).getHours();
    if (hour >= 5 && hour <= 11) {
      sentenceCorB = `아침부터 감정을 꺼내셨군요, ${nickname}님.`;
    } else if (hour >= 12 && hour <= 17) {
      sentenceCorB = `하루 한가운데서 잠깐 멈추어 내면을 들여다보셨네요, ${nickname}님.`;
    } else if (hour >= 18 && hour <= 22) {
      sentenceCorB = `하루를 마무리하며 감정을 정리하셨군요, ${nickname}님.`;
    } else {
      sentenceCorB = `고요한 밤에 감정을 꺼내셨네요, ${nickname}님.`;
    }
  }
  const block1 = `${sentenceA} ${sentenceCorB}`;

  // [2] 감정 태그 기반 문장
  let block2 = '';
  if (tagCount === 1) {
    block2 = `지배적인 감정은 ${byCount[0]}입니다. 오늘 그럴만한 일이 있으셨나봐요.`;
  } else if (tagCount === 2) {
    block2 = `${emoOrder[0]}에서 ${emoOrder[1]}로 감정이 변화하는 것을 보았어요.`;
  } else if (tagCount >= 3) {
    const polarity = posCount >= negCount ? '긍정' : '부정';
    block2 = _shuffleArray([
      `지배적인 감정은 ${byCount[0]}입니다.`,
      `${byCount[1]}, ${byCount[2]}도 함께 묻어나는 복합적인 하루였네요.`,
      `전체적으로는 주로 ${polarity}적인 감정이 많이 담겼어요.`
    ]).join(' ');
  }

  // [3] 추가 문장: 타이핑 속도 기반 (B가 선택된 경우 느림 문장은 중복되므로 생략)
  let block3 = '';
  if (avgSpeed >= KNITSTAMP_SPEED_FAST) {
    block3 = '오늘은 속도감 있게 마음 속의 말을 풀어내셨군요.';
  } else if (avgSpeed > 0 && avgSpeed < KNITSTAMP_SPEED_SLOW && !isVerySlow) {
    block3 = '천천히 꺼내야 하는 감정이었나봐요.';
  }

  const shuffled = _shuffleArray([block1, block2, block3].filter(Boolean)).join(' ');
  return _filterDuplicateTerms(shuffled, nickname);
}

function fillCompleteDetails(screenId) {
  const piece = _createCompletePreviewPiece();
  const emotionStats = _getCompleteEmotionStats(piece);
  const avgSpeed = _getCompleteAverageTypingSpeed(piece);

  const dateEl = document.getElementById(`${screenId}-date`);
  const charsEl = document.getElementById(`${screenId}-chars`);
  const summaryEl = document.getElementById(`${screenId}-summary`);
  const tagsEl = document.getElementById(`${screenId}-tags`);
  const speedEl = document.getElementById(`${screenId}-speed`);

  if (dateEl) dateEl.textContent = _formatCompleteDate(piece && piece.date);
  if (charsEl) charsEl.textContent = state.charCount;
  if (summaryEl) summaryEl.textContent = _buildKnitstampFinalMessage(piece, state.charCount);
  if (speedEl) speedEl.textContent = _formatCompleteAverageSpeed(avgSpeed);

  if (tagsEl) {
    tagsEl.innerHTML = '';
    const topTags = emotionStats.slice(0, 3);

    if (!topTags.length) {
      const empty = document.createElement('span');
      empty.className = 'complete-tag is-empty';
      empty.textContent = '기록 없음';
      tagsEl.appendChild(empty);
      return;
    }

    topTags.forEach((tag) => {
      const item = document.createElement('span');
      item.className = 'complete-tag';
      item.textContent = `${tag.label} ${Math.round(tag.avg * 100)}%`;
      tagsEl.appendChild(item);
    });
  }
}

function retryKnit() {
  _cleanupP16();
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

function openKnitQrPopup() {
  const backdrop = document.getElementById('knit-qr-backdrop');
  if (!backdrop) return;

  backdrop.classList.add('is-visible');
  backdrop.setAttribute('aria-hidden', 'false');
  generateKnitQr();

  const closeButton = backdrop.querySelector('.qr-popup-close');
  if (closeButton) closeButton.focus();
}

function closeKnitQrPopup() {
  const backdrop = document.getElementById('knit-qr-backdrop');
  if (!backdrop) return;

  backdrop.classList.remove('is-visible');
  backdrop.setAttribute('aria-hidden', 'true');
}

async function generateKnitQr() {
  const container = document.getElementById('knit-qr-code');
  const note = document.querySelector('.qr-popup-note');
  if (!container) return;

  container.innerHTML = '<p class="qr-loading">업로드 중...</p>';
  if (note) note.textContent = '';

  try {
    const apiKey = window.CONFIG && window.CONFIG.IMGBB_API_KEY;
    if (!apiKey) throw new Error('CONFIG.IMGBB_API_KEY not set');

    if (typeof QRCode === 'undefined') throw new Error('QRCode library not loaded');
    if (!window.knitSketch_exportFullImage) throw new Error('export function not available');

    const dataUrl = await window.knitSketch_exportFullImage();
    if (!dataUrl) throw new Error('이미지 생성 실패');

    const base64 = dataUrl.split(',')[1];

    const formData = new FormData();
    formData.append('image', base64);
    formData.append('key', apiKey);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    console.log('[QR] imgbb response:', data);

    if (!data.success) throw new Error('imgbb 오류: ' + JSON.stringify(data.error || data));

    const imageUrl = data.data.url;
    container.innerHTML = '';
    new QRCode(container, {
      text: imageUrl,
      width: 160,
      height: 160,
      colorDark: '#1d1d1d',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });

    if (note) note.textContent = '스캔하면 작품 이미지를 저장할 수 있어요.';

  } catch (e) {
    console.error('[QR] 오류:', e);
    container.innerHTML = `<p class="qr-error">QR 생성 실패<br><small>${e.message}</small></p>`;
    if (note) note.textContent = '';
  }
}

function _unused_drawKnitQrPlaceholder() {
  const canvas = document.getElementById('knit-qr-example-canvas');
  if (!canvas) return;

  const size = 240;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const modules = 29;
  const pad = 14;
  const cell = (size - pad * 2) / modules;

  function fillModule(x, y, color) {
    ctx.fillStyle = color || '#1d1d1d';
    ctx.fillRect(
      Math.round(pad + x * cell),
      Math.round(pad + y * cell),
      Math.ceil(cell),
      Math.ceil(cell)
    );
  }

  function drawFinder(x, y) {
    for (let yy = 0; yy < 7; yy += 1) {
      for (let xx = 0; xx < 7; xx += 1) {
        const edge = xx === 0 || yy === 0 || xx === 6 || yy === 6;
        const center = xx >= 2 && xx <= 4 && yy >= 2 && yy <= 4;
        fillModule(x + xx, y + yy, edge || center ? '#1d1d1d' : '#ffffff');
      }
    }
  }

  function isFinderArea(x, y) {
    const inLeft = x < 8;
    const inRight = x > modules - 9;
    const inTop = y < 8;
    const inBottom = y > modules - 9;
    return (inLeft && inTop) || (inRight && inTop) || (inLeft && inBottom);
  }

  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      if (isFinderArea(x, y)) continue;
      const hash = (x * 11 + y * 17 + x * y * 3 + y * y) % 9;
      const stripe = (x + y) % 7 === 0 || (x * 2 + y) % 11 === 0;
      if (hash < 3 || stripe) fillModule(x, y);
    }
  }

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}

function _cleanupP16() {
  if (window._p16Timers) window._p16Timers.forEach(t => clearTimeout(t));
  window._p16Timers = [];
  if (window._p16RafId) { cancelAnimationFrame(window._p16RafId); window._p16RafId = null; }
  const cvs = document.getElementById('p16-knit-canvas');
  if (cvs) cvs.remove();
}

function startP16UnravelAnimation() {
  const p16 = document.getElementById('p16');
  if (!p16) return;

  const existing = document.getElementById('p16-knit-canvas');
  if (existing) existing.remove();

  const piece = window._knitSketchPreviewPiece;
  const cells = (piece && (piece.knitArray || piece.cells)) || [];

  const W = 340;
  const ROWS = Math.ceil(cells.length / 10);
  const SP = Math.floor((W - 8) / 10);
  const H = Math.min(560, ROWS * SP + SP + 20);

  const cvs = document.createElement('canvas');
  cvs.id = 'p16-knit-canvas';
  cvs.width  = W;
  cvs.height = H + 20; // 살짝 가라앉는 정도만 여유
  cvs.style.cssText = `
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: opacity 1s;
    border-radius: 16px;
    overflow: visible;
  `;
  p16.appendChild(cvs);

  requestAnimationFrame(() => requestAnimationFrame(() => { cvs.style.opacity = '1'; }));

  const startX_ = SP / 2 + 4;
  const startY_ = SP / 2 + 10;

  // 화면(H)에 보이는 셀만 애니메이션 대상으로 함
  const visibleIdx = [];
  cells.forEach((cell, idx) => {
    const row = Math.floor(idx / 10);
    const py = startY_ + row * SP;
    if (py <= H + SP) visibleIdx.push(idx);
  });

  // 셀별 애니메이션 상태
  // phase: 'idle' | 'falling' | 'done'
  const cellStates = cells.map(() => ({ phase: 'idle', t: 0 }));
  const startTimes = new Array(cells.length).fill(null);

  window._p16RafId = null;
  let finished = false;

  // ㄹ자 순서 매핑: 화면에 보이는 마지막 행부터, 짝수 행=오른→왼, 홀수 행=왼→오른
  const maxRowIdx = visibleIdx.length ? Math.floor(visibleIdx[visibleIdx.length - 1] / 10) : 0;
  const totalRows = maxRowIdx + 1;

  const unravelOrder = [];
  for (let r = totalRows - 1; r >= 0; r--) {
    const fromBottom = (totalRows - 1) - r;
    const leftToRight = (fromBottom % 2 === 1);
    const rowStart = r * 10;
    const rowEnd   = Math.min(rowStart + 10, cells.length);
    const cols = [];
    for (let c = rowStart; c < rowEnd; c++) {
      if (visibleIdx.includes(c)) cols.push(c);
    }
    if (!leftToRight) cols.reverse();
    unravelOrder.push(...cols);
  }
  const orderIndex = new Array(cells.length);
  unravelOrder.forEach((cellIdx, pos) => { orderIndex[cellIdx] = pos; });

  // ── 타이밍 계산: 500자(약 75셀) 기준 8~10초 안에 끝나도록 ──
  const FALL_DUR = 700;  // 셀 하나가 가라앉으며 사라지는 시간 (ms)
  const TOTAL_TARGET = 9000; // 목표 전체 시간 (ms)
  const START_DELAY = 600;   // 시작 전 대기
  const END_BUFFER  = FALL_DUR + 300; // 마지막 셀 낙하 + 여유

  const n = Math.max(unravelOrder.length, 1);
  let STAGGER = (TOTAL_TARGET - START_DELAY - END_BUFFER) / Math.max(n - 1, 1);
  STAGGER = Math.max(15, Math.min(STAGGER, 220)); // 너무 빠르거나 느리지 않게 클램프

  const triggerByOrder = (pos) => {
    if (pos < 0 || pos >= unravelOrder.length) return;
    const cellIdx = unravelOrder[pos];
    if (cellStates[cellIdx].phase !== 'idle') return;
    cellStates[cellIdx].phase = 'falling';
    startTimes[cellIdx] = performance.now();

    // 다음 셀은 STAGGER 후에 트리거 (연쇄, 겹치며 진행)
    const t = setTimeout(() => triggerByOrder(pos + 1), STAGGER);
    window._p16Timers.push(t);
  };

  const t0 = setTimeout(() => {
    triggerByOrder(0);
    window._p16RafId = requestAnimationFrame(tick);
  }, START_DELAY);
  window._p16Timers.push(t0);

  function tick(now) {
    if (finished) return;

    let anyActive = false;

    for (let idx = 0; idx < cells.length; idx++) {
      const cs = cellStates[idx];
      if (cs.phase === 'idle' || cs.phase === 'done') continue;

      const elapsed = now - startTimes[idx];
      anyActive = true;

      if (cs.phase === 'falling') {
        cs.t = Math.min(elapsed / FALL_DUR, 1);
        if (cs.t >= 1) {
          cs.phase = 'done';
        }
      }
    }

    drawFrame();

    const visibleStates = unravelOrder.map(idx => cellStates[idx]);
    const noneIdle = visibleStates.every(cs => cs.phase !== 'idle');
    const allDone  = visibleStates.every(cs => cs.phase === 'done');

    if (noneIdle && allDone) {
      finished = true;
      window._p16RafId = null;
      cvs.style.transition = 'opacity 0.6s';
      cvs.style.opacity = '0';
      const t2 = setTimeout(() => goTo('p17'), 700);
      window._p16Timers.push(t2);
      return;
    }

    window._p16RafId = requestAnimationFrame(tick);
  }

  function drawFrame() {
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, W, cvs.height);

    const startX = SP / 2 + 4;
    const startY = SP / 2 + 10;
    const CS_base = SP - 4;

    for (let idx = 0; idx < cells.length; idx++) {
      const cell = cells[idx];
      const cs   = cellStates[idx];
      if (cs.phase === 'done') continue;

      const col = idx % 10;
      const row = Math.floor(idx / 10);
      const baseX = startX + col * SP;
      const baseY = startY + row * SP;
      if (baseY > H + SP) continue;

      let h, s, b, stitchH, stitchBri;
      if (cell.bgHue !== undefined) {
        h = cell.bgHue; s = cell.sat; b = cell.bgBri;
        stitchH = cell.stitchHue; stitchBri = cell.stitchBri;
      } else {
        h = 154; s = 20; b = 65; stitchH = 184; stitchBri = 75;
      }
      const [bgR, bgG, bgBl] = _hsbToRgb(h, s / 100, b / 100);
      const [stR, stG, stBl] = _hsbToRgb(stitchH, s / 100, stitchBri / 100);

      const speed   = cell.speed   || 0;
      const tension = cell.tension !== undefined ? cell.tension : 0.5;
      const isFilled   = speed >= 0.6;
      const CS = isFilled ? CS_base : CS_base - 3;

      if (cs.phase === 'idle') {
        _p16DrawCell(ctx, baseX, baseY, CS, cell, bgR, bgG, bgBl, stR, stG, stBl, tension, isFilled, 1, 1, 0, 0);
      } else if (cs.phase === 'falling') {
        // 부드럽게 가라앉으며 투명도로 사라짐 (easeOut)
        const ease = 1 - Math.pow(1 - cs.t, 2);
        const fallY = ease * (CS * 1.4); // 셀 크기의 140%만큼 하강
        const alpha = 1 - cs.t; // 처음부터 점진적으로 페이드아웃

        _p16DrawCell(ctx, baseX, baseY + fallY, CS, cell, bgR, bgG, bgBl, stR, stG, stBl, tension, isFilled, 1, alpha, 0, 0);
      }
    }
  }
}

function _p16DrawCell(ctx, px, py, CS, cell, bgR, bgG, bgBl, stR, stG, stBl, tension, isFilled, scaleY, alpha, rotation) {
  if (scaleY <= 0 || alpha <= 0) return;
  rotation = rotation || 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(px, py);
  ctx.rotate(rotation);
  ctx.scale(1, scaleY);
  ctx.translate(-px, -py);

  const hw = CS / 2;

  if (cell.isBackspace) {
    ctx.strokeStyle = `rgb(${bgR},${bgG},${bgBl})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - CS*0.4, py - CS*0.4); ctx.lineTo(px + CS*0.15, py);
    ctx.moveTo(px - CS*0.4, py + CS*0.4); ctx.lineTo(px + CS*0.1,  py);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  if (tension >= 0.5) {
    ctx.roundRect(px - hw, py - hw, CS, CS, 5);
  } else {
    ctx.arc(px, py, hw, 0, Math.PI * 2);
  }
  if (isFilled) {
    ctx.fillStyle = `rgb(${bgR},${bgG},${bgBl})`;
    ctx.fill();
  } else {
    ctx.strokeStyle = `rgb(${bgR},${bgG},${bgBl})`;
    ctx.lineWidth = Math.max(1, CS * 0.08);
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

  ctx.restore();
}

// ── P12 등록 버튼 ──
function handleRegister() {
  if (!window.page_S5) return;
  const doUpload = () => window.page_S5.handleUpload(state.nickname, state.privacy);
  if (!window.page_S5.db) {
    window.page_S5.initDB()
      .then(doUpload)
      .catch(() => alert('아카이브 저장소를 열 수 없습니다. 잠시 후 다시 시도해주세요.'));
  } else {
    doUpload();
  }
}

// ── P18 카드 렌더링 ──
let _p18ScrollIndex = 0;
const P18_CARD_W = 250;
const P18_CARD_H_RATIO = 0.78; // scroll area 높이 대비

function getP18ScreenSize() {
  const screen = document.getElementById('p18');

  return {
    w: Math.max(1, Math.round((screen && screen.clientWidth) || window.innerWidth || 1280)),
    h: Math.max(1, Math.round((screen && screen.clientHeight) || window.innerHeight || 832))
  };
}

function _setupHiDPICanvas(cvs, cssW, cssH) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  cvs.width = Math.round(cssW * dpr);
  cvs.height = Math.round(cssH * dpr);
  cvs.style.width = `${cssW}px`;
  cvs.style.height = `${cssH}px`;
  cvs._cssWidth = cssW;
  cvs._cssHeight = cssH;
  cvs._dpr = dpr;

  const ctx = cvs.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function _getCanvasCssSize(cvs) {
  return {
    w: Math.max(1, cvs._cssWidth || Math.round(cvs.clientWidth) || cvs.width),
    h: Math.max(1, cvs._cssHeight || Math.round(cvs.clientHeight) || cvs.height)
  };
}

// DB에 저장된 기존 기본 조각(isDefault 필드 없음)도 포함해 판별
function _isDefaultPiece(piece) {
  if (!piece) return false;
  if (piece.isDefault === true) return true;
  // defaultArchivePieces.js에 정의된 3개 조각의 고유 닉네임으로 식별
  if (piece.nickname === '과제하기 싫어') return true;
  if (piece.nickname === '직딩의 하루') return true;
  if (piece.nickname === '' && piece.privacy === 'partial') return true;
  return false;
}

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
  const CARD_H = Math.max(360, getP18ScreenSize().h - 160 - 90);

  pieces.forEach((piece, i) => {
    const card = document.createElement('div');
    card.style.cssText = `
      flex: 0 0 ${P18_CARD_W}px;
      width: ${P18_CARD_W}px;
      height: ${CARD_H}px;
      // background: #e9e9e9;
      border-radius: 14px;
      position: relative;
      overflow: hidden;
      cursor: default;
      transition: transform 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
      animation: archiveCardIn 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) ${i * 0.055}s both;
    `;
    card.addEventListener('animationend', () => {
      card.style.animation = 'none';
    });
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-6px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    // 뜨개 패턴 canvas — 카드 실제 픽셀 크기로
    const cvs = document.createElement('canvas');
    const cardCanvasH = CARD_H - 60;
    _setupHiDPICanvas(cvs, P18_CARD_W, cardCanvasH);
    cvs.style.cssText = `
      display: block;
      position: absolute;
      top: 0; left: 0;
      width: ${P18_CARD_W}px;
      height: ${cardCanvasH}px;
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
      border-top: 1px solid rgba(200,200,200,0.75);
      // background: linear-gradient(transparent, rgba(232,229,224,0.95));
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
  const dpr = cvs._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { w: W, h: H } = _getCanvasCssSize(cvs);
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

// 감정태그 → 감정 베이스 색상(hue). "■ 감정 베이스 색상" 범례(S10.js)와 동일한 값을 사용
const _EMOTION_BASE_HUE = {
  '짜증': 0, '찌푸림': 0,
  '중립': 51,
  '해탈': 103, '풀림': 103,
  '미묘': 154, '미묘함': 154, '표정 변화': 154,
  '슬픔': 206, '무거움': 206,
  '긴장': 257,
  '놀람': 309
};
function _emotionTagColor(label) {
  const hue = _EMOTION_BASE_HUE[label] !== undefined ? _EMOTION_BASE_HUE[label] : 154;
  const [r, g, b] = _hsbToRgb(hue, 0.4, 0.9);
  return `rgb(${r},${g},${b})`;
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
  const visible = Math.max(1, Math.floor((getP18ScreenSize().w - 120) / (P18_CARD_W + 20)));
  const maxIdx  = Math.max(0, total - visible);
  _p18ScrollIndex = Math.min(maxIdx, _p18ScrollIndex + 1);
  _updateP18TrackPos();
}

// 마우스 휠로 카드 가로 스크롤 (세로/가로 휠 입력 모두 지원, 한 번에 한 칸씩)
let _p18WheelLock = false;
const _p18ScreenEl = document.getElementById('p18');
if (_p18ScreenEl) {
  _p18ScreenEl.addEventListener('wheel', (e) => {
    // 상세 오버레이가 열려있을 때는 오버레이 자체 스크롤을 사용
    if (document.getElementById('p18-overlay-backdrop')) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 4) return;
    e.preventDefault();
    if (_p18WheelLock) return;
    _p18WheelLock = true;
    if (delta > 0) p18ScrollRight(); else p18ScrollLeft();
    setTimeout(() => { _p18WheelLock = false; }, 450);
  }, { passive: false });
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
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(4px);
    z-index: 1200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 40px 0;
    box-sizing: border-box;
    animation: overlayFadeIn 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  `;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target === panel) closeP18Overlay();
  });

  // 오버레이 내부 패널 (카드와 동일 너비, 스크롤 가능)
  const panel = document.createElement('div');
  panel.style.cssText = `
    display: flex;
    flex-direction: row;
    gap: 32px;
    align-items: flex-start;
    pointer-events: auto;
    min-height: min-content;
    animation: overlayPanelIn 0.35s cubic-bezier(0.22, 0.61, 0.36, 1) 0.05s both;
  `;

  // 오버레이 카드 너비: 화면 높이 기준 비율 유지
  const overlayW = Math.round(P18_CARD_W * 1.5);

  // 패턴 실제 행 수로 높이 동적 계산
  const gridData = piece.knitArray || piece.cells || [];
  const totalRows = Math.ceil(gridData.length / 10);
  const SP = Math.floor((overlayW - 8) / 10);
  const overlayH = Math.max(getP18ScreenSize().h - 80, totalRows * SP + SP);

  const bigCvs = document.createElement('canvas');
  _setupHiDPICanvas(bigCvs, overlayW, overlayH);
  bigCvs.style.cssText = `
    display: block;
    border-radius: 14px;
    // background: #E8E5E0;
    flex-shrink: 0;
    width: ${overlayW}px;
    height: ${overlayH}px;
  `;

  bigCvs.addEventListener('wheel', (e) => {
    backdrop.scrollTop += e.deltaY;
    e.preventDefault();
  }, { passive: false });

  panel.appendChild(bigCvs);

  // 우측 정보 패널
  const info = document.createElement('div');
  info.style.cssText = `
    width: 260px;
    flex-shrink: 0;
    position: sticky;
    top: 40px;
    align-self: flex-start;
    background: rgba(255,255,255,0.92);
    border-radius: 14px;
    padding: 28px 24px;
    font-family: 'HSHwalkong', serif;
    pointer-events: auto;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
    box-sizing: border-box;
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

  // 감정태그 (뜨개물 정보 섹션에 함께 표시)
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

  // 뜨개물 정보 (요약 메시지 + 감정 태그)
  const knitInfoTitle = document.createElement('div');
  knitInfoTitle.style.cssText = 'font-size:14px; font-weight:600; color:#333; margin-bottom:8px;';
  knitInfoTitle.textContent = '뜨개물 정보';
  info.appendChild(knitInfoTitle);

  const knitInfoBody = document.createElement('div');
  knitInfoBody.style.cssText = 'font-size:13px; color:#888; line-height:1.6;';
  knitInfoBody.textContent = _buildKnitstampFinalMessage(piece);
  info.appendChild(knitInfoBody);

  if (eList.length > 0) {
    const tagList = document.createElement('div');
    tagList.style.cssText = 'margin-top:10px;';
    eList.forEach(e => {
      const row = document.createElement('div');
      row.style.cssText = 'font-size:14px; color:#666; margin-bottom:4px; display:flex; align-items:center; gap:6px;';
      const dot = document.createElement('span');
      dot.style.cssText = `display:inline-block; width:10px; height:10px; border-radius:50%; background:${_emotionTagColor(e.label)}; flex-shrink:0;`;
      row.appendChild(dot);
      row.appendChild(document.createTextNode(`${e.label}  ${e.avg.toFixed(2)}`));
      tagList.appendChild(row);
    });
    info.appendChild(tagList);
  }

  // 구분선
  const hr = document.createElement('div');
  hr.style.cssText = 'border-top:1px solid #e0e0e0; margin:20px 0;';
  info.appendChild(hr);

  // 텍스트 보기 체크박스
  const textProtected = piece.privacy === 'partial';
  const cbWrap = document.createElement('label');
  cbWrap.style.cssText = `display:flex; align-items:center; gap:8px; font-size:14px; color:${textProtected ? '#bbb' : '#555'}; cursor:${textProtected ? 'default' : 'pointer'};`;
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !textProtected;
  cb.disabled = textProtected;
  cb.style.cssText = `width:16px; height:16px; cursor:${textProtected ? 'default' : 'pointer'};`;
  cbWrap.appendChild(cb);
  cbWrap.appendChild(document.createTextNode(textProtected ? '원문은 보호됩니다' : '텍스트 보기'));
  info.appendChild(cbWrap);

  // 감정 정보 보기 체크박스
  const cbWrap2 = document.createElement('label');
  cbWrap2.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:#555; margin-top:6px;';
  const cb2 = document.createElement('input');
  cb2.type = 'checkbox';
  cb2.checked = true;
  cb2.style.cssText = 'width:16px; height:16px; cursor:pointer;';
  cbWrap2.appendChild(cb2);
  cbWrap2.appendChild(document.createTextNode('감정 정보 보기'));
  info.appendChild(cbWrap2);

  // 감정 태그 hover whoosh — lerp 보간 오프셋
  let _cvsMx = -9999, _cvsMy = -9999;
  const _tagCurOffsets = {};
  const _tagTgtOffsets = {};
  let _textFade    = textProtected ? 0 : 1;   // 텍스트 보기 페이드 (cb 초기값과 동일하게 시작)
  let _emotionFade = 1;   // 감정 정보 페이드 (cb2 초기값 true)
  let _rafId = null;
  let _unraveling = false; // 뜨개실 풀기 애니메이션 진행 중에는 다른 캔버스 갱신을 멈춤

  const redrawBig = () => _p18DrawCardBig(bigCvs, piece, overlayW, overlayH, cb.checked, cb2.checked, _cvsMx, _cvsMy, _tagCurOffsets, _textFade, _emotionFade);

  // RAF 애니메이션 루프 — 태그 오프셋 + 페이드 lerp
  const startAnim = () => {
    if (_rafId || _unraveling) return;
    const tick = () => {
      let active = false;
      for (const k in _tagCurOffsets) {
        const cur = _tagCurOffsets[k];
        const tgt = _tagTgtOffsets[k] || { ox: 0, oy: 0 };
        cur.ox += (tgt.ox - cur.ox) * 0.045;
        cur.oy += (tgt.oy - cur.oy) * 0.045;
        if (Math.abs(cur.ox - tgt.ox) > 0.1 || Math.abs(cur.oy - tgt.oy) > 0.1) active = true;
      }
      const tgtTF = cb.checked  ? 1 : 0;
      const tgtEF = cb2.checked ? 1 : 0;
      _textFade    += (tgtTF - _textFade)    * 0.1;
      _emotionFade += (tgtEF - _emotionFade) * 0.1;
      if (Math.abs(_textFade - tgtTF) > 0.01 || Math.abs(_emotionFade - tgtEF) > 0.01) active = true;
      redrawBig();
      _rafId = active ? requestAnimationFrame(tick) : null;
    };
    _rafId = requestAnimationFrame(tick);
  };

  cb.addEventListener('change',  startAnim);
  cb2.addEventListener('change', startAnim);
  redrawBig();

  // 구분선
  const hr3 = document.createElement('div');
  hr3.style.cssText = 'border-top:1px solid #e0e0e0; margin:20px 0 10px;';
  info.appendChild(hr3);

  // 선택된 코 정보
  const selTitle = document.createElement('div');
  selTitle.style.cssText = 'font-size:14px; font-weight:600; color:#333; margin-bottom:8px;';
  selTitle.textContent = '선택된 코 정보';
  info.appendChild(selTitle);

  const selInfo = document.createElement('div');
  selInfo.style.cssText = 'font-size:13px; color:#aaa; line-height:1.6;';
  selInfo.textContent = '니트 코 위에 마우스를 올리면 정보가 표시됩니다.';
  info.appendChild(selInfo);

  // 구분선 + 뜨개실 풀기 (기본 아카이브 조각은 삭제 불가)
  if (!_isDefaultPiece(piece)) {
    const hr4 = document.createElement('div');
    hr4.style.cssText = 'border-top:1px solid #e0e0e0; margin:20px 0 14px;';
    info.appendChild(hr4);

    const unravelLink = document.createElement('div');
    unravelLink.textContent = '뜨개실 풀기';
    unravelLink.style.cssText = 'font-size:14px; font-weight:600; color:#d9534f; text-align:center; cursor:pointer; letter-spacing:0.02em; transition:color 0.15s ease;';
    unravelLink.addEventListener('mouseenter', () => { if (!_unraveling) unravelLink.style.color = '#b8413d'; });
    unravelLink.addEventListener('mouseleave', () => { if (!_unraveling) unravelLink.style.color = '#d9534f'; });
    unravelLink.addEventListener('click', () => {
      if (_unraveling) return;
      _showUnravelConfirm(() => {
        _unraveling = true;
        if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
        unravelLink.textContent = '뜨개실을 푸는 중...';
        unravelLink.style.cursor = 'default';
        unravelLink.style.color = '#bbb';
        _playArchiveUnravelAnimation(bigCvs, piece, overlayW, overlayH, () => {
          _deleteArchivePiece(piece);
        });
      });
    });
    info.appendChild(unravelLink);
  }

  // 마우스 호버 → 선택된 코 정보 업데이트
  const _SP = Math.floor((overlayW - 8) / 10);
  const _hsx = _SP / 2 + 4;
  const _hsy = _SP / 2 + 10;
  const _tagMapKo = { FROWN: '짜증', SURPRISED: '놀람', BLURRY: '미묘함', NEUTRAL: '중립' };
  bigCvs.addEventListener('mousemove', (e) => {
    if (_unraveling) return;
    const r = bigCvs.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    _cvsMx = mx; _cvsMy = my;
    if (cb2.checked) {
      // 각 태그의 목표 오프셋 갱신
      const PAD = 20;
      const SP = Math.floor((overlayW - 8) / 10);
      const startX = SP / 2 + 4;
      const startY = SP / 2 + 10;
      const gridData = piece.knitArray || piece.cells || [];
      const _seenTmp = new Set();
      const _tMapTmp = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화', NEUTRAL: '중립' };
      const CS = SP - 4;
      const ctx2 = bigCvs.getContext('2d');
      ctx2.font = `13px 'HSHwalkong', serif`;
      gridData.forEach((cell, idx) => {
        const col = idx % 10;
        const row = Math.floor(idx / 10);
        const px  = startX + col * SP;
        const py  = startY + row * SP;
        const eIntensity = cell.emotionIntensity !== undefined ? cell.emotionIntensity : (cell.tension || 0);
        const eTag = cell.emotionTagKo || _tMapTmp[cell.emotionTag] || _tMapTmp[cell.eye] || cell.emotionTag || cell.eye || '';
        if (eIntensity < 0.5 || !eTag || eTag === '중립' || eTag === 'NEUTRAL' || _seenTmp.has(eTag)) return;
        _seenTmp.add(eTag);

        const labelText = `${eTag}  ${(eIntensity * 100).toFixed(0)}%`;
        const tW = ctx2.measureText(labelText).width + 24;
        const lineLen = 10;
        const lxLeft  = px - SP / 2 - lineLen - tW;
        const lxRight = px + SP / 2 + lineLen;
        let isLeft = col < 5;
        if (isLeft  && lxLeft  < PAD)               isLeft = false;
        if (!isLeft && lxRight + tW > overlayW - PAD) isLeft = true;

        if (!_tagCurOffsets[eTag]) _tagCurOffsets[eTag] = { ox: 0, oy: 0 };
        if (!_tagTgtOffsets[eTag]) _tagTgtOffsets[eTag] = { ox: 0, oy: 0 };

        // 해당 셀 위에 마우스가 있을 때만 target 오프셋 설정
        const onCell = (Math.abs(mx - px) <= CS / 2 && Math.abs(my - py) <= CS / 2);
        _tagTgtOffsets[eTag].ox = onCell ? (isLeft ? -6 : 6) : 0;
        _tagTgtOffsets[eTag].oy = onCell ? -8 : 0;
      });
      startAnim();
    }
    const gd = piece.knitArray || piece.cells || [];
    let found = null;
    gd.forEach((cell, idx) => {
      const cx = _hsx + (idx % 10) * _SP;
      const cy = _hsy + Math.floor(idx / 10) * _SP;
      if (Math.abs(mx - cx) <= _SP / 2 && Math.abs(my - cy) <= _SP / 2) found = cell;
    });
    if (found) {
      const eyeKo = found.emotionTagKo || _tagMapKo[found.eye] || found.eye || '알 수 없음';
      selInfo.style.color = '#333';
      const textLine = textProtected ? '' : `<span style="font-size:15px;font-weight:600;">"${found.text || '—'}"</span><br>`;
      selInfo.innerHTML = `${textLine}${eyeKo} (${((found.tension||0)*100).toFixed(0)}%)<br>속도: ${(((found.speed||0)*100).toFixed(0))}%`;
    } else {
      selInfo.style.color = '#aaa';
      selInfo.textContent = '니트 코 위에 마우스를 올리면 정보가 표시됩니다.';
    }
  });

  panel.appendChild(info);
  backdrop.appendChild(panel);
  p18.appendChild(backdrop);
}

function closeP18Overlay() {
  const backdrop = document.getElementById('p18-overlay-backdrop');
  if (!backdrop) return;
  const panel = backdrop.querySelector('div');
  if (panel) panel.style.animation = 'overlayPanelOut 0.25s cubic-bezier(0.22, 0.61, 0.36, 1) both';
  backdrop.style.animation = 'overlayFadeOut 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) both';
  backdrop.addEventListener('animationend', () => backdrop.remove(), { once: true });
}

// ── 뜨개실 풀기: 확인 팝업 ──
function _showUnravelConfirm(onConfirm) {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 2000;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    animation: overlayFadeIn 0.2s ease both;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: min(360px, calc(100vw - 48px));
    background: #fff; border-radius: 16px;
    padding: 32px 28px; text-align: center;
    box-shadow: 0 24px 60px rgba(0,0,0,0.22);
    font-family: 'HSHwalkong', 'Noto Serif KR', serif;
    animation: overlayPanelIn 0.25s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  `;

  const msg = document.createElement('p');
  msg.style.cssText = 'font-size:16px; line-height:1.7; color:#333; margin:0 0 24px;';
  msg.innerHTML = '정말 뜨개물을 푸시겠습니까?<br>한번 삭제된 뜨개물은 다시 볼 수 없어요.';
  panel.appendChild(msg);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:10px;';

  const closePopup = () => {
    backdrop.style.animation = 'overlayFadeOut 0.2s ease both';
    backdrop.addEventListener('animationend', () => backdrop.remove(), { once: true });
  };

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.textContent = '뒤로 가기';
  backBtn.style.cssText = `
    flex:1; padding:12px 0; border-radius:10px; border:1px solid #ddd;
    background:#f5f5f5; color:#666; font-size:15px; font-family:inherit; cursor:pointer;
  `;
  backBtn.addEventListener('click', closePopup);

  const unravelBtn = document.createElement('button');
  unravelBtn.type = 'button';
  unravelBtn.textContent = '뜨개실 풀기';
  unravelBtn.style.cssText = `
    flex:1; padding:12px 0; border-radius:10px; border:none;
    background:#d9534f; color:#fff; font-size:15px; font-weight:600; font-family:inherit; cursor:pointer;
  `;
  unravelBtn.addEventListener('click', () => {
    backdrop.remove();
    onConfirm();
  });

  btnRow.appendChild(backBtn);
  btnRow.appendChild(unravelBtn);
  panel.appendChild(btnRow);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
}

// ── 뜨개실 풀기: 캔버스 위에서 코가 한 줄씩 풀려 사라지는 애니메이션 (p16과 동일한 로직, 임의 캔버스 대상) ──
function _playArchiveUnravelAnimation(cvs, piece, W, H, onDone) {
  const ctx = cvs.getContext('2d');
  const dpr = cvs._dpr || 1;
  const cells = piece.knitArray || piece.cells || [];

  const SP = Math.floor((W - 8) / 10);
  const CS_base = SP - 4;
  const startX = SP / 2 + 4;
  const startY = SP / 2 + 10;

  const visibleIdx = [];
  cells.forEach((cell, idx) => {
    const row = Math.floor(idx / 10);
    const py = startY + row * SP;
    if (py <= H + SP) visibleIdx.push(idx);
  });

  const cellStates = cells.map(() => ({ phase: 'idle', t: 0 }));
  const startTimes = new Array(cells.length).fill(null);

  const maxRowIdx = visibleIdx.length ? Math.floor(visibleIdx[visibleIdx.length - 1] / 10) : 0;
  const totalRows = maxRowIdx + 1;

  // ㄹ자 순서 매핑: 마지막 행부터, 짝수 행=오른→왼, 홀수 행=왼→오른
  const unravelOrder = [];
  for (let r = totalRows - 1; r >= 0; r--) {
    const fromBottom = (totalRows - 1) - r;
    const leftToRight = (fromBottom % 2 === 1);
    const rowStart = r * 10;
    const rowEnd   = Math.min(rowStart + 10, cells.length);
    const cols = [];
    for (let c = rowStart; c < rowEnd; c++) {
      if (visibleIdx.includes(c)) cols.push(c);
    }
    if (!leftToRight) cols.reverse();
    unravelOrder.push(...cols);
  }

  const FALL_DUR = 700;
  const TOTAL_TARGET = 9000;
  const START_DELAY = 600;
  const END_BUFFER  = FALL_DUR + 300;

  const n = Math.max(unravelOrder.length, 1);
  let STAGGER = (TOTAL_TARGET - START_DELAY - END_BUFFER) / Math.max(n - 1, 1);
  STAGGER = Math.max(15, Math.min(STAGGER, 220));

  const timers = [];
  let rafId = null;
  let finished = false;

  const triggerByOrder = (pos) => {
    if (pos < 0 || pos >= unravelOrder.length) return;
    const cellIdx = unravelOrder[pos];
    if (cellStates[cellIdx].phase !== 'idle') return;
    cellStates[cellIdx].phase = 'falling';
    startTimes[cellIdx] = performance.now();
    timers.push(setTimeout(() => triggerByOrder(pos + 1), STAGGER));
  };

  function drawFrame() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#E8E5E0';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 14);
    ctx.fill();

    for (let idx = 0; idx < cells.length; idx++) {
      const cell = cells[idx];
      const cs   = cellStates[idx];
      if (cs.phase === 'done') continue;

      const col = idx % 10;
      const row = Math.floor(idx / 10);
      const baseX = startX + col * SP;
      const baseY = startY + row * SP;
      if (baseY > H + SP) continue;

      let h, s, b, stitchH, stitchBri;
      if (cell.bgHue !== undefined) {
        h = cell.bgHue; s = cell.sat; b = cell.bgBri;
        stitchH = cell.stitchHue; stitchBri = cell.stitchBri;
      } else {
        h = 154; s = 20; b = 65; stitchH = 184; stitchBri = 75;
      }
      const [bgR, bgG, bgBl] = _hsbToRgb(h, s / 100, b / 100);
      const [stR, stG, stBl] = _hsbToRgb(stitchH, s / 100, stitchBri / 100);

      const speed   = cell.speed   || 0;
      const tension = cell.tension !== undefined ? cell.tension : 0.5;
      const isFilled = speed >= 0.6;
      const CS = isFilled ? CS_base : CS_base - 3;

      if (cs.phase === 'idle') {
        _p16DrawCell(ctx, baseX, baseY, CS, cell, bgR, bgG, bgBl, stR, stG, stBl, tension, isFilled, 1, 1, 0, 0);
      } else if (cs.phase === 'falling') {
        const ease  = 1 - Math.pow(1 - cs.t, 2);
        const fallY = ease * (CS * 1.4);
        const alpha = 1 - cs.t;
        _p16DrawCell(ctx, baseX, baseY + fallY, CS, cell, bgR, bgG, bgBl, stR, stG, stBl, tension, isFilled, 1, alpha, 0, 0);
      }
    }
  }

  function tick(now) {
    if (finished) return;

    for (let idx = 0; idx < cells.length; idx++) {
      const cs = cellStates[idx];
      if (cs.phase === 'idle' || cs.phase === 'done') continue;
      const elapsed = now - startTimes[idx];
      if (cs.phase === 'falling') {
        cs.t = Math.min(elapsed / FALL_DUR, 1);
        if (cs.t >= 1) cs.phase = 'done';
      }
    }

    drawFrame();

    const visibleStates = unravelOrder.map(idx => cellStates[idx]);
    const noneIdle = visibleStates.every(cs => cs.phase !== 'idle');
    const allDone  = visibleStates.every(cs => cs.phase === 'done');

    if (noneIdle && allDone) {
      finished = true;
      rafId = null;
      onDone();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  drawFrame();
  timers.push(setTimeout(() => {
    triggerByOrder(0);
    rafId = requestAnimationFrame(tick);
  }, START_DELAY));
}

// ── 뜨개실 풀기: DB에서 삭제하고 아카이브 갱신 ──
function _deleteArchivePiece(piece) {
  const finish = () => {
    if (window.page_S7_S8 && Array.isArray(window.page_S7_S8.archivedPieces)) {
      window.page_S7_S8.archivedPieces = window.page_S7_S8.archivedPieces.filter(p => p !== piece);
    }
    closeP18Overlay();
    renderP18Cards(window.page_S7_S8 ? window.page_S7_S8.archivedPieces : []);
  };

  if (window.page_S5 && window.page_S5.db && piece.id !== undefined) {
    window.page_S5.db.knitTable.delete(piece.id).then(finish).catch(finish);
  } else {
    finish();
  }
}

function _p18DrawCardBig(cvs, piece, W, H, showText, showEmotionInfo, mx, my, tagOffsets, textFade, emotionFade) {
  mx = (mx === undefined) ? -9999 : mx;
  my = (my === undefined) ? -9999 : my;
  tagOffsets  = tagOffsets  || {};
  textFade    = textFade    !== undefined ? textFade    : (showText        ? 1 : 0);
  emotionFade = emotionFade !== undefined ? emotionFade : (showEmotionInfo ? 1 : 0);
  const ctx = cvs.getContext('2d');
  const dpr = cvs._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  const _emotionCells = [];
  const _seenTags = new Set();
  const _tagMapAnno = { FROWN: '찌푸림', SURPRISED: '놀람', BLURRY: '표정 변화', NEUTRAL: '중립' };

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

    if (textFade > 0.01 && cell.text && cell.text.trim().length > 0 && piece.privacy !== 'private' && piece.privacy !== 'partial') {
      ctx.save();
      ctx.globalAlpha = textFade;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.font = `bold ${Math.round(CS * 0.55)}px 'HSHwalkong', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.text.trim()[0], px, py + 1);
      ctx.restore();
    }

    // 셀 호버 어둡게
    if (Math.abs(mx - px) <= CS / 2 && Math.abs(my - py) <= CS / 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.roundRect(px - CS / 2, py - CS / 2, CS, CS, 5);
      ctx.fill();
    }

    // 감정 정보 수집
    if (emotionFade > 0.01) {
      const eIntensity = cell.emotionIntensity !== undefined ? cell.emotionIntensity : (cell.tension || 0);
      const eTag = cell.emotionTagKo || _tagMapAnno[cell.emotionTag] || _tagMapAnno[cell.eye] || cell.emotionTag || cell.eye || '';
      if (eIntensity >= 0.5 && eTag && eTag !== '중립' && eTag !== 'NEUTRAL' && !_seenTags.has(eTag)) {
        _emotionCells.push({ px, py, eTag, eIntensity, col });
        _seenTags.add(eTag);
      }
    }
  });

  // 감정 정보 화살표 어노테이션
  if (emotionFade > 0.01 && _emotionCells.length > 0) {
    ctx.save();
    ctx.globalAlpha = emotionFade;
    ctx.font = `13px 'HSHwalkong', serif`;
    ctx.textBaseline = 'middle';
    const PAD = 20;
    _emotionCells.forEach(({ px, py, eTag, eIntensity, col }) => {
      const labelText = `${eTag}  ${(eIntensity * 100).toFixed(0)}%`;
      const tW = ctx.measureText(labelText).width + 24;
      const tH = 28;
      const lineLen = 10;
      const rise    = SP * 0.35;
      const lxLeft  = px - SP / 2 - lineLen - tW;
      const lxRight = px + SP / 2 + lineLen;

      // 좌우 스마트 배치: 기본 방향 → 벗어나면 반대로
      let isLeft = col < 5;
      if (isLeft  && lxLeft  < PAD)         isLeft = false;
      if (!isLeft && lxRight + tW > W - PAD) isLeft = true;
      let lx = Math.max(PAD, Math.min(W - PAD - tW, isLeft ? lxLeft : lxRight));

      // 상하 스마트 배치: 기본 위 → 벗어나면 아래로
      let ly = py - rise;
      if (ly - tH / 2 < PAD) ly = py + rise;
      ly = Math.max(PAD + tH / 2, Math.min(H - PAD - tH / 2, ly));

      // lerp된 오프셋 적용 (RAF 루프에서 셀 호버 시 보간)
      const off = tagOffsets[eTag] || { ox: 0, oy: 0 };
      lx = Math.max(PAD, Math.min(W - PAD - tW, lx + off.ox));
      ly = Math.max(PAD + tH / 2, Math.min(H - PAD - tH / 2, ly + off.oy));

      // 태그에 가장 가까운 셀 꼭짓점에서 x/y 각 6px 안쪽
      const dotX = isLeft ? px - CS/2 + 3 : px + CS/2 - 3;
      const dotY = ly < py ? py - CS/2 + 3 : py + CS/2 - 3;
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowOffsetY = 1;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(255,255,255)';
      ctx.strokeStyle = 'rgba(215,208,198,1)';
      ctx.lineWidth = 1.5;
      ctx.fill(); ctx.stroke();
      ctx.restore();

      // 태그 배경 + 그림자
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(0,0,0,0.13)';
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'rgb(255,255,255)';
      ctx.strokeStyle = 'rgba(200,193,183,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(lx, ly - tH / 2, tW, tH, 10);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      // 태그 텍스트
      ctx.fillStyle = 'rgb(60,52,42)';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, lx + 11, ly);
    });
    ctx.restore();
  }
}
