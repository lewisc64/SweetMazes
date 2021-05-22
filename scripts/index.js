import {Maze, generateSquareGrid} from "./sweetmaze.js";

let maze = new Maze(generateSquareGrid(40, 40));

let context = document.getElementById("display").getContext("2d");

// maze.generate();

function drawMazeLoop() {
  maze.draw(context);
  requestAnimationFrame(drawMazeLoop);
}

setInterval(() => {
  maze.performGenerationStep();
}, 20);

window.addEventListener("load", () => {
  drawMazeLoop();
});
