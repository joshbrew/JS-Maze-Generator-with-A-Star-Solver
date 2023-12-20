import {Maze} from './maze'
import {AStarSolver} from './astar'
import {generateHuntAndKillMaze, generateHuntAndKillWithBraidsMaze} from './generators'


//this is pseudocode, I have no idea WTF I'm doing
export class ActiveInferenceAgent {

    lastAction; lastFeedback; memorySize;
    entropyWeight = 0.5;
    path = []; memoryBuffer = [];

    constructor(maze, memorySize, allowDiagonal) {

        this.internalModel = {
            beliefState: new Map(),
            learnedPatterns: new Map(), // Store generalized maze navigation patterns
            actions:[]
        };
        this.memorySize = memorySize;
        this.threhold = 0.5; // Initial threshold
        this.exploration_bonus = 1.0; // Initial exploration bonus
        this.collisionCount = 0;

        if(maze) this.setMaze(maze, allowDiagonal);
    }

    setMaze(maze, allowDiagonal) {
        this.maze = maze;
        this.internalModel.actions = allowDiagonal ? Object.keys(this.maze.directionsOct) : Object.keys(this.maze.directions),
        
        this.allowDiagonal = allowDiagonal;
        this.memorySize = this.maze.height * this.maze.width; //for now
        this.currentCell = maze.start;
        this.goalCell = maze.end;
        this.initializeModel(maze);
        this.memoryBuffer = []; // Reset memory buffer
        this.lastAction = null;
        this.lastFeedback = null;
    }

    initializeModel(maze) {
        this.maze = maze;
        this.internalModel.actions = this.allowDiagonal ? Object.keys(this.maze.directionsOct) : Object.keys(this.maze.directions),
        
        // Reset belief states for the new maze
        maze.cells.forEach(row => row.forEach(cell => {
            this.internalModel.beliefState.set(cell, { visited: 0 });
        }));
    }

     // More sophisticated prediction of sensory input
    predictSensoryInput(action) {
        let predictedCell = this.maze.getNeighbor(this.currentCell, action);
        if (!predictedCell) {
            return { visited: 0, outOfBounds: 1 }; // Adds outOfBounds check
        }
        let predictedState = this.internalModel.beliefState.get(predictedCell) || { visited: 0, outOfBounds: 0 };
        return predictedState;
    }

    // Enhanced belief updating mechanism with entropy
    updateBeliefs(predictedInput, actualInput) {
        let predictionError = ((actualInput.visited || 0) - (predictedInput.visited || 0)) + (predictedInput.outOfBounds ? 1 : 0);
        let entropy = this.calculateEntropy(this.currentCell);
        
        // Ensure the belief state for the current cell is updated with its visited status
        this.internalModel.beliefState.set(this.currentCell, { visited: 1, entropy });
    
        this.updateLearnedPatterns(this.currentCell, this.lastAction, predictionError);
    }

    calculateEntropy(cell) {
        let unvisitedNeighbors = 0;
        this.maze.getNeighbors(cell).forEach(neighbor => {
            if (!this.internalModel.beliefState.get(neighbor).visited) {
                unvisitedNeighbors++;
            }
        });
        // Normalize entropy value. Higher value for more unvisited neighbors.
        return unvisitedNeighbors / this.maze.getNeighbors(cell).length;
    }

    // Improved pattern learning and updating
    updateLearnedPatterns(cell, action, predictionError) {
        let patterns = this.internalModel.learnedPatterns.get(cell) || {};
        patterns[action] = patterns[action] ? (patterns[action] + predictionError) / 2 : predictionError;
        this.internalModel.learnedPatterns.set(cell, patterns);
    }

    calculateFreeEnergy(predictedInput, action) {
        let predictionError = (this.lastFeedback?.collision ? 1 : 0) - predictedInput.visited;
        predictionError += predictedInput.outOfBounds ? 1 : 0; // Penalty for out-of-bounds prediction
        return Math.pow(predictionError, 2);
    }

    selectAction() {
        let minDecisionValue = Infinity;
        let selectedAction = null;
        let possibleActions = this.internalModel.actions.filter(action => this.canMoveInDirection(action));
    
        possibleActions.forEach(action => {
            let predictedInput = this.predictSensoryInput(action);
            let freeEnergy = this.calculateFreeEnergy(predictedInput, action);
            let entropy = this.calculateEntropy(this.currentCell);
        
            let decisionValue = freeEnergy - (this.entropyWeight * entropy);
            if (this.canExploreNewPath(action)) {
                decisionValue -= this.exploration_bonus;
            }
    
            // Slight penalty for revisiting cells to encourage exploration
            // The penalty is less severe than for visited cells
            if (predictedInput.visited) {
                decisionValue += this.exploration_bonus * 0.1; // Light penalty for revisiting
            }
        
            if (decisionValue < minDecisionValue) {
                minDecisionValue = decisionValue;
                selectedAction = action;
            }
        });
    
        return selectedAction || this.selectRandomAction();
    }
    
