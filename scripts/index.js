import {Maze, generateSquareGrid} from "./sweetmaze.js";

const CANVAS_SIZE = 800;

let maze = null;
let showSolution = false;
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
  maze.draw(ctx, { showSolution: showSolution });
}

function reseed() {
  document.getElementById("param-seed").value = Math.floor(Math.random() * 2147483647) + 1;
}

function setDefaultOptions() {
  document.getElementById("param-width").value = 20;
  document.getElementById("param-height").value = 20;
  document.getElementById("param-bridge-chance").value = "1.0";
  document.getElementById("param-show-solution").checked = false;
  reseed();
  
  document.getElementById("render-param-pixels-per-cell").value = 40;
}

for (let elemId of ["param-seed", "param-width", "param-height", "param-bridge-chance"]) {
  document.getElementById(elemId).addEventListener("change", () => {
    createMaze();
  });
}

document.getElementById("param-show-solution").addEventListener("change", e => {
  showSolution = e.target.checked;
  drawMaze(previewContext);
});

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
    
    maze.generate();
    drawMaze(renderContext);
    
    window.open(canvas.toDataURL("image/png"), "_blank");
  } finally {
    document.body.removeChild(canvas);
  }
});

window.addEventListener("load", () => {
  setDefaultOptions();
  createMaze();
  drawMazeLoop();
});
