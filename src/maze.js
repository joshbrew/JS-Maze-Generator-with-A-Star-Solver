
// A simple seedable random number generator
class SeededRandom {
    constructor(seed) {
        if(!seed) seed = Date.now()*0.0001;
        this.randF = seed;
        this.initialSeed = seed;
        this.e = Math.E;
    }

    set(seed) {
        this.randF = seed;
        this.initialSeed = seed;
    }
  
    reset() {
      this.randF = this.initialSeed;
    }
  
    random() {
      this.randF += this.e;
      const x = 1000000000*Math.sin(this.randF);
      return x - Math.floor(x);
    }
  }
  


export class Maze {

    seed = new SeededRandom(Date.now()*0.001);

    directions = {
        left: { dx: -1, dy: 0, wallDirection: 'left', opposite: 'right' }, 
        right: { dx: 1, dy: 0, wallDirection: 'right', opposite: 'left' },
        up: { dx: 0, dy: -1, wallDirection: 'up', opposite: 'down' },
        down: { dx: 0, dy: 1, wallDirection: 'down', opposite: 'up' }
    };

    //octagonal (diagonal) grid
    directionsOct = {
        up: { dx: 0, dy: -1, wallDirection: 'up', opposite: 'down' },
        upRight: { dx: 1, dy: -1, wallDirection: 'upRight', opposite: 'downLeft' },
        right: { dx: 1, dy: 0, wallDirection: 'right', opposite: 'left' },
        downRight: { dx: 1, dy: 1, wallDirection: 'downRight', opposite: 'upLeft' },
        down: { dx: 0, dy: 1, wallDirection: 'down', opposite: 'up' },
        downLeft: { dx: -1, dy: 1, wallDirection: 'downLeft', opposite: 'upRight' },
        left: { dx: -1, dy: 0, wallDirection: 'left', opposite: 'right' },
        upLeft: { dx: -1, dy: -1, wallDirection: 'upLeft', opposite: 'downRight' }
    }

    directionsKeys = Object.keys(this.directions)
    directionsOctKeys = Object.keys(this.directionsOct);

    width; height; generator; onWin;
    cells = [];
    players = {};
    visitedCells = {};// Rolling buffer to store the last 10 visited cells
    playerPathLength = 10; //e.g. store the last 10 visited cells

    drawFiddleHeads = false;

    allowDiagonal=false; //allow diagonal movement/generation
    
    //todo: cleanup
    constructor(
        width, 
        height, 
        generateMazeFunction, 
        onWin, 
        seed,
        allowDiagonal
    ) {
        if(height && width && generateMazeFunction) this.generateMaze(width, height, generateMazeFunction, onWin, seed, allowDiagonal);
    }

    generateMaze(width, height, generateMazeFunction, onWin, seed, allowDiagonal) {
        if(width) this.width = width;
        if(height) this.height = height;
        if(generateMazeFunction) this.generator = generateMazeFunction;
        if(onWin) this.onWin = onWin; // Store the win callback
        if(seed) {this.seed.set(seed);}
        if(allowDiagonal) this.allowDiagonal = allowDiagonal;
        console.time(`genMaze ${this.generator.name}`);

        if(this.cells.length > 0) { //hard reset
            this.cells.length = 0;
        }

        for (let y = 0; y < this.height; y++) {
            let row = [];
            for (let x = 0; x < this.width; x++) {
                row.push(new MazeCell(x, y));
            }
            this.cells.push(row);
        }

        this.setRandomStartAndEnd();
        if(Object.keys(this.players).length > 0) { //reset player positions
            for(const key in this.players) {
                this.visitedCells[key] = [];
                this.players[key].cell = this.start;
                
                this.recordVisit(this.players[key].cell, key);  // Record the cell visitation

            }
        }
  
        if (typeof this.generator === 'function') {
            this.generator(this, this.seed, this.allowDiagonal);
        }
        console.timeEnd(`genMaze ${this.generator.name}`);
    }
 