    selectRandomAction() {
        const possibleActions = this.internalModel.actions.filter(action => this.canMoveInDirection(action));
        return possibleActions[Math.floor(Math.random() * (possibleActions.length))];
    }

    canMoveInDirection(direction) {
        const reachableNeighbors = this.maze.getReachableNeighbors(this.currentCell, this.allowDiagonal);
        const directionDelta = this.maze.directionsOct[direction];
        return reachableNeighbors.some(neighbor => 
            neighbor.x === this.currentCell.x + directionDelta.dx && 
            neighbor.y === this.currentCell.y + directionDelta.dy
        );
    }

    // Function to determine if exploring a new path is beneficial
    canExploreNewPath(action) {
        let patterns = this.internalModel.learnedPatterns.get(this.currentCell);
        let predictionError = patterns ? patterns[action] : null;
    
        return predictionError === null || predictionError < this.threhold;
    }

    performAction(action) {
        if (!action) {
            // Handle stuck agent
            action = this.handleStuckAgent();
            if (!action) return; // If still no action, return
        }
        this.lastAction = action;
        let collisionOccurred = this.attemptMove(action);
    
        // After moving, mark the new current cell as visited
        this.internalModel.beliefState.set(this.currentCell, {  ...this.internalModel.beliefState.get(this.currentCell), visited: 1 });
    
        this.updateAfterAction(collisionOccurred);
    }

    attemptMove(action) {
        let collisionOccurred = false;
        this.maze.movePlayer(action, 0, (player, wallDirection, playerIndex) => {
            this.lastFeedback = { collision: 1, direction: wallDirection };
            collisionOccurred = true;
        });
        return collisionOccurred;
    }
    
    updateAfterAction(collisionOccurred) {
        if (this.lastFeedback?.collision) {
            this.collisionCount++;
        }
    
        this.adjustExplorationBonus();
        this.adjustThreshold();
    
        this.currentCell = this.maze.players[0].cell;
        this.path.push(this.currentCell);
    
        if (this.currentCell === this.maze.end) {
            this.lastFeedback = { collision: 0, win: 1 };
        } else if (!collisionOccurred) {
            this.lastFeedback = { collision: 0, win: 0 };
        }
    }

    // Dynamically adjust exploration bonus based on performance
    adjustExplorationBonus() {
        if (this.collisionCount > this.memoryBuffer.length * 0.3) { // High collision rate
            this.exploration_bonus += 0.1; // Increase exploration bonus
        } else if (this.path.length > this.maze.height*this.maze.width) { // Too much exploration
            this.exploration_bonus = Math.max(0.5, this.exploration_bonus - 0.1); // Reduce exploration bonus, minimum 0.5
        }
    }

    adjustThreshold() {
        if (this.collisionCount > this.memoryBuffer.length * 0.3) { // High collision rate
            this.some_threshold = Math.min(1, this.some_threshold + 0.05); // Increase threshold, maximum 1
        } else if (this.path.length > this.maze.height*this.maze.width) { // Inefficient path
            this.some_threshold = Math.max(0.3, this.some_threshold - 0.05); // Decrease threshold, minimum 0.3
        }
    }

    getFeedback() {
        // Default feedback if none is provided
        return this.lastFeedback || { collision: 0, win: 0 };
    }

    adjustStrategyBasedOnFeedback() {
        // Example adjustment: Increase the weight of entropy if too many collisions occur
        let collisionCount = this.memoryBuffer.reduce((count, experience) => count + (experience.feedback.collision ? 1 : 0), 0);
        if (collisionCount > this.memoryBuffer.length * 0.5) { // If more than 50% of recent actions resulted in collisions
            this.entropyWeight += 0.1; // Increase entropy weight
        } else {
            this.entropyWeight = Math.max(0, this.entropyWeight - 0.1); // Decrease entropy weight otherwise, ensuring it doesn't go below 0
        }
    }

    getWeightForCell(cell) {
        // Placeholder implementation. Adjust according to your needs.
        const patterns = this.internalModel.learnedPatterns.get(cell);
        if (patterns) {
            return Object.values(patterns).reduce((a, b) => a + b, 0);
        }
        return 0;
    }

    updateMemoryBuffer(experience) {
        // More sophisticated memory management
        this.memoryBuffer.push(experience);
        if (this.memoryBuffer.length > this.memorySize) {
            this.prioritizeAndTrimMemoryBuffer();
        }
    }

    prioritizeAndTrimMemoryBuffer() {
        // Prioritize experiences based on the magnitude of prediction errors
        this.memoryBuffer.sort((a, b) => Math.abs(b.predictionError) - Math.abs(a.predictionError));
        this.memoryBuffer = this.memoryBuffer.slice(0, this.memorySize);
    }

