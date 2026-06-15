window.knitstamp = window.knitstamp || {
  seconds: []
};

// ==========================================
// FACE_DEBUG true = 콘솔 로그 ON
// 카메라 프리뷰는 p6/p7의 사용자용 얼굴 인식 프레임에서만 표시됩니다.
// ==========================================
const FACE_DEBUG = true;

let knitstampInputController;

let expressionTuning = {
  eyeMaxChange: 0.035,
  browMaxChange: 8,
  mouthCurveMaxChange: 0.035,
  mouthOpenIgnoreChange: 0.25,
  neutralThreshold: 0.08,
  tagThreshold: 0.16
};

// main sketch에서 setup 때 호출
function setupKnitstampInput() {
  knitstampInputController = new KnitstampInputController({
    faceTracker: new FaceExpressionTracker(640, 480),
    typingTracker: new TypingSpeedTracker(),
    intervalMs: 1000
  });

  if (window.state?.currentScreen) {
    knitstampInputController.faceTracker.setPreviewScreen(window.state.currentScreen);
  }
}

// main sketch에서 draw 때 호출
function updateKnitstampInput() {
  knitstampInputController.update();
}

// main sketch에서 keyPressed 때 호출
function recordKnitstampKey() {
  knitstampInputController.recordKey();
}

// 온보딩 UI의 "기준화면 등록" 버튼에서 호출
function registerFaceBaseline() {
  return knitstampInputController.registerFaceBaseline();
}

class KnitstampInputController {
  constructor(options) {
    this.faceTracker = options.faceTracker;
    this.typingTracker = options.typingTracker;
    this.intervalMs = options.intervalMs || 1000;
    this.currentSecondIndex = 0;
    this.lastRecordedAt = 0;
  }

  update() {
    let now = millis();

    if (now - this.lastRecordedAt < this.intervalMs) {
      return;
    }

    this.lastRecordedAt = now;

    let second = this.createSecondObject(this.currentSecondIndex);
    window.knitstamp.seconds.push(second);

    this.currentSecondIndex += 1;
  }

  recordKey() {
    this.typingTracker.recordKey();
  }

  registerFaceBaseline() {
    return this.faceTracker.registerBaseline();
  }

  getCurrentFaceStatus() {
    return {
      hasFace: this.faceTracker.hasFace(),
      hasBaseline: this.faceTracker.baseline !== null
    };
  }

  createSecondObject(secondIndex) {
    let faceData = this.faceTracker.getExpressionData();
    let keysPerSecond = this.typingTracker.consumeKeysPerSecond();

    if (FACE_DEBUG) {
      console.log(
        `[face] hasFace:${faceData.hasFace} hasBaseline:${faceData.hasBaseline} tag:${faceData.tag} mouth:${faceData.scores?.mouth?.toFixed(2)}`
      );
    }

    return {
      second: secondIndex,

      input: {
        face: {
          hasFace: faceData.hasFace,
          hasBaseline: faceData.hasBaseline,
          tag: faceData.tag,
          intensity: faceData.intensity,
          scores: {
            eye: faceData.scores.eye,
            brow: faceData.scores.brow,
            mouth: faceData.scores.mouth
          }
        },

        typing: {
          keysPerSecond: keysPerSecond
        }
      }
    };
  }
}

class FaceExpressionTracker {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.predictions = [];
    this.baseline = null;
    this.hasLoggedFirstFace = false;
    this.previewPanel = null;
    this.previewStatusText = null;
    this.previewScreen = null;

    this.video = createCapture(VIDEO);
    this.video.size(w, h);
    this.video.hide();
    this.setupFaceRecognitionPreview();

    if (FACE_DEBUG) {
      console.log("[facemesh] ml5.facemesh 존재?", typeof ml5?.facemesh);
    }

    let videoEl = this.video.elt || this.video;

    this.facemesh = ml5.facemesh(videoEl, () => {
      if (FACE_DEBUG) console.log("[facemesh] 모델 로드 완료 ✅");
    });

