import { Maze, generateSquareGrid } from "./sweetmaze.js";

const CANVAS_SIZE = 800;

let maze = null;
let previewContext = document.getElementById("display").getContext("2d");

let nextGeneratorStep = Date.now();

function createMaze() {
  const seed = Number(document.getElementById("param-seed").value);
  const width = Number(document.getElementById("param-width").value);
  const height = Number(document.getElementById("param-height").value);
  
  if (width > height) {
    previewContext.canvas.width = CANVAS_SIZE;
    previewContext.canvas.height = CANVAS_SIZE * height / width;
  } else {
    previewContext.canvas.height = CANVAS_SIZE;
    previewContext.canvas.width = CANVAS_SIZE * width / height;
  }
  
  maze = new Maze(generateSquareGrid(width, height), seed);
  maze.bridgeChance = document.getElementById("param-bridge-chance").value;
}

function drawMazeLoop() {
  let now = Date.now();
  if(now > nextGeneratorStep && maze.currentCell != null) {
    maze.performGenerationStep();
    drawMaze(previewContext);
    nextGeneratorStep = now + 10;
  }
  requestAnimationFrame(drawMazeLoop);
}

function drawMaze(ctx) {
  maze.draw(ctx,
    {
      showSolution: document.getElementById("draw-param-show-solution").checked,
      wallColor: document.getElementById("draw-param-wall-color").value,
      bridgeColor: document.getElementById("draw-param-bridge-color").value,
      backgroundColor: document.getElementById("draw-param-background-color").value,
      wonkiness: Number(document.getElementById("draw-param-wonkiness").value),
    });
}

function reseed() {
  document.getElementById("param-seed").value = Math.floor(Math.random() * 2147483647) + 1;
}

function setDefaultOptions() {
  document.getElementById("param-width").value = 20;
  document.getElementById("param-height").value = 20;
  document.getElementById("param-bridge-chance").value = "1.0";
  reseed();
  
  document.getElementById("render-param-pixels-per-cell").value = 40;
  
  document.getElementById("draw-param-show-solution").checked = false;
  document.getElementById("draw-param-wall-color").value = "#000000";
  document.getElementById("draw-param-bridge-color").value = "#666666";
  document.getElementById("draw-param-background-color").value = "#ffffff";
  document.getElementById("draw-param-wonkiness").value = "0.0";
}

for (let elemId of ["param-seed", "param-width", "param-height", "param-bridge-chance"]) {
  document.getElementById(elemId).addEventListener("change", () => {
    createMaze();
  });
}

for (let elemId of ["draw-param-show-solution", "draw-param-wall-color", "draw-param-bridge-color", "draw-param-background-color", "draw-param-wonkiness"]) {
  document.getElementById(elemId).addEventListener("change", () => {
    drawMaze(previewContext);
  });
}

document.getElementById("reseed").addEventListener("click", () => {
  reseed();
  createMaze();
});

document.getElementById("generate-now").addEventListener("click", () => {
  maze.generate();
  drawMaze(previewContext);
});

document.getElementById("reseed-now").addEventListener("click", () => {
  reseed();
  createMaze();
  maze.generate();
  drawMaze(previewContext);
});

document.getElementById("render").addEventListener("click", () => {
  const pixelsPerCell = document.getElementById("render-param-pixels-per-cell").value;
  
  const canvas = document.createElement("canvas");
  
  try {
    document.body.appendChild(canvas);
    
    const renderContext = canvas.getContext("2d");
    
    canvas.width = pixelsPerCell * maze.grid.width;
    canvas.height = pixelsPerCell * maze.grid.height;
    
    if (maze.currentCell != null) {
      maze.generate();
      drawMaze(previewContext);
    }
    drawMaze(renderContext);
    
    const seed = Number(document.getElementById("param-seed").value);
    const width = Number(document.getElementById("param-width").value);
    const height = Number(document.getElementById("param-height").value);
    
    const a = document.createElement("a");
    a.download = `maze_${width}x${height}_${seed}`;
    a.href = canvas.toDataURL();
    try {
      document.body.appendChild(a);
      a.click();
    } finally {
      document.body.removeChild(a);
    }
  } finally {
    document.body.removeChild(canvas);
  }
});

window.addEventListener("load", () => {
  setDefaultOptions();
  createMaze();
  drawMazeLoop();
});