    step() {
        let action = this.selectAction();
        console.log(action);
        this.performAction(action);

        let feedback = this.getFeedback();
        let predictedInput = this.predictSensoryInput(action);
        this.updateBeliefs(predictedInput, feedback);
        this.updateMemoryBuffer({ action, feedback });

        this.adjustStrategyBasedOnFeedback(); 
    
        // Check for goal achievement
        if (feedback.win) {
            console.log("Goal reached! Reinitializing for new maze.");
        }
    }

    runSolver(cellsPerRow = 20, rows = 20, allowDiagonal = false, canvas,  size, strokeStyle) {
        const onWin = (player) => {
            console.log("Player", player, "won!");
            // Providing win feedback to the agent
            this.lastFeedback = { collision: 0, win: 1 };
        };
    

        const goalSteps = cellsPerRow * rows;
        let consecutiveWins = 0; // Track number of consecutive times the goal is met

        const trySolvingMaze = () => {

            // Instantiate a new Maze
            const maze = new Maze(
                cellsPerRow, 
                rows, 
                generateHuntAndKillWithBraidsMaze, //it's better to test on multipath mazes
                onWin, 
                undefined, 
                allowDiagonal
            );

            maze.addPlayer(maze.start.x,maze.start.y,undefined,0);
            this.path = []; 
            
            const competitor = new AStarSolver(maze);
            let solution = competitor.solve(maze.start.x,maze.start.y,maze.end.x,maze.end.y,allowDiagonal);
            let astarpathLength = solution.length; 
            let astarsteps = solution.steps;
            this.setMaze(maze);

            let steps = 0;
            const maxSteps = goalSteps * 10; // Adjust based on complexity

            let context = canvas ? canvas.getContext("2d") : null;

            const interval = setInterval(() => {
                if (steps < maxSteps && !maze.won) {
                    this.step();
                    steps++;
                    // Draw progress if canvas is defined
                    if (canvas) {
                        this.drawActiveInferenceProgress(context, size, strokeStyle);
                    }
                } else {
                    clearInterval(interval);

                    if (maze.won && steps <= goalSteps) {
                        console.log(`Maze solved in ${steps} steps with path length ${this.path.length}. A* solved it in ${astarsteps} steps with path length ${astarpathLength}`);
                        consecutiveWins++;
                    } else {
                        console.log(`Maze not solved within goal steps. Steps taken: ${steps}. A* solved it in ${astarsteps}.`);
                        consecutiveWins = 0; // Reset the win streak if the goal is not met
                    }

                    // Check if the agent has met the goal consistently
                    if (consecutiveWins < 5) {
                        trySolvingMaze(); // Try solving a new maze
                    } else {
                        console.log("Goal met 5 times in a row! Optimization successful.");
                    }
                }
            }, 100);
        };

        trySolvingMaze(); // Start the first attempt
    }

    drawActiveInferenceProgress = (context, size, strokeStyle) => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    
        let maxWeight = this.calculateMaxWeight(); // Function to calculate max weight
    
        for (let y = 0; y < this.maze.height; y++) {
            for (let x = 0; x < this.maze.width; x++) {
                const cell = this.maze.cells[y][x];
                this.drawCellWalls(context, cell, size, strokeStyle); // Function to draw cell walls
                this.drawCellBasedOnWeight(context, cell, size, maxWeight); // Function to draw cells based on weight
                this.highlightVisitedCells(context, cell, size); // Function to highlight visited cells
                
            }
        }
    
        // Highlight the agent's current position
        this.highlightCurrentPosition(context, this.currentCell, size);
    }
    
    calculateMaxWeight() {
        let maxWeight = 0;
        for (let [cell, patterns] of this.internalModel.learnedPatterns) {
            let cellWeight = Object.values(patterns).reduce((a, b) => a + b, 0);
            if (cellWeight > maxWeight) {
                maxWeight = cellWeight;
            }
        }
        return maxWeight;
    }
    
    drawCellBasedOnWeight(context, cell, size, maxWeight) {
        const weight = this.getWeightForCell(cell);
        if (weight !== undefined && weight > 0) {
            const normalizedWeight = Math.pow(weight / maxWeight, 0.5);
            const hue = normalizedWeight * 240;
            const opacity = Math.min(1, normalizedWeight + 0.1);
            context.fillStyle = `hsla(${hue}, 100%, 50%, ${opacity})`;
            context.fillRect(cell.x * size, cell.y * size, size, size);
        }
    }
    
    highlightVisitedCells(context, cell, size) {
        if (this.internalModel.beliefState.get(cell)?.visited) {
            context.fillStyle = 'rgba(0, 255, 0, 0.3)';
            context.fillRect(cell.x * size, cell.y * size, size, size);
        }
    }
    
    drawCellWalls(context, cell, size, strokeStyle) {
        cell.draw(
            context, 
            size, 
            strokeStyle,
            this.maze.allowDiagonal,
            this.maze.drawFiddleHeads, 
            this.maze.seed
        );
    }
    
    highlightCurrentPosition(context, cell, size) {
        context.fillStyle = 'rgba(255, 255, 0, 0.5)';
        context.fillRect(cell.x * size, cell.y * size, size, size);
    }

}
