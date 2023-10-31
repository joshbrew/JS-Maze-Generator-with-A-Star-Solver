//constructor requres a Maze() class
import {Maze} from './maze'

//Solvers handle one goal at a time
export class AStarSolver {
    
    maze; start; end;
    openSet = [];
    closedSet = [];
    path = [];

    constructor(maze) {
      this.maze = maze;
      this.start = maze.start;
      this.end = maze.end;
    }
  
    solve(
        startX = this.maze.start.x, 
        startY = this.maze.start.y,
        endX = this.maze.end.x,
        endY = this.maze.end.y,
        allowDiagonal = false
    ) {
        // Reset the solver's state to ensure a fresh start for the pathfinding.
        this.reset();

        // Define the start and end points using the provided coordinates or defaults to the maze's start and end.
        this.start = this.maze.cells[startY][startX];
        this.end = this.maze.cells[endY][endX];
        
        // Initiate the algorithm by adding the start cell to the open set.
        this.openSet.push(this.start);
  
        // As long as there are cells to consider (open set is not empty), the algorithm continues.
        while (this.openSet.length > 0) {
            // Find the cell in the open set with the lowest F cost.
            // F cost is a heuristic estimate of the total cost from the start cell, through this cell, to the end cell.
            // It’s calculated as: F = G + H.
            let lowestIndex = 0;
            for (let i = 0; i < this.openSet.length; i++) {
                if (this.openSet[i].f < this.openSet[lowestIndex].f) {
                    lowestIndex = i;
                }
            }

            // Set the current cell to the one with the lowest F cost.
            let current = this.openSet[lowestIndex];

            // If the current cell is the end point, reconstruct the path from start to end and return.
            if (current === this.end) {
                let temp = current;
                this.path.push(temp);
                while (temp.previous) {
                    this.path.push(temp.previous);
                    temp = temp.previous;
                }
                this.path.reverse(); 
                return;
            }

            // Since we're processing the current cell, it's moved from the open set to the closed set.
            this.openSet = this.openSet.filter(cell => cell !== current);
            this.closedSet.push(current);

            // Evaluate each neighboring cell of the current cell.
            let neighbors = this.maze.getReachableNeighbors(current);

            // Consider each neighboring cell for the next step.
            // G is the actual cost from the start cell to a particular cell, following the path that has been created so far. It's calculated by accumulating the cost of each step taken from the start.
            // H is the heuristic estimated cost from a particular cell to the end cell. This is an estimate and doesn’t necessarily represent the actual remaining path cost
            // F is the total estimated cost of the cheapest solution through this cell.
            for (let i = 0; i < neighbors.length; i++) {
                let neighbor = neighbors[i];

                // If the neighbor is already in the closed set, skip it as it's already processed.
                if (!this.closedSet.includes(neighbor)) {
                    // Calculate G, the cost from the starting cell to this neighbor through the current cell.
                    // Since we assume the cost between each pair of neighboring cells is 1, we add 1 to the current cell's G cost.
                    let tempG = current.g + 1;
            
                    // Assume initially that we have not found a shorter path to this neighbor.
                    let newPath = false;

                    // If the neighbor is not in the open set, it's a new cell for consideration.
                    if (!this.openSet.includes(neighbor)) {
                        newPath = true;  // We've found a new path.
                        // Calculate H, the heuristic estimated cost from this neighbor cell to the end cell.
                        neighbor.h = allowDiagonal ? this.heuristicDiag(neighbor, this.end) : this.heuristicGrid(neighbor, this.end);
                        // Add the neighbor to the open set as it needs to be considered.
                        this.openSet.push(neighbor);
                    } else if (tempG < neighbor.g) {
                        // If the neighbor is already in the open set, but we've found a shorter path to it, mark it as a new path.
                        newPath = true;
                    }

                    // If we've found a new or shorter path, update the neighbor's costs and its previous cell pointer.
                    if (newPath) {
                        neighbor.g = tempG;  // Update G, the cost from the start cell to this neighbor through the current cell.
                        neighbor.f = neighbor.g + neighbor.h;  // Update F, the total estimated cost of the cheapest solution through this cell.
                        neighbor.previous = current;  // Set the previous pointer to help reconstruct the path later.
                    }
                }
            } 
        }

        // If the algorithm finishes and the open set is empty but the end cell was not reached, there's no available path.
        // The function ends with the path remaining empty.
    }

    reset() {
        this.openSet = [];
        this.closedSet = [];
        this.path = [];
        this.start = this.maze.start;
        this.end = this.maze.end;

        // Iterate through all cells in the maze and reset the heuristics.
        for (let y = 0; y < this.maze.height; y++) {
            for (let x = 0; x < this.maze.width; x++) {
                const cell = this.maze.cells[y][x];
                cell.previous = null;
                cell.g = 0;
                cell.h = 0;
                cell.f = 0;
            }
        }
    }

    heuristicGrid(cell1, cell2) {
        return Math.abs(cell1.x - cell2.x) + Math.abs(cell1.y - cell2.y);
    }
  
    //we can allow for diagonal movements like this
    heuristicDiag(cell1, cell2) {
        return Math.sqrt(Math.pow(cell1.x - cell2.x, 2) + Math.pow(cell1.y - cell2.y, 2));
    }

    drawPath(context, size) {
      for (let i = 0; i < this.path.length; i++) {
        context.fillStyle = 'rgba(0, 255, 0, 0.3)';
        context.fillRect(this.path[i].x * size, this.path[i].y * size, size, size);
      }
    }

    playMove(
        pathIdx = 0, playerIndex = 0, 
        context, size, strokeColor, 
        onGoalReached = (player, timestamp)=>{}, 
        drawPath=false, drawPlayerPath=true
    ) {
        let move = this.path[pathIdx];
        let player = this.maze.players[playerIndex];
        let dx = move.x - player.cell.x;
        let dy = move.y - player.cell.y;
        this.maze.movePlayer({ dx, dy }, playerIndex);
        this.maze.draw(context, size, strokeColor,drawPlayerPath);
        if(drawPath) this.drawPath(context, size);

        if (pathIdx === this.path.length-1 && onGoalReached) {
            onGoalReached();
        }
    }

    playMoves(
        interval = 1000, playerIndex = 0, 
        context, size, strokeColor, 
        onGoalReached = (player, timestamp)=>{}, 
        drawPath=false, drawPlayerPath=true
    ) {
        let i = 0;
        let moves = this.path;

        this.interval = setInterval(() => {
            if (i < moves.length) {
                this.playMove(i, playerIndex, context, size, strokeColor, onGoalReached, drawPath,drawPlayerPath)
                i++;
            } else {
                clearInterval(this.interval);
            }
        }, interval);
    }

    stopMoves() {
        if(this.interval) clearInterval(this.interval);
    }

}