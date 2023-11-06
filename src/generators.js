//(hard windy single solution mazes)
// A simple maze generation function that connects all cells in a grid with Depth-First search. Always solvable.
export function generateDepthFirstMaze(maze) {
    // Initialize a stack to keep track of the path as we traverse through the maze.
    const stack = [];
    
    // Set the starting cell of the maze. In this case, it’s the top-left cell (0,0).
    const startCell = maze.cells[0][0];
    startCell.visited = true;  // Mark the starting cell as visited.
    stack.push(startCell);     // Push the starting cell onto the stack.

    // Continue to traverse the maze until the stack is empty.
    while (stack.length > 0) {
        // Retrieve the cell that is currently on top of the stack.
        // This represents the current position in the maze.
        const currentCell = stack[stack.length - 1];
        
        // Get all neighboring cells of the current cell that have not been visited yet.
        const unvisitedNeighbors = maze.getUnvisitedNeighbors(currentCell);

        // Check if there are any unvisited neighbors.
        if (unvisitedNeighbors.length > 0) {
            // If there are unvisited neighbors, select one at random.
            const randomNeighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];

            // Mark the selected neighbor as visited.
            randomNeighbor.visited = true;

            // Push the neighbor onto the stack. This is our new current position.
            stack.push(randomNeighbor);

            // Create a connection (i.e., remove the wall) between the current cell and the selected neighbor.
            // This is crucial to create the pathways of the maze.
            currentCell.connect(randomNeighbor);
        } else {
            // If there are no unvisited neighbors, pop the current cell off the stack.
            // This step is essential for backtracking. We're moving back to the previous cell
            // to explore other possible paths until we find an unvisited neighbor.
            stack.pop();
        }
    }

    return maze;
}

//(easier single-solution mazes)
//Hunt and kill mazes. Always solvable.
export function generateHuntAndKillMaze(maze) {
    // Start from the top-left cell of the maze.
    let currentCell = maze.getCell(0, 0);
    currentCell.visited = true; // Mark the starting cell as visited.
    
    do {
        // Get all neighboring cells of the current cell that have not been visited yet.
        const neighbors = maze.getUnvisitedNeighbors(currentCell);
      
        // Check if there are any unvisited neighbors.
        if (neighbors.length > 0) {
            // If there are unvisited neighbors, select one at random.
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Connect the current cell to the randomly chosen unvisited neighbor.
            // This step creates pathways in the maze.
            currentCell.connect(randomNeighbor);

            // Move to the chosen neighbor, making it the new current cell.
            currentCell = randomNeighbor;
        } else {
            // If there are no unvisited neighbors, enter the Hunt mode.
            currentCell = null;

            // Iterate through the entire grid to find an unvisited cell.
            for (let y = 0; y < maze.height && currentCell === null; y++) {
                for (let x = 0; x < maze.width && currentCell === null; x++) {
                    const cell = maze.getCell(x, y);

                    // If the current cell in the iteration is unvisited,
                    if (!cell.visited) {
                        // Get all visited neighbors of this cell.
                        const visitedNeighbors = maze.getVisitedNeighbors(cell);
                      
                        // If there are visited neighbors,
                        if (visitedNeighbors.length > 0) {
                            // Make the unvisited cell the new current cell.
                            currentCell = cell;

                            // Connect it to a random visited neighbor.
                            const randomVisitedNeighbor = visitedNeighbors[Math.floor(Math.random() * visitedNeighbors.length)];
                            currentCell.connect(randomVisitedNeighbor);
                        }
                    }
                }
            }
        }
      
    // Continue the algorithm until there are no more cells to process.
    } while (currentCell !== null);

    return maze;
}

//(easy multi-solution mazes)
// Maze generator that allows for branching and joining paths, creating multiple solutions.
export function generateMultiPathDepthFirstMaze(maze) {
    // Initialize the stack to keep track of the path as we traverse the maze.
    const stack = [];

    // Set the starting cell of the maze, typically the top-left cell (0,0).
    const startCell = maze.cells[0][0];
    startCell.visited = true;
    stack.push(startCell);

    // Define a function to merge paths.
    const mergeWithVisitedNeighbor = (cell) => {
        const visitedNeighbors = maze.getVisitedNeighbors(cell);
        if (visitedNeighbors.length > 0) {
            const randomVisitedNeighbor = visitedNeighbors[Math.floor(Math.random() * visitedNeighbors.length)];
            cell.connect(randomVisitedNeighbor);
        }
    };

    // Continue to traverse the maze until the stack is empty.
    while (stack.length > 0) {
        const currentCell = stack[stack.length - 1];
        const unvisitedNeighbors = maze.getUnvisitedNeighbors(currentCell);

        if (unvisitedNeighbors.length > 0) {
            const randomNeighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
            randomNeighbor.visited = true;
            stack.push(randomNeighbor);

            currentCell.connect(randomNeighbor);

            // Introduce a chance to merge this path with an existing path.
            if (Math.random() < 0.1) { // Adjust this value to control the frequency of merges.
                mergeWithVisitedNeighbor(randomNeighbor);
            }
        } else {
            stack.pop();
            // After backtracking, introduce a chance to create a new branch from a visited cell.
            if (Math.random() < 0.05 && stack.length > 0) { // Adjust this value as well.
                mergeWithVisitedNeighbor(stack[stack.length - 1]);
            }
        }
    }

    return maze;
}

