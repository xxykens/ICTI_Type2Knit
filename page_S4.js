/**
 * [S4] 메인 실시간 뜨개 패턴 방직 및 바늘 애니메이션 그래픽 엔진
 * (💡 sketch.js의 전역 마스터 데이터를 제어합니다)
 */
const page_S4 = {

  _prevKnitstampLen: 0,
  // --- 메인 그래픽 업데이트 및 렌더링 ---
  updateAndDraw: function() {
      if (window.knitstamp && window.knitstamp.seconds && window.knitstamp.seconds.length > this._prevKnitstampLen) {
    this._prevKnitstampLen = window.knitstamp.seconds.length;
      let secData = window.knitstamp.seconds[window.knitstamp.seconds.length - 1];
      let kps = secData.input.typing.keysPerSecond;
      let face = secData.input.face;
      
      if (kps > 0 || tempBackspaceFlag) {
        let speedVal = min(kps / 8, 1);
        lastSecondSpeedTarget = speedVal; // 전역 변수 갱신
        
        // 감정 매핑: mouthScore (-1~1) -> Tension (0~1)
        let cellTension = 0.5; 
        if (face.hasFace && face.hasBaseline && face.scores.mouth !== null) {
          cellTension = map(face.scores.mouth, -1, 1, 0, 1);
        }

        // 눈 감정 매핑
        let cellEye = 'NEUTRAL';
        if (!face.hasFace) {
          cellEye = 'BLURRY';
        } else if (face.tag === '짜증' || face.tag === '슬픔') {
          cellEye = 'FROWN';
        } else if (face.tag === '놀람') {
          cellEye = 'SURPRISED';
        }
        
        let newCellData = {
          text: tempText,
          speed: speedVal,
          isBackspace: tempBackspaceFlag,
          tension: cellTension,
          eye: cellEye,
          eyeScore: face.scores.eye,
          browScore: face.scores.brow,
          mouthScore: face.scores.mouth,
          tag: face.tag
        };

        // KnitCell 인스턴스를 먼저 생성해 계산된 색상값(bgHue 등)을 archiveData에 함께 보존
        let _newCell = new KnitCell(newCellData);
        window.cells.unshift(_newCell);
        window.archiveData.unshift({
          text:             newCellData.text,
          isBackspace:      newCellData.isBackspace,
          speed:            newCellData.speed,
          emotionIntensity: newCellData.tension,
          emotionTag:       newCellData.eye,       // 패턴 모양용 영문 (FROWN/SURPRISED/…)
          emotionTagKo:     face.tag,              // 표시용 원본 한국어 (짜증/놀람/…)
          // S4 실시간 렌더 값 그대로 보존 → S7/S8에서 재계산 없이 동일하게 표현
          bgHue:    _newCell.bgHue,
          stitchHue: _newCell.stitchHue,
          sat:      _newCell.sat,
          bgBri:    _newCell.bgBri,
          stitchBri: _newCell.stitchBri
        });
      } else {
        lastSecondSpeedTarget = 0; 
      }

      // 1초 단위 전역 캐싱 초기화
      tempBackspaceFlag = false;
      tempText = '';
      const _ta = document.getElementById('typing-capture');
      if (_ta) window._tempTextBaseline = _ta.value.length;
    }

    // 3. 바늘 보간 및 애니메이션 업데이트 (전역 변수 활용)
    currentTypingSpeed = lerp(currentTypingSpeed, lastSecondSpeedTarget, 0.1);
    if (currentTypingSpeed > 0.01) {
      let speedMultiplier = map(currentTypingSpeed, 0, 1, 0.5, 2); 
      needlePhase += (TWO_PI / 150) * speedMultiplier; 
    }
    
    this.drawNeedles(currentTypingSpeed);

    // 4. 셀 렌더링 (전역 cells 배열 순회)
    // =======================================================
    if (window.cells) { // window.cells가 존재할 때만 안전하게 실행되도록 방어 코드 추가
      for (let i = 0; i < window.cells.length; i++) {
        if (i >= 75 || window.cells[i].pos.y > height + 100) continue;

        let target = this.getGridPosition(i);
        window.cells[i].targetPos.set(target.x, target.y);
        window.cells[i].update();
        window.cells[i].display(CELL_SIZE, i); 
      }
    }

    // 5. 대바늘 위 떠다니는 입력 글자 애니메이션
    this.drawFloatingChars();
  },

  // --- 대바늘 위 글자 페이드 애니메이션 ---
  _floatingChars: [],
  _FLOAT_LIFE_MS: 1000,   // 글자가 떠 있는 시간 (1초)
  _FLOAT_RISE: 26,        // 1초 동안 위로 떠오르는 거리(px)

  spawnFloatingChar: function(ch) {
    if (!ch) return;
    // 대바늘 교차점(약간 위)을 기준으로 약간의 좌우 흔들림을 줘서 겹침 방지
    const jitterX = (Math.random() - 0.5) * 24;
    this._floatingChars.push({
      ch: ch,
      bornAt: (typeof millis === 'function') ? millis() : performance.now(),
      jitterX: jitterX
    });
    // 너무 많이 쌓이지 않도록 제한
    if (this._floatingChars.length > 30) this._floatingChars.shift();
  },

  drawFloatingChars: function() {
    if (!this._floatingChars.length) return;
    const now = (typeof millis === 'function') ? millis() : performance.now();
    const baseX = width / 2;
    const baseY = 350 - CELL_SIZE * 0.8 - 18; // 대바늘 교차점 살짝 위

    push();
    colorMode(RGB, 255);                       // 색 모드를 RGB로 고정
    if (window._floatFont) textFont(window._floatFont); // 사이트와 동일 폰트
    textAlign(CENTER, CENTER);
    textSize(18);
    textStyle(NORMAL);
    for (let i = this._floatingChars.length - 1; i >= 0; i--) {
      const f = this._floatingChars[i];
      const age = now - f.bornAt;
      if (age >= this._FLOAT_LIFE_MS) {
        this._floatingChars.splice(i, 1);
        continue;
      }
      const t = age / this._FLOAT_LIFE_MS;      // 0 → 1
      const alpha = 255 * (1 - t);               // 점점 투명
      const y = baseY - this._FLOAT_RISE * t;    // 위로 떠오름
      noStroke();
      fill(26, 26, 26, alpha);                   // 거의 검은색
      text(f.ch, baseX + f.jitterX, y);
    }
    pop();
  },

  // --- 내부 계산 및 드로잉 유틸리티 ---
  initGridPath: function() {
    gridPath.push({r: 0, c: 0, w: 1}); 
    gridPath.push({r: 1, c: 2, w: 3}); 
    gridPath.push({r: 1, c: 1, w: 3});
    gridPath.push({r: 1, c: 0, w: 3});
    for(let c=0; c<5; c++) gridPath.push({r: 2, c: c, w: 5}); 
    for(let c=6; c>=0; c--) gridPath.push({r: 3, c: c, w: 7}); 
    for(let c=0; c<9; c++) gridPath.push({r: 4, c: c, w: 9}); 

    let w = 10;
    for(let r=5; r<500; r++) {
      if (r % 2 === 1) { 
        for(let c=9; c>=0; c--) gridPath.push({r: r, c: c, w: w});
      } else { 
        for(let c=0; c<10; c++) gridPath.push({r: r, c: c, w: w});
      }
    }
  },

  getGridPosition: function(index) {
    let cellPos = gridPath[index] || gridPath[gridPath.length - 1];
    let y = cellPos.r * SPACING + 350; 
    let startX = -((cellPos.w - 1) * SPACING) / 2;
    let x = startX + (cellPos.c * SPACING) + (width / 2);
    return createVector(x, y);
  },

  drawNeedles: function(typingIntensity) {
    push();
    translate(width / 2, 350 - CELL_SIZE * 0.8); 
    
    let slideBase = 8 + typingIntensity * 12; 
    
    let heatIntensity = 0;
    if (typingIntensity > 0.85) {
      heatIntensity = map(typingIntensity, 0.85, 1, 0, 1);
    }

    push();
    let leftSeesaw = cos(needlePhase * 0.7) * 0.06;
    rotate(PI / 4 + leftSeesaw);
    let leftSlide = sin(needlePhase) * slideBase;
    translate(0, leftSlide); 
    this.drawSingleNeedle(heatIntensity);
    pop();

    push();
    let rightSeesaw = sin(needlePhase * 0.85) * 0.06;
    rotate(-PI / 4 + rightSeesaw);
    let rightSlide = sin(needlePhase * 1.3 + PI / 3) * slideBase;
    translate(0, rightSlide); 
    this.drawSingleNeedle(heatIntensity);
    pop();
    
    pop();
  },

  drawSingleNeedle: function(heatIntensity) {
    let ctx = drawingContext;
    let grad = ctx.createLinearGradient(0, -25, 0, 100); 
    
    let r = Math.round(lerp(225, 255, heatIntensity));
    let g = Math.round(lerp(215, 80, heatIntensity));
    let b = Math.round(lerp(195, 80, heatIntensity));
    
    grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
    grad.addColorStop(1, 'rgb(225, 205, 175)');

    fill(255);
    noStroke();
    ctx.fillStyle = grad;
    
    beginShape();
    vertex(-3, -25);   
    vertex(3, -25);
    vertex(7, 350);    
    vertex(-7, 350);
    endShape(CLOSE);
    
    ellipse(0, -25, 6, 6); 
    
    ctx.fillStyle = 'rgb(225, 215, 195)'; 
    ellipse(0, 350, 14, 14);
  }
};

window.page_S4 = page_S4;