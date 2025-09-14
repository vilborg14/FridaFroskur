

var gl, program;
var canvas, scoreEl;

// Shader stöður
var vPositionLoc, uTranslateLoc, uScaleLoc, uColorLoc;

// Buffers
var quadBuffer, triBuffer;

// Breytur
var score = 0;

var LANE_COUNT = 5;
var roadTop = 0.6;
var roadBottom = -0.6;
var sidewalkH = 0.15;

// Reitir sem Fríða hoppar á
var hopRows = (function () {
  var rows = [];
  var laneH = (roadTop - roadBottom) / LANE_COUNT;

  rows.push(roadBottom - sidewalkH * 0.5); 
  for (var i = 0; i < LANE_COUNT; i++) {
    rows.push(roadBottom + laneH * (i + 0.5));
  }
  rows.push(roadTop + sidewalkH * 0.5); 
  return rows;
})();

// Fríða 
var frog = {
  w: 0.08, h: 0.08,
  x: 0.0,
  row: 0,                 
  get y() { return hopRows[this.row]; },
  set y(v) {},           
  dirY: +1,
  stepX: 0.08
};
function frogY() { return hopRows[frog.row]; }


var LANE_SPEEDS = [0.35, 0.45, 0.60, 0.75, 0.90];  
var LANE_DIRS   = [+1, -1, +1, -1, +1];

// Bílar
function makeCar(laneIndex, xStartFactor) {
  var laneH = (roadTop - roadBottom) / LANE_COUNT;
  var laneCenter = roadBottom + laneH * (laneIndex + 0.5);
  var dir = LANE_DIRS[laneIndex];
  var speed = LANE_SPEEDS[laneIndex];
  var startX = (dir > 0 ? -1.2 : 1.2) + (dir * (xStartFactor || 0) * 1.2);

  return {
    w: 0.18, h: 0.10,
    x: startX,
    y: laneCenter,
    speed: speed,
    dir: dir,
    color: vec4(Math.random()*0.6+0.2, Math.random()*0.6+0.2, Math.random()*0.6+0.2, 1)
  };
}

var cars = [
  makeCar(0, 0.00),
  makeCar(1, 0.25),
  makeCar(2, 0.50),
  makeCar(3, 0.75),
  makeCar(4, 1.00),
];


// Uppsetning
window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  scoreEl = document.getElementById("score");

  
  frog.row = 0;   
  frog.dirY = +1;

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) { alert("WebGL isn't available"); return; }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  vPositionLoc = gl.getAttribLocation(program, "vPosition");
  uTranslateLoc = gl.getUniformLocation(program, "uTranslate");
  uScaleLoc     = gl.getUniformLocation(program, "uScale");
  uColorLoc     = gl.getUniformLocation(program, "uColor");

  var quad = [
    vec2(-0.5, -0.5), vec2( 0.5, -0.5), vec2( 0.5,  0.5),
    vec2(-0.5, -0.5), vec2( 0.5,  0.5), vec2(-0.5,  0.5)
  ];
  quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(quad), gl.STATIC_DRAW);

  
  var tri = [
    vec2(0.0,  0.6),
    vec2(-0.6, -0.6),
    vec2(0.6, -0.6)
  ];
  triBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(tri), gl.STATIC_DRAW);


  window.addEventListener("keydown", onKeyDown);


  lastTime = performance.now();
  window.requestAnimFrame(render);
};

// Föllin sem teikna
function bindAndDraw(buffer, count) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(vPositionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPositionLoc);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}

function drawRect(x, y, w, h, color) {
  gl.uniform2fv(uTranslateLoc, vec2(x, y));
  gl.uniform2fv(uScaleLoc,     vec2(w, h));
  gl.uniform4fv(uColorLoc,     color);
  bindAndDraw(quadBuffer, 6);
}