    getDirectionKey(dx, dy) {
    
        for (const [key, value] of Object.entries(this.directionsOct)) {
            if (value.dx === dx && value.dy === dy) {
                return key;
            }
        }
    
        return null; // or throw an error if you prefer
    }
        
    getWallDirection(dx, dy) {
        // Translate directional changes into wall directions for orthogonal directions
        if (dx === 0 && dy === -1) return 'up';
        if (dx === 1 && dy === 0) return 'right';
        if (dx === 0 && dy === 1) return 'down';
        if (dx === -1 && dy === 0) return 'left';
    
        // Translate directional changes into wall directions for diagonal directions
        if (dx === 1 && dy === -1) return 'upRight';
        if (dx === 1 && dy === 1) return 'downRight';
        if (dx === -1 && dy === 1) return 'downLeft';
        if (dx === -1 && dy === -1) return 'upLeft';
    
        // Return null if the input doesn't match any known direction.
        // This can be a signal that something unexpected has occurred.
        return null;
    }

    getCell(x, y) {
        // Check if the coordinates are within the valid range
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.cells[y][x];
        }
        
        // Return null if the coordinates are out of bounds
        return null;
    }
      
    getNeighbors(cell, allowDiagonal=false) {
        const neighbors = []; 
        const keys = (allowDiagonal ? this.directionsOctKeys : this.directionsKeys);
        for (const direction of keys) {
            const neighbor = this.getNeighbor(cell, direction);
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }



    //get a neighbor in a specific direction, if any
    getNeighbor(cell, direction) {
        const x = cell.x;
        const y = cell.y;
        if(!this.directionsOct[direction]) return;
        const neighbor = this.getCell(
            x + this.directionsOct[direction].dx, 
            y + this.directionsOct[direction].dy
        );
        
        if (neighbor) {
            return neighbor;
        }
    }

    getUnvisitedNeighbors(cell, allowDiagonal=false) {
        return this.getNeighbors(cell, allowDiagonal).filter(neighbor => !neighbor.visited);
    }
    
    getVisitedNeighbors(cell, allowDiagonal=false) {
        return this.getNeighbors(cell, allowDiagonal).filter(neighbor => neighbor.visited);
    }

    getReachableNeighbors(cell, allowDiagonal=false) {
        const neighbors = [];
      
        // Iterate over all possible directions
        const keys = (allowDiagonal ? this.directionsOctKeys : this.directionsKeys);
        for (const direction of keys) {
            const { dx, dy, wallDirection, opposite } = this.directionsOct[direction];
            const x = cell.x + dx;
            const y = cell.y + dy;
      
            // Check boundary conditions
            if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
                const potentialNeighbor = this.cells[y][x];
      
                // Check if there is no wall between the current cell and the potential neighbor
                if (!cell.walls[wallDirection] && !potentialNeighbor.walls[opposite]) {
                    neighbors.push(potentialNeighbor);
                }
            }
        }
        return neighbors;
    }

    getOppositeDirection(direction) {
        switch (direction) {
          case 'left': return 'right';
          case 'right': return 'left';
          case 'up': return 'down';
          case 'down': return 'up';
          case 'upRight': return 'downLeft';
          case 'downLeft': return 'upRight';
          case 'upLeft': return 'downRight';
          case 'downRight': return 'upLeft';
          default: return null;
        }
    }

    // Method to set the starting point of the maze
    setStart(x, y) {
        this.start = this.getCell(x, y);
        this.start.setStart();
    }

    // Method to set the ending point of the maze
    setEnd(x, y) {
        this.end = this.getCell(x, y);
        this.end.setEnd();
    }

    //connect all neighbors
    connectNeighbors(cell, direction, allowDiagonal=false) {
        if (direction) {
            let neighbor = this.getNeighbor(cell, direction);
            if (neighbor) cell.connect(neighbor);
        } else {
            this.getNeighbors(cell, allowDiagonal).forEach(neighbor => cell.connect(neighbor));
        }
    }

    //connect all neighbors
    disconnectNeighbors(cell, direction, allowDiagonal) {
        if (direction) {
            let neighbor = this.getNeighbor(cell, direction);
            if (neighbor) cell.disconnect(neighbor);
        } else {
            this.getNeighbors(cell, allowDiagonal).forEach(neighbor => cell.disconnect(neighbor));
        }
    }

    // Method to reset the maze
    reset(newGoal=true) {
        this.won = false;  // Reset the won flag
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x].reset();
            }
        }
        if(newGoal) {
            this.setRandomStartAndEnd();
            for(const key in this.players) {
                this.visitedCells[key] = [];
                this.setPlayer(this.start.x, this.start.y, key);
            }
        }
    }

    //set start/end posts along different edges. Doesn't guarantee they aren't nearby.
    setRandomStartAndEnd() {
        // Set a random starting point
        const startEdge = Math.floor(this.seed.random() * 4); // 0: up, 1: right, 2: down, 3: left
        let startX, startY;
        if (startEdge === 0) { // up
            startX = Math.floor(this.seed.random() * this.width);
            startY = 0;
        } else if (startEdge === 1) { // right
            startX = this.width - 1;
            startY = Math.floor(this.seed.random() * this.height);
        } else if (startEdge === 2) { // down
            startX = Math.floor(this.seed.random() * this.width);
            startY = this.height - 1;
        } else { // left
            startX = 0;
            startY = Math.floor(this.seed.random() * this.height);
        }
        this.setStart(startX, startY);
        
        // Set a random ending point on a different edge
        let endEdge;
        do {
            endEdge = Math.floor(this.seed.random() * 4);
        } while (endEdge === startEdge); // Ensure the end edge is different from the start edge
        
        let endX, endY;
        if (endEdge === 0) { // up
            endX = Math.floor(this.seed.random() * this.width);
            endY = 0;
        } else if (endEdge === 1) { // right
            endX = this.width - 1;
            endY = Math.floor(this.seed.random() * this.height);
        } else if (endEdge === 2) { // down
            endX = Math.floor(this.seed.random() * this.width);
            endY = this.height - 1;
        } else { // left
            endX = 0;
            endY = Math.floor(this.seed.random() * this.height);
        }
        this.setEnd(endX, endY);
    }

    connect(cell1, cell2) {
        cell1.connect(cell2);
    }

    //removes any 3 or 4-sided cells
    removeDeadEnds = (fromCenter=false, allowDiagonal) => { //fromCenter will create a spiral pattern and remove center cells

        if(fromCenter) {
            // Find the center of the maze
            const centerX = Math.floor(this.cells[0].length / 2);
            const centerY = Math.floor(this.cells.length / 2);

            // Calculate the maximum distance from the center to any corner
            const maxDistance = Math.max(centerX, this.cells[0].length - centerX - 1, centerY, this.cells.length - centerY - 1);


            // Initialize a connected set that contains the coordinates of the central cell(s)
            let connected = new Set();

            if (this.cells.length % 2 === 0 && this.cells[0].length % 2 === 0) {
                // Even dimensions: add the center 4 cells coordinates as strings "x,y"
                connected.add(`${centerX},${centerY}`);
                connected.add(`${centerX-1},${centerY}`);
                connected.add(`${centerX},${centerY-1}`);
                connected.add(`${centerX-1},${centerY-1}`);
            } else {
                // Odd dimensions: add the central cell coordinates as a string "x,y"
                connected.add(`${centerX},${centerY}`);
            }

            // Spiral coordinates generator
            function* spiral(xCenter, yCenter, maxDist) { //generator function
                yield [xCenter, yCenter];
                for (let layer = 1; layer <= maxDist; layer++) {
                    let x = xCenter + layer;
                    let y = yCenter - layer;
                    for (; y <= yCenter + layer; y++) yield [x, y];
                    for (x -= 1, y -= 1; x >= xCenter - layer; x--) yield [x, y];
                    for (x += 1, y -= 1; y >= yCenter - layer; y--) yield [x, y];
                    for (x += 1, y += 1; x <= xCenter + layer; x++) yield [x, y];
                }
            }

            // Iterate over the cells in a spiral pattern from the center
            for (let [x, y] of spiral(centerX, centerY, maxDistance)) {
                // Ensure x and y are within bounds
                if (x >= 0 && x < this.cells[0].length && y >= 0 && y < this.cells.length) {
                    const cell = this.cells[y][x];
                    if (cell.isDeadEnd()) {
                        let neighbors = this.getVisitedNeighbors(cell, allowDiagonal);
                        if(neighbors.length < 1) neighbors = this.getUnvisitedNeighbors(cell, allowDiagonal);
                        // Randomly select a neighbor to connect to and remove the wall
                        // Filter neighbors to ensure they keep the path to the center
                        neighbors = neighbors.filter(neighbor => {
                            const key = `${neighbor.x},${neighbor.y}`;
                            return connected.has(key) || neighbors.some(n => connected.has(`${n.x},${n.y}`));
                        });

                        if (neighbors.length > 0) {
                            // Connect to one of the neighbors that maintains the path to the center
                            const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                            this.connect(cell, neighbor);
                            // Add the new cell to the connected set
                            connected.add(`${x},${y}`);
                        }
                    }
                }
            }

            // Connect the center cells
            if (this.cells.length % 2 === 0 && this.cells[0].length % 2 === 0) {
                // Even dimensions: connect the center 4 cells
                const centers = [
                [centerX, centerY],
                [centerX - 1, centerY],
                [centerX, centerY - 1],
                [centerX - 1, centerY - 1]
                ];
                centers.forEach(([x, y]) => {
                    this.cells[y][x].visited = true;
                    this.getNeighbors(this.cells[y][x], allowDiagonal).forEach(neighbor => {
                        this.connect(this.cells[y][x], neighbor);
                    });
                });
            } else {
                // Odd dimensions: make sure the central cell is connected
                const centerCell = this.cells[centerY][centerX];
                centerCell.visited = true;
                this.getNeighbors(centerCell, allowDiagonal).forEach(neighbor => {
                    this.connect(centerCell, neighbor);
                });
            }

        }
        else {
            this.cells.forEach(row => {
                row.forEach((cell) => {
                    if (cell.isDeadEnd()) {
                        let neighbors = this.getVisitedNeighbors(cell, allowDiagonal);
                        if(neighbors.length < 1) neighbors = this.getUnvisitedNeighbors(cell, allowDiagonal);
                        // Randomly select a neighbor to connect to and remove the wall
                        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                        this.connect(cell, neighbor);
                    }
                });
            });
        }
    };

    // Method to add a new player to the maze
    addPlayer(
        x=this.start.x, y=this.start.y, 
        color={r:155*Math.random(),g:155*Math.random(),b:155*Math.random()}, 
        playerIndex
    ) {
        if(typeof playerIndex === 'undefined') playerIndex = Object.keys(this.players).length;
        const playerCell = this.getCell(x, y);
        playerCell.setPath();
        this.players[playerIndex] = { cell: playerCell, color };  // Store the player along with their color
        this.visitedCells[playerIndex] = [];  // Initialize visitedCells for the new player

        this.recordVisit(playerCell, playerIndex);  // Record the cell visitation

        // Check for win condition for the new player
        this.checkWin();

        return this.players[playerIndex];
    }

    // Method to set the player's current position
    setPlayer(x, y, playerIndex, color) {
        if(typeof playerIndex === 'undefined' || !this.players[playerIndex]) {
            this.addPlayer(x, y, undefined, playerIndex, color);
            playerIndex = Object.keys(this.players).length - 1;
        }
        if (this.players[playerIndex]) {
            this.players[playerIndex].cell.clearPath();
            if(color) this.players[playerIndex].color = color;
        }
        this.players[playerIndex].cell = this.getCell(x, y);
        this.players[playerIndex].cell.setPath();
        this.recordVisit(this.players[playerIndex].cell, playerIndex);  // Record the cell visitation

        // Check for win condition
        this.checkWin();
    }

    movePlayer(direction, playerIndex, onCollision = (player, wallDirection, playerIndex) => {
        console.log("There's a wall in the way!", player, wallDirection, playerIndex)
    }) {
        const { dx, dy } = typeof direction === 'object' ? direction : this.directionsOct[direction]; //input {dx,dy} or "up"/"down"/"left"/"right"
        
        const currentCell = this.players[playerIndex].cell;
        const newX = currentCell.x + dx;
        const newY = currentCell.y + dy;
      
        // Check for walls in the direction of movement
        const wallDirection = this.getWallDirection(dx, dy);
        if (currentCell.walls[wallDirection]) {
          if (onCollision) onCollision(this.players[playerIndex], wallDirection, playerIndex);
          return;
        }
      
        // If there are no walls, update the player's position
        const newCell = this.getCell(newX, newY);
        if (newCell) {
          currentCell.clearPath();
          this.players[playerIndex].cell = newCell;
          newCell.setPath();
          this.recordVisit(newCell, playerIndex);  // Record the cell visitation
      
          // Check for win condition
          this.checkWin();
        } else {
          console.log("Player is trying to move outside of the maze boundaries!");
        }
    }

    checkWin() {
        if (this.won) return;  // Skip if the game has already been won
        
        for(const key in this.players) {
            let player = this.players[key];
            
            if (player.cell === this.end) {
                this.won = true;  // Set the won flag
                if (typeof this.onWin === 'function') this.onWin(player);
                this.handleWin();
            }
        }
    }

    // Default win behavior, call in onWin if you want to retain it
    handleWin() {
        // Perform any necessary actions after a player wins, such as showing a victory message
        // ...
        
        // Reset the game for the next round (default behavior)
        this.reset();
    }


    recordVisit(cell, playerIndex) {
        const now = Date.now();
        cell.visitedTimestamp = now;
    
        this.visitedCells[playerIndex].push({ cell, timestamp: now });
        if (this.visitedCells[playerIndex].length > this.playerPathLength) {
            this.visitedCells[playerIndex].shift();
        }
    }

    draw(context, size, strokeStyle='blue', drawPlayerPaths=true) {

        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        // Draw color trails first
        let lastSeed = this.seed.randF;
        this.seed.randF = this.seed.initialSeed;
        context.beginPath();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                
                for (const playerIndex in this.players) {
                    const player = this.players[playerIndex];
                    if (drawPlayerPaths && this.visitedCells[playerIndex]) {
                        const visitedIndex = [...this.visitedCells[playerIndex]].reverse().findIndex(v => v.cell === cell);
                        if (visitedIndex !== -1 && cell !== player.currentCell) {
                            const alpha = cell === player.cell ? 1 : 0.6 - (this.visitedCells[playerIndex].length - (this.visitedCells[playerIndex].length - visitedIndex)) / this.visitedCells[playerIndex].length;
                            
                            //only use rgba strings or {r,g,b} objects
                            let col = typeof player.color === 'string' ? this.replaceAlphaInRgba(player.color, alpha) : `rgba(${player.color.r}, ${player.color.g}, ${player.color.b}, ${alpha})`;
                            context.fillStyle = col;
                            context.fillRect(cell.x * size, cell.y * size, size, size);
                        }
                    }
                    cell.draw(
                        context, 
                        size, 
                        strokeStyle,
                        this.allowDiagonal,
                        this.drawFiddleHeads, 
                        this.seed,
                        true
                    );
                }
            }
        }
        context.stroke(); //faster not to do it per-cell
        this.seed.randF = lastSeed;
    }

    replaceAlphaInRgba(rgbaString, newAlpha) {
        // Ensure newAlpha is a number and is between 0 and 1
        newAlpha = Math.max(0, Math.min(1, parseFloat(newAlpha)));
        
        // Use a regular expression to match and replace the alpha value in the rgba string
        return rgbaString.replace(/rgba\((\d+),(\d+),(\d+),(\d*(?:\.\d+)?)\)/, `rgba($1,$2,$3,${newAlpha})`);
    }
}

