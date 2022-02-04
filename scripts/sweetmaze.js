function createRNG(a) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
  constructor(
    width,
    height,
    cells,
    directions,
    reversingTable,
    directionWalls,
    start,
    finish
  ) {
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
  constructor(grid, seed = null, backtrackFunctionName = 'first') {
    seed = seed || Math.floor(Math.random() * 2147483647) + 1;

    this.grid = grid;
    this.openCells = [];
    this.currentCell = this.grid.start;
    this.lastDirection = null;

    this.bridgeChance = 0.3;
    this.turningProbability = 0.3;

    this.randomNumberFunction = createRNG(seed);

    if (backtrackFunctionName == 'first') {
      this.backtrackFunction = () => {
        this.currentCell = this.openCells[0];
      };
    } else if (backtrackFunctionName == 'last') {
      this.backtrackFunction = () => {
        this.currentCell = this.openCells[this.openCells.length - 1];
      };
    } else if (backtrackFunctionName == 'random') {
      this.backtrackFunction = () => {
        this.currentCell = this.openCells[
          Math.floor(this.randomNumberFunction() * this.openCells.length)
        ];
      };
    } else {
      throw 'unknown backtrack function name';
    }
  }

  getWonkyNumber(wonkFactor) {
    return (Math.random() - 0.5) * wonkFactor / 10;
  }

  backtrack() {
    this.lastDirection = null;
    this.openCells.splice(this.openCells.indexOf(this.currentCell), 1);
    this.backtrackFunction();
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

    let canBridge = false;

    const directions = [];
    for (const direction in this.currentCell.neighbours) {
      const neighbour = this.currentCell.neighbours[direction];
      if (
        !this.currentCell.connectionsOut.includes(direction) &&
        !this.currentCell.connectionsIn.includes(direction)
      ) {
        const bridgeTo = neighbour.neighbours[direction];

        if (
          neighbour.connectionsIn.length == 0 &&
          neighbour.connectionsOut.length == 0
        ) {
          directions.push(direction);
        } else if (
          bridgeTo != null &&
          !this.currentCell.underBridge &&
          !neighbour.underBridge &&
          !bridgeTo.underBridge &&
          bridgeTo.connectionsIn.length == 0 &&
          bridgeTo.connectionsOut.length == 0
        ) {
          if (this.randomNumberFunction() < this.bridgeChance) {
            directions.push([direction, direction]);
            canBridge = true;
          }
        }
      }
    }

    if (canBridge) {
      for (let i = directions.length - 1; i >= 0; i--) {
        if (directions[i].length != 2) {
          directions.splice(i, 1);
        }
      }
    }

    if (directions.length == 0 || this.currentCell == this.grid.finish) {
      this.backtrack();
      this.performGenerationStep();
      return;
    }

    let direction;
    if (
      directions.indexOf(this.lastDirection) != -1 &&
      this.randomNumberFunction() > this.turningProbability
    ) {
      direction = this.lastDirection;
    } else {
      if (
        directions.length >= 2 &&
        directions.indexOf(this.lastDirection) != -1
      ) {
        directions.splice(directions.indexOf(this.lastDirection), 1);
      }
      direction =
        directions[Math.floor(this.randomNumberFunction() * directions.length)];
      this.lastDirection = direction;
    }

    let nextCell;

    if (Array.isArray(direction) && direction.length == 2) {
      nextCell = this.currentCell.neighbours[direction[0]].neighbours[
        direction[1]
      ];

      this.currentCell.underBridge = true;
      this.currentCell.neighbours[direction[0]].underBridge = true;
      nextCell.underBridge = true;

      this.currentCell.connectionsOut.push(direction);
      nextCell.connectionsIn.push([
        this.grid.directionReversingTable[direction[0]],
        this.grid.directionReversingTable[direction[1]],
      ]);

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
    options.wallColor = options.wallColor || '#000';
    options.bridgeColor = options.bridgeColor || '#666666';
    options.backgroundColor = options.backgroundColor || '#fff';
    options.showSolution = options.showSolution || false;
    options.wonkiness = options.wonkiness || 0.0;
    options.enclosed = options.enclosed || false;

    const bufferSize = Math.max(
      context.canvas.clientWidth / this.grid.width,
      context.canvas.clientHeight / this.grid.height
    );
    const xOffset = bufferSize;
    const yOffset = bufferSize;

    context.fillStyle = options.backgroundColor;
    context.strokeStyle = options.wallColor;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    const scale = Math.min(
      (context.canvas.clientWidth - 2 * bufferSize) / this.grid.width,
      (context.canvas.clientHeight - 2 * bufferSize) / this.grid.height
    );
    const scaleX = scale;
    const scaleY = scale;

    const lineWidth = Math.ceil(scale / 10);

    function pointToCanvas(x, y) {
      if (lineWidth == 1) {
        return [
          Math.floor(xOffset + x * scaleX) + 0.5,
          Math.floor(yOffset + y * scaleY) + 0.5,
        ];
      }
      return [xOffset + x * scaleX, yOffset + y * scaleY];
    }

    /* circles
    context.lineWidth = 1;
    for (const cell of this.grid.cells) {
      context.beginPath();
      context.arc(...pointToCanvas(cell.x, cell.y), 0.5 * scaleX, 0, 2 * Math.PI);
      context.stroke();
    }
    // return;
    */

    if (this.grid.directions.length == 4) {
      context.lineCap = 'square';
    } else {
      context.lineCap = 'round';
    }

    context.lineWidth = lineWidth;

    let bridges = [];

    context.beginPath();

    for (const cell of this.grid.cells) {
      if (cell.connectionsIn.length == 0 && cell.connectionsOut.length == 0) {
        continue;
      }

      const walledDirections = [...this.grid.directions];

      for (const connection of cell.connectionsOut) {
        if (walledDirections.indexOf(connection) != -1) {
          walledDirections.splice(walledDirections.indexOf(connection), 1);
        }

        if (Array.isArray(connection) && connection.length == 2) {
          bridges.push([
            cell,
            cell.neighbours[connection[0]].neighbours[connection[1]],
          ]);
        }
      }

      for (const connection of cell.connectionsIn) {
        if (walledDirections.indexOf(connection) != -1) {
          walledDirections.splice(walledDirections.indexOf(connection), 1);
        }
      }

      let wallBroken = false;
      for (const direction of walledDirections) {
        if (
          !options.enclosed &&
          !wallBroken &&
          (cell == this.grid.start || cell == this.grid.finish) &&
          cell.neighbours[direction] == undefined
        ) {
          wallBroken = true;
          continue;
        }
        const line = this.grid.directionWalls[direction];
        context.moveTo(
          ...pointToCanvas(
            cell.x + line[0][0] + this.getWonkyNumber(options.wonkiness),
            cell.y + line[0][1] + this.getWonkyNumber(options.wonkiness)
          )
        );
        context.lineTo(
          ...pointToCanvas(
            cell.x + line[1][0] + this.getWonkyNumber(options.wonkiness),
            cell.y + line[1][1] + this.getWonkyNumber(options.wonkiness)
          )
        );
      }
    }

    context.stroke();

    function drawSolutionLineSegment(line) {
      context.beginPath();
      context.lineWidth = lineWidth;
      context.strokeStyle = line[2];
      context.lineCap = 'round';
      context.moveTo(...line[0]);
      context.lineTo(...line[1]);
      context.stroke();
    }

    let drawBridge = bridge => {
      const wallFudgeFactor = 6;
      const pathFudgeFactor = 7;
      const bridgeWidth = 4.5;
      const bridgeRailThickness = 1;
      context.lineCap = 'butt';

      const wonky1 = this.getWonkyNumber(options.wonkiness) * 2;
      const wonky2 = this.getWonkyNumber(options.wonkiness) * 2;

      const x1 = bridge[0].x + bridge[0].centerOffsetX + wonky1;
      const y1 = bridge[0].y + bridge[0].centerOffsetY + wonky2;

      const x2 = bridge[1].x + bridge[1].centerOffsetX + wonky2;
      const y2 = bridge[1].y + bridge[1].centerOffsetY + wonky1;

      context.lineWidth = bridgeWidth * scale / 10;
      context.strokeStyle = options.bridgeColor;
      context.beginPath();
      context.moveTo(
        ...pointToCanvas(
          x1 + (bridge[1].x - bridge[0].x) / wallFudgeFactor,
          y1 + (bridge[1].y - bridge[0].y) / wallFudgeFactor
        )
      );
      context.lineTo(
        ...pointToCanvas(
          x2 + (bridge[0].x - bridge[1].x) / wallFudgeFactor,
          y2 + (bridge[0].y - bridge[1].y) / wallFudgeFactor
        )
      );
      context.stroke();
      context.beginPath();
      context.strokeStyle = options.backgroundColor;
      context.lineWidth = (bridgeWidth - bridgeRailThickness) * scale / 10;
      context.moveTo(
        ...pointToCanvas(
          x1 + (bridge[1].x - bridge[0].x) / pathFudgeFactor,
          y1 + (bridge[1].y - bridge[0].y) / pathFudgeFactor
        )
      );
      context.lineTo(
        ...pointToCanvas(
          x2 + (bridge[0].x - bridge[1].x) / pathFudgeFactor,
          y2 + (bridge[0].y - bridge[1].y) / pathFudgeFactor
        )
      );
      context.stroke();
    };

    const lines = [];
    const linesAbove = [];

    if (options.showSolution) {
      let cell = this.currentCell || this.grid.finish;
      while (cell.parentCell != undefined) {
        const line = [
          [
            ...pointToCanvas(
              cell.x + cell.centerOffsetX,
              cell.y + cell.centerOffsetY
            ),
          ],
          [
            ...pointToCanvas(
              cell.parentCell.x + cell.parentCell.centerOffsetX,
              cell.parentCell.y + cell.parentCell.centerOffsetY
            ),
          ],
          'red',
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
      const gradient = context.createLinearGradient(
        line[0][0],
        line[0][1],
        line[1][0],
        line[1][1]
      );
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
        grid[x - 1][y].neighbours['r'] = grid[x][y];
        grid[x][y].neighbours['l'] = grid[x - 1][y];
      }
      if (x + 1 < width) {
        grid[x + 1][y].neighbours['l'] = grid[x][y];
        grid[x][y].neighbours['r'] = grid[x + 1][y];
      }
      if (y % 2 != 0) {
        if (y - 1 >= 0) {
          grid[x][y - 1].neighbours['d'] = grid[x][y];
          grid[x][y].neighbours['u'] = grid[x][y - 1];
        }
        if (y + 1 < height) {
          grid[x][y + 1].neighbours['u'] = grid[x][y];
          grid[x][y].neighbours['d'] = grid[x][y + 1];
        }
      }
      cells.push(grid[x][y]);
    }
  }

  return new Grid(
    width,
    height,
    cells,
    ['r', 'l', 'd', 'u'],
    { r: 'l', l: 'r', d: 'u', u: 'd' },
    {
      r: [[1, 0], [1, 1]],
      l: [[0, 0], [0, 1]],
      d: [[0, 1], [1, 1]],
      u: [[0, 0], [1, 0]],
    },
    grid[0][0],
    grid[width - 1][height - 1]
  );
}

export function generateHexGrid(width, height) {
  const grid = {};

  const packingModifier = 1 - Math.tan(Math.PI / 3) / 2;
  let offset = 0;

  for (let y = 0; y < height; y++) {
    offset += packingModifier;

    for (let x = 0; x < width; x++) {
      if (grid[x] === undefined) {
        grid[x] = {};
      }
      grid[x][y] = new Cell(x + 0.5, y + 0.5 - offset + packingModifier);
      grid[x][y].centerOffsetX = 0;
      grid[x][y].centerOffsetY = 0;
      if (y % 2 != 0) {
        grid[x][y].x += 0.5;
      }
    }
  }

  const cells = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x - 1 >= 0) {
        grid[x - 1][y].neighbours['r'] = grid[x][y];
        grid[x][y].neighbours['l'] = grid[x - 1][y];
      }
      if (x + 1 < width) {
        grid[x + 1][y].neighbours['l'] = grid[x][y];
        grid[x][y].neighbours['r'] = grid[x + 1][y];
      }
      if (y % 2 != 0) {
        if (y - 1 >= 0) {
          grid[x][y - 1].neighbours['dr'] = grid[x][y];
          grid[x][y].neighbours['ul'] = grid[x][y - 1];
          if (x + 1 < width) {
            grid[x + 1][y - 1].neighbours['dl'] = grid[x][y];
            grid[x][y].neighbours['ur'] = grid[x + 1][y - 1];
          }
        }
        if (y + 1 < height) {
          grid[x][y + 1].neighbours['ur'] = grid[x][y];
          grid[x][y].neighbours['dl'] = grid[x][y + 1];
          if (x + 1 < width) {
            grid[x + 1][y + 1].neighbours['ul'] = grid[x][y];
            grid[x][y].neighbours['dr'] = grid[x + 1][y + 1];
          }
        }
      }
      cells.push(grid[x][y]);
    }
  }

  const wallLength = 2 * (1 / (2 * Math.tan(Math.PI / 3)));

  return new Grid(
    width,
    height,
    cells,
    ['l', 'r', 'ul', 'ur', 'dl', 'dr'],
    { l: 'r', r: 'l', ul: 'dr', ur: 'dl', dl: 'ur', dr: 'ul' },
    {
      l: [[-0.5, -wallLength / 2], [-0.5, wallLength / 2]],
      r: [[0.5, -wallLength / 2], [0.5, wallLength / 2]],
      ul: [[-0.5, -wallLength / 2], [0, -wallLength]],
      ur: [[0.5, -wallLength / 2], [0, -wallLength]],
      dl: [[-0.5, wallLength / 2], [0, wallLength]],
      dr: [[0.5, wallLength / 2], [0, wallLength]],
    },
    grid[0][0],
    grid[width - 1][height - 1]
  );
}
