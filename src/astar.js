//constructor requres a Maze() class
import {Maze} from './maze'

//Solvers handle one goal at a time
export class AStarSolver {
    
    maze; start; end;
    openSet = new PriorityQueue();
    closedSet = new Set();
    path = [];

    //multiagent
    goals = {};
    openSets = {};
    closedSets = {};
    paths = {};
    starts = {}; 
    ends = {};

    constructor(maze) {
      this.maze = maze;
      this.start = maze.start;
      this.end = maze.end;
    }

    solve = (
        startX = this.maze.start.x, 
        startY = this.maze.start.y,
        endX = this.maze.end.x,
        endY = this.maze.end.y,
        allowDiagonal = false,
        maxWaitTicks=5 //maximum wait period before aborting
    ) => {

        let start = this.maze.cells[startY][startX];
        let end = this.maze.cells[endY][endX];
        
        if(start === this.start && end === this.end && this.path.length > 0) return this.path; //just return existing path instead of solving again
        
        console.time('astar');

        this.reset();
    
        this.start = start;
        this.end = end;
        this.initializeCell(this.start);
    
        const openSet = this.openSet;
        const closedSet = this.closedSet;
        openSet.push(this.start, this.start.f);
    
        let waitTicks = 0;

        while (!openSet.isEmpty()) {
            let current = openSet.pop();
            closedSet.add(current);

            if (current === this.end) {
                this.path = this.reconstructPath(current);
                console.timeEnd('astar');
                return this.path;
            }
    
            let hasValidMove = false;
            for (let neighbor of this.maze.getReachableNeighbors(current)) {
                if (closedSet.has(neighbor)) continue;
    
                neighbor = this.initializeCell(neighbor);
                let tempG = current.g + 1;
                
                if (!(neighbor.id in openSet.elementIndices) || tempG < neighbor.g) {
                    hasValidMove = true;
                    neighbor.g = tempG;
                    neighbor.f = tempG + (allowDiagonal ? this.heuristicDiag(neighbor, this.end) : this.heuristicGrid(neighbor, this.end));
                    neighbor.previous = current;
    
                    if (!(neighbor.id in openSet.elementIndices)) {
                        openSet.push(neighbor, neighbor.f);
                    } else {
                        // Update the priority queue with the new f value
                        openSet.update(neighbor, neighbor.f);
                    }
                }
            }

            // If no valid move is found, wait in the current cell
            if (!hasValidMove && waitTicks < maxWaitTicks) {
                waitTicks++;
                openSet.push(current, current.f + 1); // Re-add current cell with a higher cost
                closedSet.delete(current); // Remove current cell from closed set for reconsideration
            }
        }
        console.timeEnd('astar');
        return []; // No path found
    }
        
    initializeCell(cell, gValue = 0) {
        if (!('g' in cell)) {
            cell.g = gValue;
            cell.h = 0;
            cell.f = cell.g + this.heuristicGrid(cell, this.end);
            cell.previous = null;
        }
        return cell;
    }

    //todo add rules like, cannotOccupySameCell with path projection
    solveMultiple(
        goals, //goals = { agent1:{startX,startY,endX,endY,cannotOccupySameCell}}
        allowDiagonal=false,
        maxWaitTicks=5
    ) {
        
        let starts = {}; let ends = {};
        
        let unfinishedKeys = Object.keys(goals);
        let unfinishedGoals = Object.values(goals);

        let agentHasAvoidanceRule = false;
        let waitTicks = {};

        for(const key in goals) {
            if(!this.openSets[key]) this.openSets[key] = new PriorityQueue();
            else this.openSets[key].reset();
            if(!this.closedSets[key]) this.closedSets[key] = new Set();
            else this.closedSets[key].clear();
            this.paths[key] = [];
            starts[key] = this.maze.cells[startY][startX];
            ends[key] = this.maze.cells[endY][endX];
            if(this.starts[key] === starts[key] && this.ends[key] === this.ends[key] && this.paths[key]) {
                delete unfinishedKeys[key];
                delete unfinishedGoals[key];
            }

            if(!agentHasAvoidanceRule && goals[key].cannotOccupySameCell) agentHasAvoidanceRule = true;
            waitTicks[key] = 0;
        }

        let allEmpty = false;
        let previouslyOccupiedCells = agentHasAvoidanceRule ? new Set() : undefined; // Set to track previously occupied cells
        let occupiedCells = agentHasAvoidanceRule ? new Set() : undefined;


        do { //we are updating everyone on the same step or up till their goal is reached so we can have concurrent planning
            if(agentHasAvoidanceRule) occupiedCells.clear();
            for (const key of unfinishedKeys) { 
                if (!this.openSets[key].isEmpty()) {
                    const goal = goals[key];
                    let current = this.openSets[key].pop();

                    // Update current position for each agent
                    if(agentHasAvoidanceRule) occupiedCells.add(current);

                    if (current === this.end) {
                        this.paths[key] = this.reconstructPath(current);
                        delete unfinishedGoals[key];
                        delete unfinishedKeys[key];
                        if(unfinishedKeys.length === 0) allEmpty = true;
                        continue;
                    }
    
                    this.closedSets[key].add(current);
    
                    let hasValidMove = false;
                    for (let neighbor of this.maze.getReachableNeighbors(current, allowDiagonal)) {
                        if (this.closedSets[key].has(neighbor)) continue;

                        if (agentHasAvoidanceRule) {
                            if (this.closedSets[key].has(neighbor) || (goal.cannotOccupySameCell && occupiedCells.has(neighbor))) 
                                continue;
                        }

    
                        neighbor = this.initializeCellMulti(neighbor, 0, key);
                        
                        const heuristics = neighbor.heuristics[key];
                        let tempG = heuristics.g + 1;
    
                        if (!(neighbor.id in this.openSets[key].elementIndices) || tempG < heuristics.g) {
                            hasValidMove = true;

                            heuristics.g = tempG;
                            heuristics.f = heuristics.g + (allowDiagonal ? this.heuristicDiag(neighbor, ends[key]) : this.heuristicGrid(neighbor, ends[key]));
                            heuristics.previous = current;

    
                            if (!(neighbor.id in this.openSets[key].elementIndices)) {
                                this.openSets[key].push(neighbor, heuristics.f);
                            } else {
                                // Update the priority queue with the new f value
                                this.openSets[key].update(neighbor, heuristics.f);
                            }
                        }
                    }

                    // If no valid move is found, and cannotOccupySameCell rule applies, wait in the current cell
                    if (!hasValidMove && waitTicks[key] < maxWaitTicks) {
                        waitTicks[key]++;
                        //console.log(`agent ${key} is waiting at ${current.x,current.y}`)
                        this.openSets[key].push(current, current.heuristics[key].f + 1); // Re-add current cell with a higher cost
                        this.closedSets[key].delete(current); // Remove current cell from closed set for reconsideration
                    }

                } else {
                    //console.log(`Goal for ${key} is currently unreachable.`);
                    delete unfinishedGoals[key];
                    delete unfinishedKeys[key];
                    if(unfinishedKeys.length === 0) allEmpty = true;
                }
            }
            if (agentHasAvoidanceRule) {
                previouslyOccupiedCells.clear();
                for (const cell of currentOccupations) {
                    previouslyOccupiedCells.add(cell);
                }
            }
        } while (!allEmpty);
    
        return this.paths;

    }
  
