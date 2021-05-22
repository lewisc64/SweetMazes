class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.neighbours = {};
    this.connectionsOut = [];
    this.connectionsIn = [];
    this.underBridge = false;
    this.parentCell = null;
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
  constructor(grid) {
    this.grid = grid
    this.openCells = [];
    this.currentCell = this.grid.start;
    this.bridgeChance = 1.0;
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
        } else if (bridgeTo != null && !this.currentCell.underBridge && !neighbour.underBridge && !bridgeTo.underBridge && bridgeTo.connectionsIn.length == 0 && bridgeTo.connectionsOut.length == 0) {
          if (Math.random() < this.bridgeChance) {
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
    
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    let nextCell;
    
    if (direction.length == 2) {
      nextCell = this.currentCell.neighbours[direction[0]].neighbours[direction[1]];
      
      this.currentCell.neighbours[direction[0]].underBridge = true;
      
      this.currentCell.connectionsOut.push(direction);
      nextCell.connectionsIn.push([this.grid.directionReversingTable[direction[0]], this.grid.directionReversingTable[direction[1]]]);
    } else {
      nextCell = this.currentCell.neighbours[direction];
      
      this.currentCell.connectionsOut.push(direction);
      nextCell.connectionsIn.push(this.grid.directionReversingTable[direction]);
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
    options.bridgeColor = options.bridgeColor ?? "#555";
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
        
        if (connection.length == 2) {
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
    
    const wallFudgeFactor = 6;
    const pathFudgeFactor = 7;
    const bridgeWidth = 4.5;
    
    context.lineCap = "butt";
    
    for (const bridge of bridges) {
      context.lineWidth = lineWidth * bridgeWidth;
      context.strokeStyle = options.bridgeColor;
      context.beginPath();
      context.moveTo((bridge[0].x + 0.5 + (bridge[1].x - bridge[0].x) / wallFudgeFactor) * scaleX, (bridge[0].y + 0.5 + (bridge[1].y - bridge[0].y) / wallFudgeFactor) * scaleY);
      context.lineTo((bridge[1].x + 0.5 + (bridge[0].x - bridge[1].x) / wallFudgeFactor) * scaleX, (bridge[1].y + 0.5 + (bridge[0].y - bridge[1].y) / wallFudgeFactor) * scaleY);
      context.stroke();
      context.strokeStyle = options.backgroundColor;
      context.lineWidth = lineWidth * (bridgeWidth - 1.5);
      context.moveTo((bridge[0].x + 0.5 + (bridge[1].x - bridge[0].x) / pathFudgeFactor) * scaleX, (bridge[0].y + 0.5 + (bridge[1].y - bridge[0].y) / pathFudgeFactor) * scaleY);
      context.lineTo((bridge[1].x + 0.5 + (bridge[0].x - bridge[1].x) / pathFudgeFactor) * scaleX, (bridge[1].y + 0.5 + (bridge[0].y - bridge[1].y) / pathFudgeFactor) * scaleY);
      context.stroke();
    }
    
    if (options.showSolution) {
      context.beginPath();
      
      context.lineWidth = lineWidth;
      context.strokeStyle = "#f00";
      context.lineCap = "round";
      
      let cell = this.currentCell ?? this.grid.finish;
      while (cell.parentCell != undefined) {
        context.moveTo((cell.x + 0.5) * scaleX, (cell.y + 0.5) * scaleY);
        context.lineTo((cell.parentCell.x + 0.5) * scaleX, (cell.parentCell.y + 0.5) * scaleY);
        cell = cell.parentCell;
      }
      
      context.stroke();
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
    }
  }
  
  const cells = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x - 1 >= 0) {
        grid[x - 1][y].neighbours["x+1"] = grid[x][y];
        grid[x][y].neighbours["x-1"] = grid[x - 1][y];
      }
      if (x + 1 < width) {
        grid[x + 1][y].neighbours["x-1"] = grid[x][y];
        grid[x][y].neighbours["x+1"] = grid[x + 1][y];
      }
      if (y - 1 >= 0) {
        grid[x][y - 1].neighbours["y+1"] = grid[x][y];
        grid[x][y].neighbours["y-1"] = grid[x][y - 1];
      }
      if (y + 1 < height) {
        grid[x][y + 1].neighbours["y-1"] = grid[x][y];
        grid[x][y].neighbours["y+1"] = grid[x][y + 1];
      }
      cells.push(grid[x][y]);
    }
  }
  
  return new Grid(
    width,
    height,
    cells,
    ["x+1", "x-1", "y+1", "y-1"],
    { "x+1": "x-1", "x-1": "x+1", "y+1": "y-1", "y-1": "y+1" },
    {
      "x+1": [[1, 0], [1, 1]],
      "x-1": [[0, 0], [0, 1]],
      "y+1": [[0, 1], [1, 1]],
      "y-1": [[0, 0], [1, 0]],
    },
    grid[0][0],
    grid[width - 1][height - 1]);
}