function drawTriangle(x, y, w, h, color, flipY) {
  gl.uniform2fv(uTranslateLoc, vec2(x, y));
  gl.uniform2fv(uScaleLoc,     vec2(w, h * (flipY ? -1.0 : 1.0)));
  gl.uniform4fv(uColorLoc,     color);
  bindAndDraw(triBuffer, 3);
}
function drawDashedLineAcrossRoad(y, dashW = 0.12, gapW = 0.08, thick = 0.02, color = vec4(1,1,1,1)) {
  // hvít punktalína
  var cx = -1 + dashW * 0.5;
  while (cx < 1) {
    drawRect(cx, y, dashW, thick, color);
    cx += dashW + gapW;
  }
}

function drawScene() {
  // Gangstéttir
  drawRect(0, roadTop + sidewalkH*0.5, 2.0, sidewalkH, vec4(0.9,0.9,0.9,1));
  drawRect(0, roadBottom - sidewalkH*0.5, 2.0, sidewalkH, vec4(0.9,0.9,0.9,1));

  // Gata
  drawRect(0, (roadTop+roadBottom)/2.0, 2.0, (roadTop-roadBottom), vec4(0.15,0.15,0.18,1));

  // Línur á milli
  var laneH = (roadTop - roadBottom) / LANE_COUNT;
  for (var i = 1; i < LANE_COUNT; i++) {
  var y = roadBottom + laneH * i;        
  drawDashedLineAcrossRoad(y, 0.12, 0.08, 0.02, vec4(1,1,1,1));
}

  // Fríða 
  drawTriangle(frog.x, frogY(), frog.w, frog.h, vec4(0.1,0.7,0.2,1), frog.dirY < 0);

  // Bílar
  for (var i=0; i<cars.length; i++) {
    var c = cars[i];
    drawRect(c.x, c.y, c.w, c.h, c.color);
  }
}

// Hreyfingar og Árekstrar
function aabbIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  // AABB 
  return Math.abs(ax - bx) * 2 < (aw + bw) && Math.abs(ay - by) * 2 < (ah + bh);
}

function resetFrogBottom() {
  frog.x = 0.0;
  frog.row = 0;   
  frog.dirY = +1;

  score = 0;
  scoreEl.textContent = score;
}

function update(dt) {
  // Færa bíla
  for (var i=0; i<cars.length; i++) {
    var c = cars[i];
    c.x += c.dir * c.speed * dt;

    if (c.dir > 0 && c.x - c.w/2 > 1.2) c.x = -1.2 - c.w/2;
    if (c.dir < 0 && c.x + c.w/2 < -1.2) c.x =  1.2 + c.w/2;
  }

  /// Árekstrar: nota y frá row
var fy = frogY();
for (var i=0; i<cars.length; i++) {
  var c = cars[i];
  if (aabbIntersect(frog.x, fy, frog.w, frog.h, c.x, c.y, c.w, c.h)) {
    resetFrogBottom();
    break;
  }
}


}

// Inntak
function onKeyDown(e) {
  switch (e.keyCode) {
    // vinstri
    case 37: 
      frog.x = Math.max(-1 + frog.w/2, frog.x - frog.stepX);
      break;
    // hægri
    case 39: 
      frog.x = Math.min( 1 - frog.w/2, frog.x + frog.stepX);
      break;
      // upp
    case 38: 
      var prevRow=frog.row
      frog.row = Math.min(hopRows.length - 1, frog.row + 1);
      frog.dirY = +1;
      if (prevRow === hopRows.length - 2 && frog.row === hopRows.length - 1) {
      score++;
      scoreEl.textContent = score;
      frog.dirY = -1; 
        }
      break;
      // niður
    case 40: 
      var prevRow = frog.row
      frog.row = Math.max(0, frog.row - 1);
      frog.dirY = -1;
      if (prevRow === 1 && frog.row === 0) {
      score++;
      scoreEl.textContent = score;
      frog.dirY 
      break;
      }
    default:
      return;
  }
  e.preventDefault();
}

// Render lykkja
var lastTime = 0;
function render(now) {
  var dt = (now - lastTime) / 1000.0; 
  lastTime = now;

  gl.clear(gl.COLOR_BUFFER_BIT);

  update(dt);
  drawScene();

  window.requestAnimFrame(render);
}