    initializeCellMulti(cell, gValue=0, key) {
        if(!cell.heuristics) cell.heuristics = {};
        if(!cell.heuristics[key]) cell.heuristics[key] = {
            h:0, f:0, g:gValue, previous:null
        };
        return cell;
    }

    reconstructPath(current) {
        let path = [];
        while (current) {
            path.push(current);
            current = current.previous;
        }
        return path.reverse();
    }

    reset() {
        this.openSet.reset();
        function withCell(cell) { //reset heuristics
            if('g' in cell) {cell.h = 0; cell.f = 0; cell.g = 0;}
            if(cell.heuristics) cell.heuristics = {};
        }
        this.closedSet.forEach(withCell);
        this.closedSet.clear();
        for(const key in this.closedSets) { //clear these if doing multiangle
            this.closedSets[key].forEach(withCell);
            this.closedSets[key].clear();
        }
        this.path.length = 0;
        this.start = this.maze.start;
        this.end = this.maze.end;

    }

    heuristicGrid(cell1, cell2) { //A heuristic function for grid-based pathfinding.
        // The "Manhattan Distance" is calculated as the absolute difference of the x coordinates
        // plus the absolute difference of the y coordinates. Assumes only horizontal or vertical movement
        return Math.abs(cell1.x - cell2.x) + Math.abs(cell1.y - cell2.y);
    }
  
    //we can allow for diagonal movements like this
    heuristicDiag(cell1, cell2) {
        // The Euclidean Distance is calculated as the square root of the sum of the squares
        // of the differences in x and y coordinates.
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

class PriorityQueue { //w/ binary heap structure

    constructor() {
        this.elements = [];
        this.elementIndices = {}; // Hash table to keep track of elements' indices in the heap
    }

    push(element, priority) {
        const node = { element, priority };
        let ind = this.elements.length;
        this.elements.push(node);
        this.elementIndices[element.id] = ind; // Update index in hash table
        this.bubbleUp(ind);
    }

    pop() {
        if (this.elements.length === 0) {
            return undefined;
        }

        const poppedNode = this.elements[0].element;
        const endNode = this.elements.pop();

        if (this.elements.length !== 0) {
            this.elements[0] = endNode;
            this.elementIndices[endNode.element.id] = 0;
            delete this.elementIndices[poppedNode.id];
            this.sinkDown(0);
        } else {
            delete this.elementIndices[poppedNode.id];
        }

        return poppedNode;
    }

    update(element, newPriority) {
        if (element.id in this.elementIndices) {
            const index = this.elementIndices[element.id];
            if (this.elements[index].priority !== newPriority) {
                this.elements[index].priority = newPriority;
                this.bubbleUp(index);
                this.sinkDown(index);
            }
        }
    }
    
    reset() {
        this.elements = [];
        this.elementIndices = {};
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    bubbleUp(n) {
        const node = this.elements[n];
        let parentN;

        while (n > 0) {
            parentN = (n - 1) >> 1;
            const parent = this.elements[parentN];

            if (node.priority >= parent.priority) break;

            this.elements[n] = parent;
            this.elementIndices[parent.element.id] = n;
            n = parentN;
        }

        this.elements[n] = node;
        this.elementIndices[node.element.id] = n;
    }

    sinkDown(n) {
        const length = this.elements.length;
        const node = this.elements[n];
        let childN;

        while (true) {
            let swap = null;
            childN = (n + 1) << 1;
            const leftChildN = childN - 1;

            if (leftChildN < length && this.elements[leftChildN].priority < node.priority) {
                swap = leftChildN;
            }

            if (childN < length && this.elements[childN].priority < (swap === null ? node.priority : this.elements[swap].priority)) {
                swap = childN;
            }

            if (swap === null) break;

            this.elements[n] = this.elements[swap];
            this.elementIndices[this.elements[swap].element.id] = n;
            n = swap;
        }

        this.elements[n] = node;
        this.elementIndices[node.element.id] = n;
    }
}