    this.facemesh.on("predict", (results) => {
      this.predictions = results;

      if (!this.hasLoggedFirstFace && results.length > 0) {
        this.hasLoggedFirstFace = true;
        if (FACE_DEBUG) {
          console.log("[facemesh] 첫 얼굴 감지 ✅ — 기준값은 자동 등록하지 않음");
        }
      }

      this.updatePreviewStatus();
    });
  }

  setupFaceRecognitionPreview() {
    document.getElementById('face-debug-camera-panel')?.remove();
    document.getElementById('face-debug-camera-reopen')?.remove();
    document.getElementById('face-recognition-preview')?.remove();

    const panel = document.createElement('div');
    panel.id = 'face-recognition-preview';
    panel.className = 'face-recognition-preview is-hidden';

    const videoWrap = document.createElement('div');
    videoWrap.className = 'face-recognition-video-wrap';

    const frame = document.createElement('div');
    frame.className = 'face-recognition-guide-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.innerHTML = `
      <svg class="face-recognition-guide-icon" viewBox="0 0 300 240" preserveAspectRatio="xMidYMax meet" focusable="false" aria-hidden="true">
        <path
          class="face-recognition-guide-outline"
          d="M27 239 C30 220 34 199 40 181 C44 168 54 162 68 157 L96 146 C112 140 120 130 122 116 C112 106 108 90 108 70 C108 35 125 16 150 16 C175 16 192 35 192 70 C192 90 188 106 178 116 C180 130 188 140 204 146 L232 157 C246 162 256 168 260 181 C266 199 270 220 273 239"
        />
      </svg>
    `;

    const status = document.createElement('div');
    status.className = 'face-recognition-status';

    const statusDot = document.createElement('span');
    statusDot.className = 'face-recognition-status-dot';
    statusDot.setAttribute('aria-hidden', 'true');

    const statusText = document.createElement('span');
    statusText.className = 'face-recognition-status-text';
    statusText.textContent = '얼굴을 찾고 있어요.';

    status.append(statusDot, statusText);
    videoWrap.append(frame, status);
    panel.append(videoWrap);
    document.body.append(panel);

    const videoEl = this.video.elt || this.video;
    videoWrap.prepend(videoEl);
    this.video.style('position', 'static');
    this.video.style('display', 'none');
    this.video.style('width', '100%');
    this.video.style('height', '100%');
    this.video.style('border', '0');
    this.video.style('object-fit', 'cover');
    this.video.style('object-position', 'center center');
    this.video.style('transform', 'scaleX(-1)');
    this.video.style('transform-origin', 'center center');

    this.previewPanel = panel;
    this.previewStatusText = statusText;
  }

  setPreviewScreen(screenId) {
    this.previewScreen = screenId;

    if (!this.previewPanel) return;

    const shouldShow = screenId === 'p6' || screenId === 'p7';
    const slot = shouldShow ? document.getElementById(`${screenId}-face-preview-slot`) : null;

    if (!shouldShow || !slot) {
      this.previewPanel.classList.add('is-hidden');
      this.video.style('display', 'none');
      return;
    }

    slot.appendChild(this.previewPanel);
    this.previewPanel.classList.remove('is-hidden');
    this.previewPanel.dataset.screen = screenId;
    this.video.style('display', 'block');
    this.updatePreviewStatus();
  }

  updatePreviewStatus() {
    if (!this.previewPanel || !this.previewStatusText || this.previewPanel.classList.contains('is-hidden')) {
      return;
    }

    const hasFace = this.hasFace();
    this.previewPanel.classList.toggle('has-face', hasFace);
    this.previewPanel.classList.toggle('is-searching', !hasFace);

    if (this.previewScreen === 'p6') {
      this.previewStatusText.textContent = hasFace
        ? '얼굴이 프레임 안에 들어왔어요.'
        : '얼굴을 프레임 안에 맞춰주세요.';
      return;
    }

    if (this.baseline) {
      this.previewStatusText.textContent = '기준표정이 등록되었어요.';
      return;
    }

    this.previewStatusText.textContent = hasFace
      ? '얼굴이 인식되고 있어요. 표정을 유지해주세요.'
      : '얼굴을 찾고 있어요.';
  }

  hasFace() {
    return this.predictions.length > 0;
  }

  getKeypoints() {
    if (!this.hasFace()) {
      return null;
    }

    return this.predictions[0].scaledMesh;
  }

  registerBaseline() {
    let keypoints = this.getKeypoints();

    if (!keypoints) {
      if (FACE_DEBUG) console.log("[baseline] 등록 실패 — 얼굴 미감지");
      this.updatePreviewStatus();

      return {
        success: false,
        reason: "NO_FACE"
      };
    }

    this.baseline = this.extractFaceValues(keypoints);

    if (FACE_DEBUG) console.log("[baseline] 등록 완료 ✅", this.baseline);
    this.updatePreviewStatus();

    return {
      success: true,
      baseline: this.baseline
    };
  }

  getExpressionData() {
    let keypoints = this.getKeypoints();

    if (!keypoints) {
      return this.emptyFaceData(null, false);
    }

    let current = this.extractFaceValues(keypoints);

    if (!this.baseline) {
      return {
        hasFace: true,
        hasBaseline: false,
        tag: null,
        intensity: 0,
        scores: {
          eye: null,
          brow: null,
          mouth: null
        }
      };
    }

    let compared = this.compareFaceValues(this.baseline, current);

    return {
      hasFace: true,
      hasBaseline: true,
      tag: compared.tag,
      intensity: compared.intensity,
      scores: {
        eye: compared.eyeScore,
        brow: compared.browScore,
        mouth: compared.mouthScore
      }
    };
  }

  emptyFaceData(tag, hasBaseline) {
    return {
      hasFace: false,
      hasBaseline: hasBaseline,
      tag: tag,
      intensity: 0,
      scores: {
        eye: null,
        brow: null,
        mouth: null
      }
    };
  }

  extractFaceValues(keypoints) {
    return {
      eyeOpen: this.getEyeOpen(keypoints),
      browDist: this.getBrowDistance(keypoints),
      mouthCorner: this.getMouthCorner(keypoints),
      mouthOpen: this.getMouthOpen(keypoints)
    };
  }

  getEyeOpen(keypoints) {
    if (!this.hasPoints(keypoints, [33, 133, 159, 145, 362, 263, 386, 374])) {
      return null;
    }

    let leftEyeW = this.getDistance(keypoints[33], keypoints[133]);
    let leftEyeH = this.getDistance(keypoints[159], keypoints[145]);
    let rightEyeW = this.getDistance(keypoints[362], keypoints[263]);
    let rightEyeH = this.getDistance(keypoints[386], keypoints[374]);

    if (leftEyeW === 0 || rightEyeW === 0) {
      return null;
    }

    return ((leftEyeH / leftEyeW) + (rightEyeH / rightEyeW)) / 2;
  }

  getBrowDistance(keypoints) {
    if (!this.hasPoints(keypoints, [105, 159, 334, 386])) {
      return null;
    }

    let left = keypoints[159][1] - keypoints[105][1];
    let right = keypoints[386][1] - keypoints[334][1];

    return (left + right) / 2;
  }

  getMouthCorner(keypoints) {
    if (!this.hasPoints(keypoints, [61, 291, 13, 14])) {
      return null;
    }

    let mouthWidth = this.getDistance(keypoints[61], keypoints[291]);

    if (mouthWidth === 0) {
      return null;
    }

    let cornerY = (keypoints[61][1] + keypoints[291][1]) / 2;
    let centerY = (keypoints[13][1] + keypoints[14][1]) / 2;

    return (cornerY - centerY) / mouthWidth;
  }

  getMouthOpen(keypoints) {
    if (!this.hasPoints(keypoints, [13, 14, 61, 291])) {
      return null;
    }

    let mouthWidth = this.getDistance(keypoints[61], keypoints[291]);

    if (mouthWidth === 0) {
      return null;
    }

    return this.getDistance(keypoints[13], keypoints[14]) / mouthWidth;
  }

  compareFaceValues(base, current) {
    let scores = {
      eyeScore: null,
      browScore: null,
      mouthScore: null,
      intensity: 0,
      tag: "중립"
    };

    if (base.eyeOpen !== null && current.eyeOpen !== null) {
      let eyeChange = base.eyeOpen - current.eyeOpen;
      scores.eyeScore = this.normalizeSignedScore(eyeChange, expressionTuning.eyeMaxChange);
    }

    if (base.browDist !== null && current.browDist !== null) {
      let browChange = base.browDist - current.browDist;
      scores.browScore = this.normalizeSignedScore(browChange, expressionTuning.browMaxChange);
    }

    if (base.mouthCorner !== null && current.mouthCorner !== null) {
      let mouthChange = current.mouthCorner - base.mouthCorner;
      scores.mouthScore = this.normalizeSignedScore(mouthChange, expressionTuning.mouthCurveMaxChange);
    }

    if (base.mouthOpen !== null && current.mouthOpen !== null) {
      let mouthOpenChange = current.mouthOpen - base.mouthOpen;

      if (mouthOpenChange > expressionTuning.mouthOpenIgnoreChange) {
        scores.mouthScore = null;
      }
    }

    scores.intensity = this.getTotalIntensity(scores);
    scores.tag = this.getExpressionTag(scores);

    return scores;
  }

  normalizeSignedScore(value, maxValue) {
    return constrain(value / maxValue, -1, 1);
  }

  getTotalIntensity(scores) {
    let total = 0;
    let weight = 0;

    if (scores.browScore !== null) {
      total += abs(scores.browScore) * 0.4;
      weight += 0.4;
    }

    if (scores.eyeScore !== null) {
      total += abs(scores.eyeScore) * 0.3;
      weight += 0.3;
    }

    if (scores.mouthScore !== null) {
      total += abs(scores.mouthScore) * 0.3;
      weight += 0.3;
    }

    if (weight === 0) {
      return 0;
    }

    return total / weight;
  }

  getExpressionTag(scores) {
    let brow = scores.browScore;
    let eye = scores.eyeScore;
    let mouth = scores.mouthScore;

    if (scores.intensity < expressionTuning.neutralThreshold) {
      return "중립";
    }

    if (brow !== null && brow > expressionTuning.tagThreshold) {
      return "짜증";
    }

    if (brow !== null && brow < -expressionTuning.tagThreshold) {
      return "놀람";
    }

    if (mouth !== null && mouth > expressionTuning.tagThreshold) {
      return "슬픔";
    }

    if (mouth !== null && mouth < -expressionTuning.tagThreshold) {
      return "해탈";
    }

    if (eye !== null && eye > expressionTuning.tagThreshold) {
      return "긴장";
    }

    return "미묘함";
  }

  getDistance(p1, p2) {
    let dx = p1[0] - p2[0];
    let dy = p1[1] - p2[1];

    return sqrt(dx * dx + dy * dy);
  }

  hasPoints(keypoints, indexes) {
    for (let i = 0; i < indexes.length; i++) {
      let p = keypoints[indexes[i]];

      if (!p || isNaN(p[0]) || isNaN(p[1])) {
        return false;
      }
    }

    return true;
  }
}

class TypingSpeedTracker {
  constructor() {
    this.keyCount = 0;
  }

  recordKey() {
    this.keyCount += 1;
  }

  consumeKeysPerSecond() {
    let keysPerSecond = this.keyCount;
    this.keyCount = 0;

    return keysPerSecond;
  }
}
