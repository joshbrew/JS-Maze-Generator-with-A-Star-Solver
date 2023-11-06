
export class Maze {

    directions = {
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 },
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
    };

    width; height; generator; onWin;
    cells = [];
    players = {};
    visitedCells = {};// Rolling buffer to store the last 10 visited cells
    playerPathLength = 10; //e.g. store the last 10 visited cells

    playerDirections = [['bottom', 'left'], ['top', 'right']];

    constructor(width, height, generateMazeFunction, onWin) {
        this.generateMaze(width,height,generateMazeFunction, onWin);
    }

    generateMaze(width, height, generateMazeFunction, onWin) {
        if(width) this.width = width;
        if(height) this.height = height;
        if(generateMazeFunction) this.generator = generateMazeFunction;
        if(onWin) this.onWin = onWin; // Store the win callback

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
            this.generator(this);
        }
    }
 
    getDirectionKey(dx, dy) {
    
        for (const [key, value] of Object.entries(this.directions)) {
            if (value.dx === dx && value.dy === dy) {
                return key;
            }
        }
    
        return null; // or throw an error if you prefer
    }
        
    getWallDirection(dx, dy) {
        // Translate directional changes into wall directions
        if (dx === 0 && dy === -1) return 'top';
        if (dx === 1 && dy === 0) return 'right';
        if (dx === 0 && dy === 1) return 'bottom';
        if (dx === -1 && dy === 0) return 'left';
        
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
      
    getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const x = cell.x;
        const y = cell.y;
        
        // Iterate over all possible directions
        for (const key in this.directions) {
            const { dx, dy } = this.directions[key];
            const neighbor = this.getCell(x + dx, y + dy);
            
            // Add the neighbor to the list if it exists and has not been visited
            if (neighbor && !neighbor.visited) {
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }

    getVisitedNeighbors(cell) {
        const neighbors = [];
        const x = cell.x;
        const y = cell.y;
        
        // Iterate over all possible directions
        for (const key in this.directions) {
            const { dx, dy } = this.directions[key];
            const neighbor = this.getCell(x + dx, y + dy);
            
            // Add the neighbor to the list if it exists and has been visited
            if (neighbor && neighbor.visited) {
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }

    getReachableNeighbors(cell) {
        const neighbors = [];
      
        // Iterate over all possible directions
        for (const direction in this.directions) {
            const { dx, dy } = this.directions[direction];
            const x = cell.x + dx;
            const y = cell.y + dy;
      
            // Check boundary conditions
            if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
                const potentialNeighbor = this.cells[y][x];
                const wallDirection = this.getWallDirection(dx, dy);
      
                // Check if there is no wall between the current cell and the potential neighbor
                if (!cell.walls[wallDirection] && !potentialNeighbor.walls[this.getOppositeDirection(wallDirection)]) {
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
          case 'up': return 'bottom';
          case 'down': return 'top';
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
        const startEdge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let startX, startY;
        if (startEdge === 0) { // top
            startX = Math.floor(Math.random() * this.width);
            startY = 0;
        } else if (startEdge === 1) { // right
            startX = this.width - 1;
            startY = Math.floor(Math.random() * this.height);
        } else if (startEdge === 2) { // bottom
            startX = Math.floor(Math.random() * this.width);
            startY = this.height - 1;
        } else { // left
            startX = 0;
            startY = Math.floor(Math.random() * this.height);
        }
        this.setStart(startX, startY);
        
        // Set a random ending point on a different edge
        let endEdge;
        do {
            endEdge = Math.floor(Math.random() * 4);
        } while (endEdge === startEdge); // Ensure the end edge is different from the start edge
        
        let endX, endY;
        if (endEdge === 0) { // top
            endX = Math.floor(Math.random() * this.width);
            endY = 0;
        } else if (endEdge === 1) { // right
            endX = this.width - 1;
            endY = Math.floor(Math.random() * this.height);
        } else if (endEdge === 2) { // bottom
            endX = Math.floor(Math.random() * this.width);
            endY = this.height - 1;
        } else { // left
            endX = 0;
            endY = Math.floor(Math.random() * this.height);
        }
        this.setEnd(endX, endY);
    }

    connect(cell1, cell2) {
        cell1.connect(cell2);
    }

    //removes any 3 or 4-sided cells
    removeDeadEnds = function() {
        this.cells.forEach(row => {
            row.forEach((cell) => {
                if (cell.isDeadEnd()) {
                    let neighbors = this.getVisitedNeighbors(cell);
                    if(neighbors.length < 1) neighbors = this.getUnvisitedNeighbors(cell);
                    // Randomly select a neighbor to connect to and remove the wall
                    const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                    this.connect(cell, neighbor);
                }
            });
        });
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
        const { dx, dy } = typeof direction === 'object' ? direction : this.directions[direction]; //input {dx,dy} or "up"/"down"/"left"/"right"
        
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
        context.strokeStyle = strokeStyle;
        context.beginPath();
    
        // Draw color trails first
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
                }
            }
        }
    
        // Next, draw all cells (including player cells)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                cell.draw(context, size);
            }
        }
    
        // Finally, ensure player cells are drawn on top
        for (const playerIndex in this.players) {
            const player = this.players[playerIndex];
            if (player.currentCell) {
                player.currentCell.draw(context, size);
            }
        }
    
        context.stroke();
    }

    replaceAlphaInRgba(rgbaString, newAlpha) {
        // Ensure newAlpha is a number and is between 0 and 1
        newAlpha = Math.max(0, Math.min(1, parseFloat(newAlpha)));
        
        // Use a regular expression to match and replace the alpha value in the rgba string
        return rgbaString.replace(/rgba\((\d+),(\d+),(\d+),(\d*(?:\.\d+)?)\)/, `rgba($1,$2,$3,${newAlpha})`);
    }
}