export function generateSidewinderMaze(maze) {
    for (let y = 0; y < maze.height; y++) {
        // Start a new run for each row
        let run = [];

        for (let x = 0; x < maze.width; x++) {
            // Add the current cell to the current run
            const cell = maze.getCell(x, y);
            run.push(cell);

            // Decide whether to close the run
            // We close the run if the cell is at the eastern boundary or randomly
            const atEasternBoundary = (x === maze.width - 1);
            const atNorthernBoundary = (y === 0);
            const shouldCloseOut = atEasternBoundary || (!atNorthernBoundary && Math.random() < 0.5);

            if (shouldCloseOut) {
                // If closing out, we carve a passage north from a random cell in the run
                const cellToCarveNorth = run[Math.floor(Math.random() * run.length)];
                if (!atNorthernBoundary) {
                    const northNeighbor = maze.getCell(cellToCarveNorth.x, cellToCarveNorth.y - 1);
                    cellToCarveNorth.connect(northNeighbor);
                }
                // Clear the run
                run = [];
            } else {
                // If not closing out, carve east
                const eastNeighbor = maze.getCell(x + 1, y);
                cell.connect(eastNeighbor);
            }
        }
    }

    return maze;
}


export function generateEllersMaze(maze) {
    let currentRowSets = [];
    let setCounter = 1;

    const joinRight = (cell, rightCell) => {
        cell.connect(rightCell);
        currentRowSets[rightCell.x] = currentRowSets[cell.x];
    };

    const joinDown = (cell) => {
        let belowCell = maze.getCell(cell.x, cell.y + 1);
        belowCell.visited = true;
        cell.connect(belowCell);
        currentRowSets[belowCell.x] = currentRowSets[cell.x];
    };

    for (let y = 0; y < maze.height; y++) {
        // Initialize the sets for the row
        for (let x = 0; x < maze.width; x++) {
            let cell = maze.getCell(x, y);
            if (!cell.visited) {
                cell.visited = true;
                currentRowSets[x] = setCounter++;
            }
        }

        // Randomly join adjacent cells in the row if they are not in the same set
        for (let x = 0; x < maze.width - 1; x++) {
            let cell = maze.getCell(x, y);
            let rightCell = maze.getCell(x + 1, y);

            if (currentRowSets[x] !== currentRowSets[x + 1] && Math.random() > 0.5) {
                joinRight(cell, rightCell);
            }
        }

        // If it's not the last row, join at least one cell per set down
        if (y < maze.height - 1) {
            let setsJoinedDown = {};

            for (let x = 0; x < maze.width; x++) {
                if (!setsJoinedDown[currentRowSets[x]] && Math.random() > 0.5) {
                    joinDown(maze.getCell(x, y));
                    setsJoinedDown[currentRowSets[x]] = true;
                }
            }

            // Make sure at least one cell per set joins downward
            for (let x = 0; x < maze.width; x++) {
                if (!setsJoinedDown[currentRowSets[x]]) {
                    joinDown(maze.getCell(x, y));
                    setsJoinedDown[currentRowSets[x]] = true;
                }
            }
        } else {
            // For the last row, join all cells that do not share a set
            for (let x = 0; x < maze.width - 1; x++) {
                let cell = maze.getCell(x, y);
                let rightCell = maze.getCell(x + 1, y);

                if (currentRowSets[x] !== currentRowSets[x + 1]) {
                    joinRight(cell, rightCell);
                }
            }
        }
    }

    return maze;
}

