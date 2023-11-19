import {Maze} from './maze'
import { AStarSolver, IDAStarSolver } from './astar';

export class MazeGame {

    static activeGame;
    static pressedKeys = new Set();

    maze; canvas; context; strokeStyle; solver; cellSize; 

    intervalInputId; solveButtonId; raceButtonId;

    
    racing = false;

    constructor(maze, canvas, solver, strokeStyle='blue', playerColor={r:255,b:255,g:0}, randomAgents=false, randomAgentCount=10) {
        this.maze = maze;
        if(typeof canvas === 'string') {
            canvas = document.getElementById(canvas);
        } 
        if(!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = 500; canvas.height = 500;
            document.body.appendChild(this.canvas);
        }
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        this.strokeStyle = strokeStyle;
        this.solver = solver || new AStarSolver(this.maze);
        this.cellSize = this.canvas.width / this.maze.width; //assumed square
        
        this.canvas.addEventListener('click', () => this.setActive());
        this.maze.setPlayer(this.maze.start.x, this.maze.start.y, 0, playerColor);
        this.maze.onWin = () => {
          if(this.racing) this.stopRace();
        }

        this.maze.draw(this.context,this.cellSize,this.strokeStyle);
    }
  

    setAIInputEvents = (intervalInputId, solveButtonId, raceButtonId) => {
        this.intervalInputId = intervalInputId;
        this.solveButtonId = solveButtonId;
        this.raceButtonId = raceButtonId;
        document.getElementById(this.solveButtonId).onclick = () => this.showPath();
        document.getElementById(this.raceButtonId).onclick = () => this.raceAI();
    }

    setGeneratorInputEvents = (genButton,genXInput,genYInput,animateButton) => {

        let animateonclick = () => {
            if(this.solver.animating) {
                this.solver.animating = false; clearTimeout(this.solver.timeout); cancelAnimationFrame(this.solver.animation);
            }
            if(this.racing)
                this.stopRace();

            const intervalInput = document.getElementById(this.intervalInputId);
            const stepDelayMs = intervalInput ? parseFloat(intervalInput.value) * 1000 : 100;
            this.solver.timeout = setTimeout(()=>{
                this.solver.runAStarProgressAnimation(this.context, this.cellSize, this.strokeStyle, stepDelayMs);
            }, stepDelayMs)

            document.getElementById(animateButton).innerHTML = 'Stop Animating';
            document.getElementById(animateButton).onclick = () => {
                if(this.solver.animating) {
                    this.solver.animating = false; 
                    clearTimeout(this.solver.timeout); 
                    cancelAnimationFrame(this.solver.animation);
                }
                document.getElementById(animateButton).innerHTML = 'Animate Path';
                document.getElementById(animateButton).onclick = animateonclick;
            }
        }

        document.getElementById(genButton).onclick = () => {
            let w = document.getElementById(genXInput).value;
            let h = document.getElementById(genYInput).value;
            let nCellsPerRow = parseInt(w) ? parseInt(w) : 20;
            let nRows = parseInt(h) ? parseInt(h) : 20;
            this.cellSize = this.canvas.width/(nCellsPerRow > nRows ? nCellsPerRow : nRows); //assume square
            if(this.solver.animating) {
                this.solver.animating = false; clearTimeout(this.solver.timeout); cancelAnimationFrame(this.solver.animation);
                
                document.getElementById(animateButton).innerHTML = 'Animate Path';
                document.getElementById(animateButton).onclick = animateonclick;
            }
            this.stopRace();
            this.maze.reset(false);
            this.maze.generateMaze(nCellsPerRow,nRows);
            this.maze.draw(this.context, this.cellSize, this.strokeStyle);
        }
        document.getElementById(animateButton).onclick = animateonclick;
    }
    
    setActive = () => {

        if(MazeGame.activeGame) {
            MazeGame.activeGame.canvas.style.border = '';
        }
        // Set the current active game to this instance
        MazeGame.activeGame = this;

        // Add a visual indication that this canvas is active
        MazeGame.activeGame.canvas.style.border = '1px solid orange';
    }

    onPlayerCollision = (player, wallDirection, playerIndex) => {
        console.log("There's a wall in the way!", player, wallDirection, playerIndex)
    }

