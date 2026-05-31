// ==========================================
// S4 뜨개 패턴 렌더링
// ==========================================
let cells = [];
let archiveData = []; // 아카이빙 담당 팀원에게 전달할 배열
const CELL_SIZE = 26;
const SPACING = 30;

let gridPath = []; 
let needlePhase = 0;
let currentTypingSpeed = 0; 
let lastSecondSpeedTarget = 0; 

// 해당 초(1000ms) 구간의 실제 타이핑 텍스트 및 특수키 캐싱
let tempBackspaceFlag = false;
let tempText = "";

function setup() {
  createCanvas(1280, 832);
  initGridPath(); 
  
  // 인풋 컨트롤러 초기화
  if (typeof setupKnitstampInput === 'function') {
    setupKnitstampInput();
  }
}

function draw() {
  colorMode(RGB);
  background('#FAFAFA'); 

  // 1. 인풋 시스템 프레임 업데이트
  let prevLen = window.knitstamp && window.knitstamp.seconds ? window.knitstamp.seconds.length : 0;
  
  if (typeof updateKnitstampInput === 'function') {
    updateKnitstampInput(); 
  }

  // 2. 새로운 1초 데이터가 푸시된 순간 셀 생성
  if (window.knitstamp && window.knitstamp.seconds && window.knitstamp.seconds.length > prevLen) {
    let secData = window.knitstamp.seconds[window.knitstamp.seconds.length - 1];
    let kps = secData.input.typing.keysPerSecond;
    let face = secData.input.face;
    
    if (kps > 0 || tempBackspaceFlag) {
      let speedVal = min(kps / 8, 1);
      lastSecondSpeedTarget = speedVal; 
      
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
        mouthScore: face.scores.mouth
      };

      cells.unshift(new KnitCell(newCellData)); 

      archiveData.unshift({
        text: newCellData.text,
        isBackspace: newCellData.isBackspace,
        speed: newCellData.speed,
        tension: newCellData.tension,
        eye: newCellData.eye
      });
    } else {
      lastSecondSpeedTarget = 0; 
    }

    // 1초 단위 캐싱 초기화
    tempBackspaceFlag = false;
    tempText = "";
  }

  // 3. 바늘 보간 및 애니메이션 업데이트
  currentTypingSpeed = lerp(currentTypingSpeed, lastSecondSpeedTarget, 0.1);
  if (currentTypingSpeed > 0.01) {
    let speedMultiplier = map(currentTypingSpeed, 0, 1, 0.5, 2); 
    needlePhase += (TWO_PI / 150) * speedMultiplier; 
  }
  
  drawNeedles(currentTypingSpeed);

  // 4. 셀 렌더링 (최대 75개 제한 최적화)
  for (let i = 0; i < cells.length; i++) {
    if (i >= 75 || cells[i].pos.y > height + 100) continue;

    let target = getGridPosition(i);
    cells[i].targetPos.set(target.x, target.y);
    cells[i].update();
    cells[i].display(CELL_SIZE, i); 
  }
}

function keyPressed() {
  if (keyCode === SHIFT || keyCode === CONTROL || keyCode === ALT || keyCode === ESCAPE) return;

  if (keyCode === BACKSPACE) {
    tempBackspaceFlag = true;
  } else {
    tempText += key;
  }
  
  // 키 타이핑 트래커 기록
  if (typeof recordKnitstampKey === 'function') {
    recordKnitstampKey();
  }
}

// ==========================================
// 형태 및 위치 계산 유틸 함수
// ==========================================
function initGridPath() {
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
}

function getGridPosition(index) {
  let cellPos = gridPath[index] || gridPath[gridPath.length - 1];
  let y = cellPos.r * SPACING + 220; 
  let startX = -((cellPos.w - 1) * SPACING) / 2;
  let x = startX + (cellPos.c * SPACING) + (width / 2);
  return createVector(x, y);
}

function drawNeedles(typingIntensity) {
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
  drawSingleNeedle(heatIntensity);
  pop();

  push();
  let rightSeesaw = sin(needlePhase * 0.85) * 0.06;
  rotate(-PI / 4 + rightSeesaw);
  let rightSlide = sin(needlePhase * 1.3 + PI / 3) * slideBase;
  translate(0, rightSlide); 
  drawSingleNeedle(heatIntensity);
  pop();
  
  pop();
}

function drawSingleNeedle(heatIntensity) {
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