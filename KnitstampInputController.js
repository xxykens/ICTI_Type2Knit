window.knitstamp = window.knitstamp || {
  seconds: []
};

let knitstampInputController;

const expressionTuning = {
  eyeMaxChange: 0.035,
  browMaxChange: 8,
  mouthCurveMaxChange: 0.035,
  mouthOpenIgnoreChange: 0.08,
  neutralThreshold: 0.08,
  tagThreshold: 0.16
};

// UI / main sketch에서 setup 때 호출
function setupKnitstampInput() {
  knitstampInputController = new KnitstampInputController({
    faceTracker: new FaceExpressionTracker(640, 480),
    typingTracker: new TypingSpeedTracker(),
    intervalMs: 1000
  });
}

// UI / main sketch에서 draw 때 호출
function updateKnitstampInput() {
  knitstampInputController.update();
}

// UI / main sketch에서 keyPressed 때 호출
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
    const now = millis();

    if (now - this.lastRecordedAt < this.intervalMs) {
      return;
    }

    this.lastRecordedAt = now;

    const second = this.createSecondObject(this.currentSecondIndex);
    window.knitstamp.seconds.push(second);

    this.currentSecondIndex += 1;
  }

  recordKey() {
    this.typingTracker.recordKey();
  }

  registerFaceBaseline() {
    return this.faceTracker.registerBaseline();
  }

  createSecondObject(secondIndex) {
    const faceData = this.faceTracker.getExpressionData();
    const typingData = this.typingTracker.getTypingData();

    return {
      second: secondIndex,
      timestamp: Date.now(),

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
          keysPerSecond: typingData.keysPerSecond,
          intensity: typingData.intensity,
          state: typingData.state
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

    this.video = createCapture(VIDEO);
    this.video.size(w, h);
    this.video.hide();

    this.facemesh = ml5.facemesh(this.video, () => {
      console.log("FaceMesh model loaded");
    });

    this.facemesh.on("predict", (results) => {
      this.predictions = results;
    });
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
    const keypoints = this.getKeypoints();

    if (!keypoints) {
      return {
        success: false,
        reason: "NO_FACE"
      };
    }

    this.baseline = this.extractFaceValues(keypoints);

    return {
      success: true,
      baseline: this.baseline
    };
  }

  getExpressionData() {
    const keypoints = this.getKeypoints();

    if (!keypoints) {
      return this.emptyFaceData("얼굴 없음", false);
    }

    const current = this.extractFaceValues(keypoints);

    if (!this.baseline) {
      return {
        hasFace: true,
        hasBaseline: false,
        tag: "기준값 없음",
        intensity: 0,
        scores: {
          eye: null,
          brow: null,
          mouth: null
        }
      };
    }

    const compared = this.compareFaceValues(this.baseline, current);

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

  extractFaceValues(k) {
    return {
      eyeOpen: this.getEyeOpen(k),
      browDist: this.getBrowDistance(k),
      mouthCorner: this.getMouthCorner(k),
      mouthOpen: this.getMouthOpen(k)
    };
  }

  getEyeOpen(k) {
    if (!this.hasPoints(k, [33, 133, 159, 145, 362, 263, 386, 374])) {
      return null;
    }

    const leftEyeW = this.getDistance(k[33], k[133]);
    const leftEyeH = this.getDistance(k[159], k[145]);
    const rightEyeW = this.getDistance(k[362], k[263]);
    const rightEyeH = this.getDistance(k[386], k[374]);

    if (leftEyeW === 0 || rightEyeW === 0) {
      return null;
    }

    return ((leftEyeH / leftEyeW) + (rightEyeH / rightEyeW)) / 2;
  }

  getBrowDistance(k) {
    if (!this.hasPoints(k, [105, 159, 334, 386])) {
      return null;
    }

    const left = k[159][1] - k[105][1];
    const right = k[386][1] - k[334][1];

    return (left + right) / 2;
  }

  getMouthCorner(k) {
    if (!this.hasPoints(k, [61, 291, 13, 14])) {
      return null;
    }

    const mouthWidth = this.getDistance(k[61], k[291]);

    if (mouthWidth === 0) {
      return null;
    }

    const cornerY = (k[61][1] + k[291][1]) / 2;
    const centerY = (k[13][1] + k[14][1]) / 2;

    return (cornerY - centerY) / mouthWidth;
  }

  getMouthOpen(k) {
    if (!this.hasPoints(k, [13, 14, 61, 291])) {
      return null;
    }

    const mouthWidth = this.getDistance(k[61], k[291]);

    if (mouthWidth === 0) {
      return null;
    }

    return this.getDistance(k[13], k[14]) / mouthWidth;
  }

  compareFaceValues(base, current) {
    const scores = {
      eyeScore: null,
      browScore: null,
      mouthScore: null,
      intensity: 0,
      tag: "중립"
    };

    if (base.eyeOpen !== null && current.eyeOpen !== null) {
      const eyeChange = base.eyeOpen - current.eyeOpen;
      scores.eyeScore = this.normalizeSignedScore(eyeChange, expressionTuning.eyeMaxChange);
    }

    if (base.browDist !== null && current.browDist !== null) {
      const browChange = base.browDist - current.browDist;
      scores.browScore = this.normalizeSignedScore(browChange, expressionTuning.browMaxChange);
    }

    if (base.mouthCorner !== null && current.mouthCorner !== null) {
      const mouthChange = current.mouthCorner - base.mouthCorner;
      scores.mouthScore = this.normalizeSignedScore(mouthChange, expressionTuning.mouthCurveMaxChange);
    }

    if (base.mouthOpen !== null && current.mouthOpen !== null) {
      const mouthOpenChange = current.mouthOpen - base.mouthOpen;

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
    const brow = scores.browScore;
    const eye = scores.eyeScore;
    const mouth = scores.mouthScore;

    if (scores.intensity < expressionTuning.neutralThreshold) {
      return "중립";
    }

    if (brow !== null && brow > expressionTuning.tagThreshold) {
      return "찌푸림";
    }

    if (brow !== null && brow < -expressionTuning.tagThreshold) {
      return "놀람";
    }

    if (mouth !== null && mouth > expressionTuning.tagThreshold) {
      return "무거움";
    }

    if (mouth !== null && mouth < -expressionTuning.tagThreshold) {
      return "풀림";
    }

    if (eye !== null && eye > expressionTuning.tagThreshold) {
      return "긴장";
    }

    return "표정 변화";
  }

  getDistance(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];

    return sqrt(dx * dx + dy * dy);
  }

  hasPoints(k, indexes) {
    for (let i = 0; i < indexes.length; i++) {
      const p = k[indexes[i]];

      if (!p || isNaN(p[0]) || isNaN(p[1])) {
        return false;
      }
    }

    return true;
  }
}

class TypingSpeedTracker {
  constructor() {
    this.keyTimes = [];
    this.windowMs = 3000;
    this.maxKeysPerSecond = 8;
  }

  recordKey() {
    const now = millis();
    this.keyTimes.push(now);
    this.cleanup(now);
  }

  cleanup(now) {
    this.keyTimes = this.keyTimes.filter((time) => {
      return now - time <= this.windowMs;
    });
  }

  getTypingData() {
    const now = millis();
    this.cleanup(now);

    const seconds = this.windowMs / 1000;
    const keysPerSecond = this.keyTimes.length / seconds;
    const intensity = constrain(keysPerSecond / this.maxKeysPerSecond, 0, 1);

    return {
      keysPerSecond: keysPerSecond,
      intensity: intensity,
      state: this.getTypingState(intensity)
    };
  }

  getTypingState(intensity) {
    if (intensity < 0.05) {
      return "idle";
    }

    if (intensity < 0.35) {
      return "slow";
    }

    if (intensity < 0.7) {
      return "medium";
    }

    return "fast";
  }
}