    static keyDownHandler(event) {
        // Ensure there is an active game
        if (!MazeGame.activeGame) return;

        // Update the set of currently pressed keys
        MazeGame.pressedKeys.add(event.key);
        if(event.key === 'w' || event.key === 'a' || event.key === 's' || event.key === 'd' || event.key.includes('Arrow')) 
            event.preventDefault();

        const keypressLoop = ()=>{
            if(MazeGame.pressedKeys.has(event.key)) {
                MazeGame.keyPressCheck(event);
                setTimeout(keypressLoop,200);
            }
        }

        setTimeout(keypressLoop,1500)

    }

    static keyPressCheck = (event) => {
        // Check for diagonal movement combinations and orthogonal movements
        const { maze, onPlayerCollision, context, cellSize, strokeStyle } = MazeGame.activeGame;
        let moved = false;
        if (MazeGame.pressedKeys.has('w') || MazeGame.pressedKeys.has('ArrowUp')) {
            if (MazeGame.pressedKeys.has('d') || MazeGame.pressedKeys.has('ArrowRight')) {
                event.preventDefault();
                maze.movePlayer('upRight', 0, onPlayerCollision);
            } else if (MazeGame.pressedKeys.has('a') || MazeGame.pressedKeys.has('ArrowLeft')) {
                event.preventDefault();
                maze.movePlayer('upLeft', 0, onPlayerCollision);
            } else {
                event.preventDefault();
                maze.movePlayer('up', 0, onPlayerCollision);
            }
            moved = true;
        } else if (MazeGame.pressedKeys.has('s') || MazeGame.pressedKeys.has('ArrowDown')) {
            if (MazeGame.pressedKeys.has('d') || MazeGame.pressedKeys.has('ArrowRight')) {
                event.preventDefault();
                maze.movePlayer('downRight', 0, onPlayerCollision);
            } else if (MazeGame.pressedKeys.has('a') || MazeGame.pressedKeys.has('ArrowLeft')) {
                event.preventDefault();
                maze.movePlayer('downLeft', 0, onPlayerCollision);
            } else {
                event.preventDefault();
                maze.movePlayer('down', 0, onPlayerCollision);
            }
            moved = true;
        } else if (MazeGame.pressedKeys.has('a') || MazeGame.pressedKeys.has('ArrowLeft')) {
            event.preventDefault();
            maze.movePlayer('left', 0, onPlayerCollision);
            moved = true;
        } else if (MazeGame.pressedKeys.has('d') || MazeGame.pressedKeys.has('ArrowRight')) {
            event.preventDefault();
            maze.movePlayer('right', 0, onPlayerCollision);
            moved = true;
        }
        // Redraw the maze after moving the player
        if(moved) maze.draw(context, cellSize, strokeStyle);
    }

    static keyUpHandler(event) {
        if (MazeGame.activeGame) {
            MazeGame.keyPressCheck(event);
            MazeGame.pressedKeys.delete(event.key);
        }
    }

    showPath = () => {
        // Show the path for the active game
        this.solver.solve(this.maze.start.x, this.maze.start.y, this.maze.end.x, this.maze.end.y);
        this.solver.drawPath(this.context, this.cellSize);
    }

    raceAI = (onGoalReached = (player, timestamp) => {}, drawPath=false, drawPlayerPath=true) => {
        if (this.racing) {
            this.stopRace();
        } else {
            if(!this.intervalInputId) throw new Error('call setAIInputEvents with valid HTML Elements first!');
            const intervalInput = document.getElementById(this.intervalInputId);
            const interval = intervalInput ? parseFloat(intervalInput.value) * 1000 : 1000;
            const ai = this.maze.addPlayer(this.maze.start.x, this.maze.start.y, undefined, 1);
            this.solver.solve(ai.cell.x, ai.cell.y, this.maze.end.x, this.maze.end.y, this.maze.allowDiagonal);
            this.solver.playMoves(interval, 1, this.context, this.cellSize, this.strokeStyle, onGoalReached, drawPath, drawPlayerPath);
            this.racing = true;
        
            // Update the race button text
            document.getElementById(this.raceButtonId).innerText = "Stop Race";
        }
    }
    
    stopRace() {
        this.solver.stopMoves();
        this.racing = false;
    
        // Update the race button text
        document.getElementById(this.raceButtonId).innerText = "Race AI";
    }

