class KnitCell {
  constructor(data) {
    this.rawText = data.text;
    this.speed = data.speed;
    this.isBackspace = data.isBackspace;
    this.tension = data.tension;
    this.eye = data.eye;

    this.pos = createVector(width / 2, 220 - CELL_SIZE); 
    this.targetPos = createVector(0, 0); 
    
    this.calculateStyles();
  }

  calculateStyles() {
    this.bgHue = map(this.tension, 0, 1, 0, 360);

    let hueShift = 0;
    if (this.eye === 'NEUTRAL') hueShift = random(-15, 15);
    else if (this.eye === 'FROWN') hueShift = random(30, 60);
    else if (this.eye === 'SURPRISED') hueShift = random(90, 130);
    else if (this.eye === 'BLURRY') hueShift = random(160, 200);

    this.stitchHue = (this.bgHue + hueShift + 360) % 360;

    let baseBri = map(this.speed, 0, 1, 65, 90); 
    this.bgBri = baseBri;
    this.stitchBri = min(baseBri + 10, 100);

    this.sat = map(this.speed, 0, 1, 10, 50); 
  }

  update() {
    this.pos.lerp(this.targetPos, 0.15); 
  }

  display(size, idx) {
    colorMode(HSB, 360, 100, 100);

    if (this.isBackspace) {
      let older = cells[idx + 1];
      if (older && !older.isBackspace && p5.Vector.dist(this.pos, older.pos) < SPACING * 1.5) {
        this.drawBrokenThread(older.pos, this.pos, older.bgHue, older.sat, older.bgBri);
      }
      
      let newer = cells[idx - 1];
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