let wallKeys = ['top', 'right', 'bottom', 'left'];

//object representation of a maze cell in an xy grid
export class MazeCell {
    x; y; 
    isStart; isPath; isEnd; 
    visited = false; // A flag to indicate whether this cell has been visited during maze generation

      // All cells start with all walls intact
    walls = { top: true, right: true, bottom: true, left: true };
    
    // Constructor to initialize a cell at (x, y) coordinates
    constructor(x, y) {
      // Storing the x and y coordinates
      this.x = x;
      this.y = y;
  
    }
  
    // Method to remove walls between this cell and another cell
    connect(cell) {
      // If the cells are in the same row
      if (this.y === cell.y) {
        // If this cell is to the right of the other cell
        if (this.x > cell.x) {
          this.walls.left = false;
          cell.walls.right = false;
        }
        // If this cell is to the left of the other cell
        else if (this.x < cell.x) {
          this.walls.right = false;
          cell.walls.left = false;
        }
      }
      // If the cells are in the same column
      else if (this.x === cell.x) {
        // If this cell is below the other cell
        if (this.y > cell.y) {
          this.walls.top = false;
          cell.walls.bottom = false;
        }
        // If this cell is above the other cell
        else if (this.y < cell.y) {
          this.walls.bottom = false;
          cell.walls.top = false;
        }
      }
  
      // Mark both cells as visited
      this.visited = true;
      cell.visited = true;
    }

    hasAllWalls() {
        return this.walls.top && this.walls.right && this.walls.bottom && this.walls.left;
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
      this.clearPath();
    }

    // Method to draw the cell and its walls on a canvas context
    draw(context, size) {
        // If the cell is marked as the start or end, fill it with a color
        if (this.isStart || this.isEnd) {
          context.fillStyle = this.isStart ? 'green' : this.isEnd ? 'red' : 'blue';
          context.fillRect(this.x * size, this.y * size, size, size);
        }
    
        // Drawing the walls of the cell
        context.beginPath();
        if (this.walls.top) {
          context.moveTo(this.x * size, this.y * size);
          context.lineTo((this.x + 1) * size, this.y * size);
        }
        if (this.walls.right) {
          context.moveTo((this.x + 1) * size, this.y * size);
          context.lineTo((this.x + 1) * size, (this.y + 1) * size);
        }
        if (this.walls.bottom) {
          context.moveTo((this.x + 1) * size, (this.y + 1) * size);
          context.lineTo(this.x * size, (this.y + 1) * size);
        }
        if (this.walls.left) {
          context.moveTo(this.x * size, (this.y + 1) * size);
          context.lineTo(this.x * size, this.y * size);
        }
        context.stroke();
    }
    
}


