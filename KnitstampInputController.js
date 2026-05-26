window.knitstamp = window.knitstamp || {
  seconds: []
};

let knitstampInputController;

let expressionTuning = {
  eyeMaxChange: 0.035,
  browMaxChange: 8,
  mouthCurveMaxChange: 0.035,
  mouthOpenIgnoreChange: 0.08,
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

  createSecondObject(secondIndex) {
    let faceData = this.faceTracker.getExpressionData();
    let keysPerSecond = this.typingTracker.consumeKeysPerSecond();

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
    let keypoints = this.getKeypoints();

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
    let keypoints = this.getKeypoints();

    if (!keypoints) {
      return this.emptyFaceData("얼굴 없음", false);
    }

    let current = this.extractFaceValues(keypoints);

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