let wallKeys = ['up', 'right', 'down', 'left'];

//object representation of a maze cell in an xy grid
export class MazeCell {
    x; y; 
    isStart; isPath; isEnd; 
    visited = false; // A flag to indicate whether this cell has been visited during maze generation
    id = Math.random();
      // All cells start with all walls intact
    walls = { up: true, right: true, down: true, left: true, upRight:true, upLeft:true, downRight:true, downLeft:true }; //octagonal coordinates
    
    // Constructor to initialize a cell at (x, y) coordinates
    constructor(x, y) {
        // Storing the x and y coordinates
        this.x = x;
        this.y = y;
    }
  
    // Method to remove walls between this cell and another cell
    connect(cell) {
        if (this.y === cell.y) {
            if (this.x > cell.x) {
                this.walls.left = false;
                cell.walls.right = false;
            } else if (this.x < cell.x) {
                this.walls.right = false;
                cell.walls.left = false;
            }
        } else if (this.x === cell.x) {
            if (this.y > cell.y) {
                this.walls.up = false;
                cell.walls.down = false;
            } else if (this.y < cell.y) {
                this.walls.down = false;
                cell.walls.up = false;
            }
        } else {
            // Diagonal connection logic
            if (this.x < cell.x && this.y < cell.y) {
                this.walls.downRight = false;
                cell.walls.upLeft = false;
            } else if (this.x > cell.x && this.y < cell.y) {
                this.walls.downLeft = false;
                cell.walls.upRight = false;
            } else if (this.x < cell.x && this.y > cell.y) {
                this.walls.upRight = false;
                cell.walls.downLeft = false;
            } else if (this.x > cell.x && this.y > cell.y) {
                this.walls.upLeft = false;
                cell.walls.downRight = false;
            }
        }
    
        this.visited = true;
        cell.visited = true;
    }
    
