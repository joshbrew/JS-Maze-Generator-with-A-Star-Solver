
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
}

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
}

