function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.centerOffsetX = 0;
    this.centerOffsetY = 0;
    this.neighbours = {};
    this.connectionsOut = [];
    this.connectionsIn = [];
    this.underBridge = false;
    this.parentCell = null;
    this.bridgeToParent = false;
  }
}

class Grid {
  constructor(width, height, cells, directions, reversingTable, directionWalls, start, finish) {
    this.width = width;
    this.height = height;
    this.cells = cells;
    this.directions = directions;
    this.directionReversingTable = reversingTable;
    this.directionWalls = directionWalls;
    this.start = start;
    this.finish = finish;
  }
}

export class Maze {
  constructor(grid, seed) {
    this.grid = grid
    this.openCells = [];
    this.currentCell = this.grid.start;
    this.bridgeChance = 1.0;
    this.randomNumberFunction = mulberry32(seed ?? (Math.floor(Math.random() * 2147483647) + 1));
  }
  
  generate() {
    while (this.openCells.length > 0 || this.currentCell == this.grid.start) {
      this.performGenerationStep();
    }
  }
  
  performGenerationStep() {
    if (this.openCells.length == 0 && this.currentCell != this.grid.start) {
      return;
    }
    
    const directions = [];
    for (const direction in this.currentCell.neighbours) {
      const neighbour = this.currentCell.neighbours[direction];
      if (!this.currentCell.connectionsOut.includes(direction) && !this.currentCell.connectionsIn.includes(direction)) {
        
        const bridgeTo = neighbour.neighbours[direction];
        
        if (neighbour.connectionsIn.length == 0 && neighbour.connectionsOut.length == 0) {
          directions.push(direction);
        } else if (bridgeTo != null && !neighbour.underBridge && bridgeTo.connectionsIn.length == 0 && bridgeTo.connectionsOut.length == 0) {
          if (this.randomNumberFunction() < this.bridgeChance) {
            directions.push([direction, direction]);
          }
        }
      }
    }
    
    let bridgeFound = false;
    for (let direction of directions) {
      if (direction.length == 2) {
        bridgeFound = true;
        break
      }
    }
    if (bridgeFound) {
      for (let i = directions.length - 1; i >= 0; i--) {
        if (directions[i].length != 2) {
          directions.splice(i, 1);
        }
      }
    }
    
    if (directions.length == 0 || this.currentCell == this.grid.finish) {
      this.openCells.splice(this.openCells.indexOf(this.currentCell), 1);
      // this.currentCell = this.openCells[Math.floor(Math.random() * this.openCells.length)];
      this.currentCell = this.openCells[0];
      // this.currentCell = this.openCells[this.openCells.length - 1];
      this.performGenerationStep();
      return;
    }
    
    const direction = directions[Math.floor(this.randomNumberFunction() * directions.length)];
    
    let nextCell;
    
    if (Array.isArray(direction) && direction.length == 2) {
      nextCell = this.currentCell.neighbours[direction[0]].neighbours[direction[1]];
      
      this.currentCell.underBridge = true;
      this.currentCell.neighbours[direction[0]].underBridge = true;
      nextCell.underBridge = true;
      
      this.currentCell.connectionsOut.push(direction);
      nextCell.connectionsIn.push([this.grid.directionReversingTable[direction[0]], this.grid.directionReversingTable[direction[1]]]);
      
      nextCell.bridgeToParent = true;
    } else {
      nextCell = this.currentCell.neighbours[direction];
      
      this.currentCell.connectionsOut.push(direction);
      nextCell.connectionsIn.push(this.grid.directionReversingTable[direction]);
      
      nextCell.bridgeToParent = false;
    }
    
    this.openCells.push(this.currentCell);
    nextCell.parentCell = this.currentCell;
    this.currentCell = nextCell;
  }
  
