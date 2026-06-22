class KnitCell {
  constructor(data) {
    this.rawText = data.text;
    this.speed = data.speed;
    this.isBackspace = data.isBackspace;
    this.tension = data.tension;
    this.eye = data.eye;
    this.eyeScore = data.eyeScore;
    this.browScore = data.browScore;
    this.mouthScore = data.mouthScore;
    this.emotionTag = data.tag; // 🌟 [수정 부분 1] 감정 원본 태그를 받도록 추가

    this.pos = createVector(width / 2, 350 - CELL_SIZE);
    this.targetPos = createVector(0, 0);
    
    this.calculateStyles();
  }

  // 🌟 [수정 부분 2] calculateStyles 함수 전체 교체
  calculateStyles() {
    // 1. 7개의 감정 그룹별 베이스 색상 (360도 7등분, 약 51.4도 간격)
    let baseHue = 0;
    
    if (this.emotionTag === '짜증') {
      baseHue = 0;       // 빨강
    } else if (this.emotionTag === '중립') {
      baseHue = 51;      // 노랑
    } else if (this.emotionTag === '해탈') {
      baseHue = 103;     // 초록
    } else if (this.emotionTag === '놀람') {
      baseHue = 309;     // 마젠타/핑크
    } else if (this.emotionTag === '슬픔') {
      baseHue = 206;     // 파랑
    } else if (this.emotionTag === '긴장') {
      baseHue = 257;     // 보라
    } else {
      // '미묘함', '얼굴 없음', '기준값 없음' 등 예외 처리
      baseHue = 154;     // 청록
    }

    // 2. 셀 배경 색: 텐션뿐만 아니라 eye/brow/mouth 감정 수치에 따라서도 색상을 조정
    let scoreHueShift = 0;
    if (this.browScore !== null && this.browScore !== undefined) {
      scoreHueShift += map(this.browScore, -1, 1, -30, 30) * 0.4;
    }
    if (this.eyeScore !== null && this.eyeScore !== undefined) {
      scoreHueShift += map(this.eyeScore, -1, 1, -30, 30) * 0.3;
    }
    if (this.mouthScore !== null && this.mouthScore !== undefined) {
      scoreHueShift += map(this.mouthScore, -1, 1, -30, 30) * 0.3;
    }

    let tensionHueShift = map(this.tension, 0, 1, -15, 15);
    let hueShift = constrain(scoreHueShift + tensionHueShift, -45, 45);
    this.bgHue = (baseHue + hueShift + 360) % 360;

    // 3. 코 색 (배경 색상에서 -30 ~ +30 랜덤 매핑)
    let randomShift = random(-30, 30);
    this.stitchHue = (this.bgHue + randomShift + 360) % 360;

    // 4. 명도 및 채도
    let baseBri = map(this.speed, 0, 1, 55, 80);

    if (this.emotionTag === '중립' || this.emotionTag === '해탈') {
      baseBri = min(baseBri + 10, 100);
    }

    if (this.emotionTag === '얼굴 없음' || this.emotionTag === '기준값 없음') {
      baseBri = 95;
      this.sat = 15;
    } else {
      this.sat = map(this.speed, 0, 1, 10, 50);
    }

    this.bgBri = baseBri;
    this.stitchBri = min(baseBri + 10, 100);
  }

  update() {
    this.pos.lerp(this.targetPos, 0.15); 
  }

  display(size, idx) {
    colorMode(HSB, 360, 100, 100);

    if (this.isBackspace) {
      let older = cells[idx + 1] || window.cells[idx + 1];
      if (older && !older.isBackspace && p5.Vector.dist(this.pos, older.pos) < SPACING * 1.5) {
        this.drawBrokenThread(older.pos, this.pos, older.bgHue, older.sat, older.bgBri);
      }
      
      let newer = cells[idx - 1] || window.cells[idx - 1];
      if (newer && !newer.isBackspace && p5.Vector.dist(this.pos, newer.pos) < SPACING * 1.5) {
        this.drawBrokenThread(newer.pos, this.pos, newer.bgHue, newer.sat, newer.bgBri);
      }
      return; 
    }

    push();
    translate(this.pos.x, this.pos.y);

    let isFilled = this.speed >= 0.6;
    let actualSize = isFilled ? size : size - 4; 

    if (isFilled) {
      fill(this.bgHue, this.sat, this.bgBri);
      noStroke();
    } else {
      noFill();
      stroke(this.bgHue, this.sat, this.bgBri);
      let sw = map(this.speed, 0, 0.6, 1.5, 4); 
      strokeWeight(sw);
    }

    if (this.tension >= 0.5) {
      rectMode(CENTER);
      rect(0, 0, actualSize, actualSize, 6); 
    } else {
      ellipse(0, 0, actualSize, actualSize); 
    }

    let r = size * 0.3; 
    stroke(this.stitchHue, this.sat, this.stitchBri);
    strokeWeight(2);
    noFill();

    if (this.eye === 'FROWN') { 
      line(-r, -r, r, r);
      line(r, -r, -r, r);
    } else if (this.eye === 'SURPRISED') { 
      beginShape();
      for (let i = 0; i < 8; i++) {
        let radius = i % 2 === 0 ? r : r * 0.4;
        let angle = PI / 4 * i;
        vertex(cos(angle) * radius, sin(angle) * radius);
      }
      endShape(CLOSE);
    } else { 
      beginShape();
      vertex(-r, -r);
      vertex(0, r * 0.8);
      vertex(r, -r);
      endShape();
    }

    pop();
  }

  drawBrokenThread(neighborPos, centerPos, hue, sat, bri) {
    push();
    colorMode(HSB, 360, 100, 100);
    stroke(hue, sat, bri);
    strokeWeight(3.5);
    strokeCap(SQUARE);
    noFill();
    
    let dir = p5.Vector.sub(centerPos, neighborPos);
    dir.normalize();
    let ortho = createVector(-dir.y, dir.x);
    
    let startDist = CELL_SIZE * 0.35; 
    let offset = 4; 
    let len1 = 12;  
    let len2 = 7;   
    
    let p1Start = p5.Vector.add(neighborPos, p5.Vector.mult(dir, startDist));
    p1Start.add(p5.Vector.mult(ortho, offset));
    let p1End = p5.Vector.add(p1Start, p5.Vector.mult(dir, len1));
    line(p1Start.x, p1Start.y, p1End.x, p1End.y);
    
    let p2Start = p5.Vector.add(neighborPos, p5.Vector.mult(dir, startDist));
    p2Start.sub(p5.Vector.mult(ortho, offset));
    let p2End = p5.Vector.add(p2Start, p5.Vector.mult(dir, len2));
    line(p2Start.x, p2Start.y, p2End.x, p2End.y);
    
    pop();
  }
}