    // Method to add walls between this cell and another cell
    disconnect(cell) {
        if (this.y === cell.y) {
            if (this.x > cell.x) {
                this.walls.left = true;
                cell.walls.right = true;
            } else if (this.x < cell.x) {
                this.walls.right = true;
                cell.walls.left = true;
            }
        } else if (this.x === cell.x) {
            if (this.y > cell.y) {
                this.walls.up = true;
                cell.walls.down = true;
            } else if (this.y < cell.y) {
                this.walls.down = true;
                cell.walls.up = true;
            }
        } else {
            // Diagonal disconnection logic
            if (this.x < cell.x && this.y < cell.y) {
                this.walls.downRight = true;
                cell.walls.upLeft = true;
            } else if (this.x > cell.x && this.y < cell.y) {
                this.walls.downLeft = true;
                cell.walls.upRight = true;
            } else if (this.x < cell.x && this.y > cell.y) {
                this.walls.upRight = true;
                cell.walls.downLeft = true;
            } else if (this.x > cell.x && this.y > cell.y) {
                this.walls.upLeft = true;
                cell.walls.downRight = true;
            }
        }
    
        this.visited = true;
        cell.visited = true;
    }

    hasAllWalls() {
        return this.walls.up && this.walls.right && this.walls.down && this.walls.left && this.walls.upRight && this.walls.downRight && this.walls.downLeft && this.walls.upLeft;
    }
  