    //random agents going to/from random start and end points using the group navigation
    startTraffic = (randomAgentCount=10, allowDiagonal, delay=300) => {
    
        let solver = new IDAStarSolver(this.maze)// : new AStarSolver(this.maze); //todo refactor astar solver to have same loop delay logic
        
        let goals = {};
        
        for(let i = 2; i < randomAgentCount+2; i++) {
            let {startX, startY, endX, endY} = this.maze.getRandomStartAndEnd();
            this.maze.setPlayer(startX,startY,i,'rgba(0,255,0,1)');
            goals[i] = {startX,startY,endX,endY};//, rules:{cannotOccupySameCell:true}};
        }
        this.maze.draw(this.context,this.cellSize,this.strokeStyle);

        solver.solveMultiple(
            goals,
            allowDiagonal,
            10,
            (
                key, 
                path, 
                goal, 
                searched, 
                unfinishedGoals, 
                occupiedCells, 
                previouslyOccupiedCells
            ) => {

            },
            (
                goals, 
                searched, 
                unfinishedGoals, 
                occupiedCells, 
                previouslyOccupiedCells
            ) => {

                this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);

                for(const key in goals) {
                    if(goals[key].currentNode) this.maze.setPlayer(goals[key].currentNode.x,goals[key].currentNode.y,key);
                }

                for(const i in searched) {
                    for(const j in searched[i]) {
                        const cell = searched[i][j];
                        // If the cell has g and f values, use them to create a gradient
                        if (typeof cell.g !== 'undefined' && cell.g > 0 && typeof cell.f !== 'undefined' && solver.maxF > 0) {
                            // Normalize the f value using a power scale for better differentiation
                            // Adjust the exponent based on desired sensitivity (e.g., 0.5 for square root scaling)
                            const exponent = 0.999; // Can be adjusted for more or less sensitivity
                            const normalizedCost = Math.pow(cell.f / solver.maxF, exponent);

                            // Adjust hue value based on the normalized cost
                            const hue = normalizedCost * (440); // Range from 120 (green) to 240 (blue)
                            // Adjust opacity based on the normalized cost
                            const opacity = Math.min(1, normalizedCost+0.1); // Ensuring opacity is at most 1

                            // Use HSLA for coloring
                            this.context.fillStyle = `hsla(${hue}, 100%, 50%, ${opacity})`;
                            this.context.fillRect(cell.node.x * this.cellSize, cell.node.y * this.cellSize, this.cellSize, this.cellSize);
                        }
                    }
                }    

                this.maze.draw(this.context,this.cellSize,this.strokeStyle,undefined,false);

                //console.log('step');
            },
            this.maze.width*this.maze.height,
            delay
        );


        // const playMove = (
        //     pathIdx = 0, playerIndex = 0, 
        //     context, size, strokeColor, 
        //     onGoalReached = (player, timestamp)=>{}, 
        //     drawPath=false, drawPlayerPath=true
        // ) => {
        //     let move = this.paths[playerIndex];
        //     let player = this.maze.players[playerIndex];
        //     let dx = move.x - player.cell.x;
        //     let dy = move.y - player.cell.y;
        //     this.maze.movePlayer({ dx, dy }, playerIndex);
        //     this.maze.draw(context, size, strokeColor, drawPlayerPath);
        //     if(drawPath) this.drawPath(context, size);
    
        //     if (pathIdx === this.paths[playerIndex].length-1 && onGoalReached) {
        //         onGoalReached();
        //     }
        // }
    
        // const playMoves = (
        //     interval = 1000, playerIndex = 0, 
        //     context, size, strokeColor, 
        //     onGoalReached = (player, timestamp)=>{}, 
        //     drawPath=false, drawPlayerPath=true
        // ) => {
        //     let i = 0;
        //     let moves = this.path;
    
        //     this.interval = setInterval(() => {
        //         if (i < moves.length) {
        //             this.playMove(i, playerIndex, context, size, strokeColor, onGoalReached, drawPath, drawPlayerPath)
        //             i++;
        //         } else {
        //             clearInterval(this.interval);
        //         }
        //     }, interval);
        // }
    }

    stopTraffic(randomAgentCount=10) {

        for(let i = 0; i < randomAgentCount; i++) {
            this.maze.removePlayer(i+2);
        }
        this.maze.draw(this.context,this.cellSize,this.strokeStyle);

    }


}