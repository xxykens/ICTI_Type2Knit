/**
 * [S4] 메인 실시간 뜨개 패턴 방직 및 바늘 애니메이션 그래픽 엔진
 * (💡 sketch.js의 전역 마스터 데이터를 제어합니다)
 */
const page_S4 = {

  // --- 메인 그래픽 업데이트 및 렌더링 ---
  updateAndDraw: function() {
    // 1. 인풋 시스템 프레임 업데이트 감지
    let prevLen = window.knitstamp && window.knitstamp.seconds ? window.knitstamp.seconds.length : 0;
    
    if (typeof updateKnitstampInput === 'function') {
      updateKnitstampInput(); 
    }

    // 2. 새로운 1초 데이터가 푸시된 순간 셀 생성 (전역 배열에 적재)
    if (window.knitstamp && window.knitstamp.seconds && window.knitstamp.seconds.length > prevLen) {
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
        } else if (face.tag === '찌푸림' || face.tag === '무거움') {
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

        // 🌟 [수정] window.을 명시해서 sketch.js 전역 마스터 배열에 확실하게 꽂아줍니다!
        window.cells.unshift(new KnitCell(newCellData)); 
        window.archiveData.unshift({
          text: newCellData.text,
          isBackspace: newCellData.isBackspace,
          speed: newCellData.speed,
          emotionIntensity: newCellData.tension,
          emotionTag: newCellData.eye
        });
      } else {
        lastSecondSpeedTarget = 0; 
      }

      // 1초 단위 전역 캐싱 초기화
      tempBackspaceFlag = false;
      tempText = "";
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
    let y = cellPos.r * SPACING + 220; 
    let startX = -((cellPos.w - 1) * SPACING) / 2;
    let x = startX + (cellPos.c * SPACING) + (width / 2);
    return createVector(x, y);
  },

  drawNeedles: function(typingIntensity) {
    push();
    translate(width / 2, 220 - CELL_SIZE * 0.8); 
    
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

    ctx.fillStyle = grad;
    noStroke();
    
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