  draw(context, options) {
    
    if (options === undefined) {
      options = {};
    }
    options.wallColor = options.wallColor ?? "#000";
    options.bridgeColor = options.bridgeColor ?? "#666";
    options.backgroundColor = options.backgroundColor ?? "#fff";
    options.showSolution = options.showSolution ?? false;
    
    context.fillStyle = options.backgroundColor;
    context.strokeStyle = options.wallColor;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    
    const scaleX = context.canvas.clientWidth / this.grid.width;
    const scaleY = context.canvas.clientHeight / this.grid.height;
    
    const lineWidth = Math.min(scaleX / 10, scaleY / 10);
    
    if (this.grid.directions.length == 4) {
      context.lineCap = "square";
    } else {
      context.lineCap = "round";
    }
    context.lineWidth = lineWidth;
    
    let bridges = [];
    
    context.beginPath();
    
    for (const cell of this.grid.cells) {
      
      const walledDirections = [...this.grid.directions];
      
      for (const connection of cell.connectionsOut) {
        if (walledDirections.indexOf(connection) != -1) {
          walledDirections.splice(walledDirections.indexOf(connection), 1);
        }
        
        if (Array.isArray(connection) && connection.length == 2) {
          bridges.push([cell, cell.neighbours[connection[0]].neighbours[connection[1]]]);
        }
      }
      
      for (const connection of cell.connectionsIn) {
        if (walledDirections.indexOf(connection) != -1) {
          walledDirections.splice(walledDirections.indexOf(connection), 1);
        }
      }
      
      for (const direction of walledDirections) {
        const line = this.grid.directionWalls[direction];
        context.moveTo((cell.x + line[0][0]) * scaleX, (cell.y + line[0][1]) * scaleY);
        context.lineTo((cell.x + line[1][0]) * scaleX, (cell.y + line[1][1]) * scaleY);
      }
    }
    
    context.stroke();
    
    function drawSolutionLineSegment(line) {
      context.beginPath();
      context.lineWidth = lineWidth;
      context.strokeStyle = line[2];
      context.lineCap = "round";
      context.moveTo(...line[0]);
      context.lineTo(...line[1]);
      context.stroke();
    }
    
    function drawBridge(bridge) {
      const wallFudgeFactor = 6;
      const pathFudgeFactor = 7;
      const bridgeWidth = 4.5;
      const bridgeRailThickness = 1;
      context.lineCap = "butt";
      
      context.lineWidth = lineWidth * bridgeWidth;
      context.strokeStyle = options.bridgeColor;
      context.beginPath();
      context.moveTo((bridge[0].x + bridge[0].centerOffsetX + (bridge[1].x - bridge[0].x) / wallFudgeFactor) * scaleX, (bridge[0].y + bridge[0].centerOffsetY + (bridge[1].y - bridge[0].y) / wallFudgeFactor) * scaleY);
      context.lineTo((bridge[1].x + bridge[1].centerOffsetX + (bridge[0].x - bridge[1].x) / wallFudgeFactor) * scaleX, (bridge[1].y + bridge[1].centerOffsetY + (bridge[0].y - bridge[1].y) / wallFudgeFactor) * scaleY);
      context.stroke();
      context.beginPath();
      context.strokeStyle = options.backgroundColor;
      context.lineWidth = lineWidth * (bridgeWidth - bridgeRailThickness);
      context.moveTo((bridge[0].x + bridge[0].centerOffsetX + (bridge[1].x - bridge[0].x) / pathFudgeFactor) * scaleX, (bridge[0].y + bridge[0].centerOffsetY + (bridge[1].y - bridge[0].y) / pathFudgeFactor) * scaleY);
      context.lineTo((bridge[1].x + bridge[1].centerOffsetX + (bridge[0].x - bridge[1].x) / pathFudgeFactor) * scaleX, (bridge[1].y + bridge[1].centerOffsetY + (bridge[0].y - bridge[1].y) / pathFudgeFactor) * scaleY);
      context.stroke();
    }
    
    const lines = [];
    const linesAbove = [];
    
    if (options.showSolution) {
      let cell = this.currentCell ?? this.grid.finish;
      while (cell.parentCell != undefined) {
        const line = [
          [(cell.x + cell.centerOffsetX) * scaleX, (cell.y + cell.centerOffsetY) * scaleY],
          [(cell.parentCell.x + cell.centerOffsetX) * scaleX, (cell.parentCell.y + cell.centerOffsetY) * scaleY],
          "red",
        ];
        if (cell.bridgeToParent) {
          linesAbove.push(line);
        }
        
        lines.push(line);
        
        cell = cell.parentCell;
      }
    }
    
    const angleStep = 5;
    let angle = 0;
    
    for (const line of lines) {
      const gradient = context.createLinearGradient(line[0][0], line[0][1], line[1][0], line[1][1]);
      gradient.addColorStop(0, `hsl(${angle}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle + angleStep}, 100%, 50%)`);
      line[2] = gradient;
      angle += angleStep;
    }
    
    for (const line of lines) {
      drawSolutionLineSegment(line);
    }
    
    for (const bridge of bridges) {
      drawBridge(bridge);
    }
    
    for (const line of linesAbove) {
      drawSolutionLineSegment(line);
    }
  }
}

export function generateSquareGrid(width, height) {
  const grid = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[x] === undefined) {
        grid[x] = {};
      }
      grid[x][y] = new Cell(x, y);
      grid[x][y].centerOffsetX = 0.5;
      grid[x][y].centerOffsetY = 0.5;
    }
  }
  
  const cells = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x - 1 >= 0) {
        grid[x - 1][y].neighbours["r"] = grid[x][y];
        grid[x][y].neighbours["l"] = grid[x - 1][y];
      }
      if (x + 1 < width) {
        grid[x + 1][y].neighbours["l"] = grid[x][y];
        grid[x][y].neighbours["r"] = grid[x + 1][y];
      }
      if (y - 1 >= 0) {
        grid[x][y - 1].neighbours["d"] = grid[x][y];
        grid[x][y].neighbours["u"] = grid[x][y - 1];
      }
      if (y + 1 < height) {
        grid[x][y + 1].neighbours["u"] = grid[x][y];
        grid[x][y].neighbours["d"] = grid[x][y + 1];
      }
      cells.push(grid[x][y]);
    }
  }
  
  return new Grid(
    width,
    height,
    cells,
    ["r", "l", "d", "u"],
    { "r": "l", "l": "r", "d": "u", "u": "d" },
    {
      "r": [[1, 0], [1, 1]],
      "l": [[0, 0], [0, 1]],
      "d": [[0, 1], [1, 1]],
      "u": [[0, 0], [1, 0]],
    },
    grid[0][0],
    grid[width - 1][height - 1]);
}