    // Method to mark this cell as the starting point
    setStart() {
      this.isStart = true;
    }
  
    // Method to mark this cell as the ending point
    setEnd() {
      this.isEnd = true;
    }
  
    // Method to mark this cell as part of the player's path
    setPath() {
      this.isPath = true;
    }
  
    // Method to clear this cell from being part of the player's path
    clearPath() {
      this.isPath = false;
    }
  
    isDeadEnd() {
        return wallKeys.filter((k) => this.walls[k]).length > 2;
    }

    // Method to reset the cell's special states (start, end, path)
    reset() {
      this.isStart = false;
      this.isEnd = false;
      this.isPath = false;
    }

    drawSquareCell = (context, size, strokeStyle='blue', fiddleheads, seed, bulkDraw) => {
        
        if (this.isStart || this.isEnd) {
            context.fillStyle = this.isStart ? 'green' : this.isEnd ? 'red' : 'blue';
            context.fillRect(this.x * size, this.y * size, size, size);
          }
  
          if(fiddleheads) { //just a joke feature
              if (this.walls.up) {
                  drawWallWithSpirals(context, size, this.x * size, this.y * size, (this.x + 1) * size, this.y * size, 'up', seed, strokeStyle);
              }
              if (this.walls.right) {
                  drawWallWithSpirals(context, size, (this.x + 1) * size, this.y * size, (this.x + 1) * size, (this.y + 1) * size, 'right', seed, strokeStyle);
              }
              if (this.walls.down) {
                  drawWallWithSpirals(context, size, (this.x + 1) * size, (this.y + 1) * size, this.x * size, (this.y + 1) * size, 'down', seed, strokeStyle);
              }
              if (this.walls.left) {
                  drawWallWithSpirals(context, size, this.x * size, (this.y + 1) * size, this.x * size, this.y * size, 'left', seed, strokeStyle);
              }
          }
          else {
              // Drawing the walls of the cell
              context.strokeStyle = strokeStyle;
              if(!bulkDraw) context.beginPath();
              if (this.walls.up) {
                  context.moveTo(this.x * size, this.y * size);
                  context.lineTo((this.x + 1) * size, this.y * size);
              }
              if (this.walls.right) {
                  context.moveTo((this.x + 1) * size, this.y * size);
                  context.lineTo((this.x + 1) * size, (this.y + 1) * size);
              }
              if (this.walls.down) {
                  context.moveTo((this.x + 1) * size, (this.y + 1) * size);
                  context.lineTo(this.x * size, (this.y + 1) * size);
              }
              if (this.walls.left) {
                  context.moveTo(this.x * size, (this.y + 1) * size);
                  context.lineTo(this.x * size, this.y * size);
              }
              if(!bulkDraw) context.stroke();
          }
    }