export function generateHuntAndKillWithBraidsMaze(maze) {
    let currentCell = maze.getCell(0, 0);
    currentCell.visited = true;

    // Function to create a braid (loop) in the maze by connecting a cell to a visited neighbor
    const createBraid = (cell) => {
        const visitedNeighbors = maze.getVisitedNeighbors(cell);
        if (visitedNeighbors.length > 0 && Math.random() < 0.15) { // Increase the probability as needed
            const randomVisitedNeighbor = visitedNeighbors[Math.floor(Math.random() * visitedNeighbors.length)];
            cell.connect(randomVisitedNeighbor);
        }
    };

    // Function to create a partial braid by connecting a visited cell to an unvisited neighbor
    const createPartialBraid = (cell) => {
        const unvisitedNeighbors = maze.getUnvisitedNeighbors(cell);
        if (unvisitedNeighbors.length > 0 && Math.random() < 0.15) { // Increase the probability as needed
            const randomUnvisitedNeighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
            cell.connect(randomUnvisitedNeighbor);
        }
    };
    
    // Modified braid creation that looks for longer paths of visited cells
    const createLongBraid = (cell) => {
        let potentialBraidPath = [cell];
        let nextCell = cell;

        // Keep tracking the path until we reach a predefined length or no more visited neighbors
        while (potentialBraidPath.length < 3) { // Minimum braid length, increase for longer braids
            let visitedNeighbors = maze.getVisitedNeighbors(nextCell).filter(n => !potentialBraidPath.includes(n));
            if (visitedNeighbors.length === 0) break; // No more visited neighbors to extend the braid

            // Randomly select the next cell to potentially extend the braid
            nextCell = visitedNeighbors[Math.floor(Math.random() * visitedNeighbors.length)];
            potentialBraidPath.push(nextCell);
        }

        // If we have a potential braid path that is long enough, create the braid
        if (potentialBraidPath.length >= 3) {
            for (let i = 0; i < potentialBraidPath.length - 1; i++) {
                potentialBraidPath[i].connect(potentialBraidPath[i + 1]);
            }
        }
    };

    do {
        let neighbors = maze.getUnvisitedNeighbors(currentCell);

        if (neighbors.length > 0) {
            // Always try to create a partial braid before connecting to a new unvisited cell
            Math.random() > 0.5 ? createBraid(currentCell) : createPartialBraid(currentCell);
            
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            currentCell.connect(randomNeighbor);
            randomNeighbor.visited = true;
            currentCell = randomNeighbor;
        } else {
            // Attempt to create a braid on the current cell before hunting

            currentCell = null;

            // Hunt phase: look for an unvisited cell next to a visited cell
            for (let y = 0; y < maze.height && currentCell === null; y++) {
                for (let x = 0; x < maze.width && currentCell === null; x++) {
                    const cell = maze.getCell(x, y);

                    if (!cell.visited) {
                        neighbors = maze.getVisitedNeighbors(cell);

                        if (neighbors.length > 0) {
                            currentCell = cell;
                            currentCell.visited = true;
                            const randomVisitedNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                            currentCell.connect(randomVisitedNeighbor);
                            // Try to create a braid on this newly connected cell
                            createLongBraid(currentCell);
                        }
                    }
                }
            }
        }

    } while (currentCell !== null);

    return maze; // Return the modified maze
}


export function generateOrthogonalMaze(maze) {
    const stack = [];
    const startCell = maze.getCell(0, 0);
    startCell.visited = true;
    stack.push(startCell);
  
    while (stack.length > 0) {
      const currentCell = stack[stack.length - 1]; // Peek at the top of the stack without popping
      const unvisitedNeighbors = maze.getUnvisitedNeighbors(currentCell);
  
      if (unvisitedNeighbors.length > 0) {
        // Randomly select one of the unvisited neighboring cells
        const randomNeighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
        randomNeighbor.visited = true;
  
        // Remove the walls between the current cell and the selected neighbor
        maze.connect(currentCell, randomNeighbor);
  
        // Add the neighbor to the stack to continue the path from that neighbor
        stack.push(randomNeighbor);
      } else {
        // Pop the current cell off the stack when it has no unvisited neighbors
        stack.pop();
  
        // Occasionally backtrack a few steps, not just one
        if (Math.random() < 0.1 && stack.length > 1) { // 10% chance to backtrack more than one step
          const backtrackSteps = Math.floor(Math.random() * (stack.length - 1));
          stack.splice(stack.length - backtrackSteps, backtrackSteps);
        }
      }
    }
  
    // Optionally, remove some dead-ends to create alternative paths and loops
    //maze.removeDeadEnds();
  
    return maze;
} 

export function noDeadEnds(maze) {
    maze.removeDeadEnds();
}