    drawOctagonalCell(context, size, strokeStyle, bulkDraw) {
        // Calculate diagonal offset for drawing diagonal walls
        const diagonalOffset = size / (2 * Math.sqrt(2)); // Half diagonal of a square of side 'size'
    
        // If the cell is marked as the start or end, fill it with a color
        if (this.isStart || this.isEnd) {
            context.fillStyle = this.isStart ? 'green' : this.isEnd ? 'red' : 'blue';
            context.fillRect(this.x * size, this.y * size, size, size);
        }
    
        context.strokeStyle = strokeStyle;
        if(!bulkDraw) context.beginPath();
    
        // Drawing orthogonal walls
        if (this.walls.up) {
            context.moveTo(this.x * size + diagonalOffset, this.y * size);
            context.lineTo((this.x + 1) * size - diagonalOffset, this.y * size);
        }
        if (this.walls.right) {
            context.moveTo((this.x + 1) * size, this.y * size + diagonalOffset);
            context.lineTo((this.x + 1) * size, (this.y + 1) * size - diagonalOffset);
        }
        if (this.walls.down) {
            context.moveTo((this.x + 1) * size - diagonalOffset, (this.y + 1) * size);
            context.lineTo(this.x * size + diagonalOffset, (this.y + 1) * size);
        }
        if (this.walls.left) {
            context.moveTo(this.x * size, (this.y + 1) * size - diagonalOffset);
            context.lineTo(this.x * size, this.y * size + diagonalOffset);
        }
    
        // Drawing diagonal walls
        if (this.walls.upRight) {
            context.moveTo((this.x + 1) * size - diagonalOffset, this.y * size);
            context.lineTo((this.x + 1) * size, this.y * size + diagonalOffset);
        }
        if (this.walls.downRight) {
            context.moveTo((this.x + 1) * size, (this.y + 1) * size - diagonalOffset);
            context.lineTo((this.x + 1) * size - diagonalOffset, (this.y + 1) * size);
        }
        if (this.walls.downLeft) {
            context.moveTo(this.x * size + diagonalOffset, (this.y + 1) * size);
            context.lineTo(this.x * size, (this.y + 1) * size - diagonalOffset);
        }
        if (this.walls.upLeft) {
            context.moveTo(this.x * size, this.y * size + diagonalOffset);
            context.lineTo(this.x * size + diagonalOffset, this.y * size);
        }
    
        if(!bulkDraw) context.stroke();
    }

    // Method to draw the cell and its walls on a canvas context
    draw(context, size, strokeStyle='blue', allowDiagonal=false, fiddleheads = false, seed, bulkDraw=false) {
        // If the cell is marked as the start or end, fill it with a color

        if(allowDiagonal) {
            this.drawOctagonalCell(context, size, strokeStyle, bulkDraw);
        } else {
            this.drawSquareCell(context, size, strokeStyle, fiddleheads, seed, bulkDraw)
        }
    }
}

const randomNumSpirals = (seed) => Math.floor(seed.random() * 4) + 1; // Random number of spirals, between 1 and 6

// Function to draw spirals at each wall if it exists
function drawWallWithSpirals (context, size, fromX, fromY, toX, toY, direction, seed, strokeStyle) {
    context.strokeStyle = strokeStyle ? strokeStyle : 'blue'
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
    

    let numSpirals = randomNumSpirals(seed);
    for (let i = 0; i < numSpirals; i++) {
        // Calculate a random position along the wall for the spiral
        let posAlongWall = seed.random();
        let spiralStartX = fromX + (toX - fromX) * posAlongWall;
        let spiralStartY = fromY + (toY - fromY) * posAlongWall;
        
        // Scale the size of the spiral to the wall size
        let spiralSize = size * 0.1; // Adjust the 0.1 to scale the spirals bigger or smaller
        let spiralTurns = 1; // Adjust the number of turns for the spiral
    
        drawSpiral(context, spiralStartX, spiralStartY, spiralSize, spiralTurns, direction, seed);
    }
};

function drawSpiral(context, startX, startY, size, turns, wallOrientation, seed, strokeStyle='green') {
    let initialRadius = (size+seed.random()-0.75) * 0.02; // Start with a small radius
    let radiusIncrement = (size+seed.random()-1) * 0.04; // Increment rate for the radius
    let angleIncrement = Math.PI / (turns * 12); // Base increment for the angle
    let totalTurns = turns * 12 * 6; // Total number of iterations for the spiral

    // Determine the starting angle based on the wall orientation
    let startAngle;
    let directionModifier = 1;
    switch (wallOrientation) {
        case 'up':
            startAngle = -Math.PI / 2;
            break;
        case 'right':
            startAngle = 0;
            break;
        case 'down':
            startAngle = Math.PI / 2;
            directionModifier = -1;
            break;
        case 'left':
            startAngle = Math.PI;
            directionModifier = -1;
            break;
        default:
            startAngle = 0; // Default to right direction if orientation is undefined
    }

    angleIncrement *= directionModifier;

    // Calculate the ending angle and radius
    let endAngle = startAngle + totalTurns * angleIncrement;
    let endRadius = initialRadius + totalTurns * radiusIncrement;

    // Offset position will be directly to the left of the ending position for a fiddlehead effect
    let offsetX = startX - endRadius * Math.cos(startAngle);
    let offsetY = startY - endRadius * Math.sin(startAngle);

    context.strokeStyle = strokeStyle;
    context.beginPath();

    // Adjust the angle to point towards the end position for the first segment
    let angle = startAngle; // Rotate the start angle by 90 degrees counter-clockwise
    let radius = initialRadius;

    // Move to the start of the spiral, not the end
    let initialX = offsetX + radius * Math.cos(angle);
    let initialY = offsetY + radius * Math.sin(angle);
    context.moveTo(initialX, initialY);

    for (let i = 0; i < totalTurns; i++) {
        // Increase the radius as we spiral out
        radius += radiusIncrement;
        // Add randomness to the angle increment
        angle += angleIncrement + (seed.random() - 0.5) * (angleIncrement * 0.2);

        let x = offsetX + radius * Math.cos(angle);
        let y = offsetY + radius * Math.sin(angle);
        context.lineTo(x, y);
    }

    context.lineWidth = 1;
    context.stroke();
}

