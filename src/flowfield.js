export class FlowField {

    width;
    height;
    allowDiagonal;
    costField;
    integrationField;
    flowField

    constructor(
        options
    ) {
        this.init(options);
    }

    init(options) {
        if(options.allowDiagonal) this.allowDiagonal = options.allowDiagonal;
        if(options.maze) {
            this.width = maze.width*7;
            this.height = maze.height*7;

        } else if(options.width) {
            this.width = options.width;
            this.height = options.height;
        }
        if(options.costRules) this.costField = this.applyCostRules(options.costField, options.costRules);
        else this.costField = options.costField ? options.costField : this.initializeGrid(Infinity);
        
        this.integrationField = this.initializeGrid(Infinity);
        
        this.flowField = this.initializeGrid({ cost: Infinity, direction: null });
    }

    applyCostRules(costField, costRules) {
        let result = new Array(costField.length);
        for (let y = 0; y < costField.length; y++) {
            result[y] = new Array(costField[y].length);
            for (let x = 0; x < costField[y].length; x++) {
                const terrainType = costField[y][x];
                if (terrainType in costRules) {
                    // Apply the numerical cost based on the rule
                    result[y][x] = costRules[terrainType];
                } else {
                    // If no rule exists for the terrain type, default to impassable
                    result[y][x] = Infinity;
                }
            }
        }

        return result;
    }

    initializeGrid(defaultValue) {
        let grid = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            grid[y] = new Array(this.width).fill(defaultValue);
        }
        return grid;
    }

    setMazeTerrain(maze) {
        // Loop through each MazeCell and update the corresponding 7x7 grid
        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                this.setCostFieldMazeCell(x, y, maze.cells[y][x]);
            }
        }
    }

    setCostFieldMazeCell(x, y, mazeCell) {
        // Define the 7x7 subgrid for each MazeCell
        const baseX = x * 7;
        const baseY = y * 7;
        const offset = this.allowDiagonals ? 1 : 0;

        // Set costs for the entire 7x7 grid
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                // The corners and edges are walls if allowDiagonals is true
                let cost = this.calculateCostForMazePosition(i, j, mazeCell, offset);
                this.costField[baseY + j][baseX + i] = cost;
            }
        }
    }

    calculateCostForMazePosition(i, j, mazeCell) {
        // Impassable edge of the subgrid
        if (i === 0 || i === 6 || j === 0 || j === 6) {
            return Infinity;
        }
    
        // Passable inner 3x3 grid
        if (i >= 2 && i <= 4 && j >= 2 && j <= 4) {
            return 1;
        }
    
        // Handle orthogonal walls: make the 2x3 section for up/down/left/right walls impassable
        if (mazeCell.walls.up && j === 1 && i >= 2 && i <= 4) return Infinity;
        if (mazeCell.walls.down && j === 5 && i >= 2 && i <= 4) return Infinity;
        if (mazeCell.walls.left && i === 1 && j >= 2 && j <= 4) return Infinity;
        if (mazeCell.walls.right && i === 5 && j >= 2 && j <= 4) return Infinity;
    
        // Handle passable diagonal walls
        if (this.allowDiagonals) {
            // Cut out for upLeft diagonal
            if (mazeCell.walls.upLeft && ((i === 1 && (j === 2 || j === 1)) || (j === 1 && (i === 2 || i === 1)))) {
                return Infinity;
            }
            // Cut out for upRight diagonal
            if (mazeCell.walls.upRight && ((i === 5 && (j === 2 || j === 1)) || (j === 1 && (i === 4 || i === 5)))) {
                return Infinity;
            }
            // Cut out for downRight diagonal
            if (mazeCell.walls.downRight && ((i === 5 && (j === 4 || j === 5)) || (j === 5 && (i === 4 || i === 5)))) {
                return Infinity;
            }
            // Cut out for downLeft diagonal
            if (mazeCell.walls.downLeft && ((i === 1 && (j === 4 || j === 5)) || (j === 5 && (i === 2 || i === 1)))) {
                return Infinity;
            }
        }
    
        // Cells are passable if not part of an orthogonal or diagonal wall
        return 1;
    }

    updateField(goalX, goalY) { 
        // Validate goal coordinates
        if (goalX < 0 || goalX >= this.width || goalY < 0 || goalY >= this.height) {
            console.error('Goal coordinates are out of bounds');
            return;
        }

        if (this.costField[goalY][goalX] === Infinity) {
            console.error('Goal is on an impassable terrain');
        }

        // Reset fields before recalculating
        this.integrationField = this.initializeGrid(Infinity);
        this.flowField = this.initializeGrid({ cost: Infinity, direction: null });

        this.calculateIntegrationField(goalX, goalY);
        this.calculateFlowField();
    }

    calculateIntegrationField(goalX, goalY) {
        let queue = [{x: goalX, y: goalY, cost: 0}];
        this.integrationField[goalY][goalX] = 0;
    
        while (queue.length > 0) {
            let {x, y, cost} = queue.shift();
    
            this.getNeighbors(x, y).forEach(({nx, ny}) => {
                let newCost = cost + this.costField[ny][nx];
                if (newCost < this.integrationField[ny][nx]) {
                    this.integrationField[ny][nx] = newCost;
                    queue.push({x: nx, y: ny, cost: newCost});
                }
            });
        }
    }

    calculateFlowField() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.costField[y][x] !== Infinity) {
                    let lowestCost = Infinity;
                    let direction = null;
    
                    this.getNeighbors(x, y).forEach(({nx, ny}) => {
                        let neighborCost = this.integrationField[ny][nx];
                        if (neighborCost < lowestCost) {
                            lowestCost = neighborCost;
                            direction = {x: nx - x, y: ny - y};
                        }
                    });
    
                    this.flowField[y][x] = { cost: lowestCost, direction };
                }
            }
        }
        this.convolveFlowField();
    }

    convolveFlowField() {
        // Apply a convolution step to smooth the directions
        let kernel = [
            [0.05, 0.1, 0.05],
            [0.1,  0.4,  0.1],
            [0.05, 0.1, 0.05]
        ];
    
        // Create a new flow field for the results of the convolution
        let newFlowField = this.initializeGrid({ cost: Infinity, direction: null });
    
         // Iterate over each cell, skipping the edges
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                let directionSum = {x: 0, y: 0};
                let kernelSum = 0;

                // Only convolve passable cells (cost != Infinity)
                if (this.costField[y][x] !== Infinity) {
                    // Apply the kernel to the neighboring cells
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            let currentDirection = this.flowField[y + ky][x + kx].direction;
                            if (currentDirection) {
                                let weight = kernel[ky + 1][kx + 1];
                                directionSum.x += currentDirection.x * weight;
                                directionSum.y += currentDirection.y * weight;
                                kernelSum += weight;
                            }
                        }
                    }

                    // Average the direction values to get the smoothed direction
                    if (kernelSum > 0) {
                        newFlowField[y][x] = {
                            cost: this.flowField[y][x].cost,
                            direction: {
                                x: directionSum.x / kernelSum,
                                y: directionSum.y / kernelSum
                            }
                        };
                    } else {
                        // Preserve original direction if no neighbors contribute to convolution
                        newFlowField[y][x] = this.flowField[y][x];
                    }
                }
            }
        }

    
        // Replace the old flow field with the convolved one
        this.flowField = newFlowField;
    }

    directions = [
        {dx: -1, dy: 0}, {dx: 1, dy: 0},
        {dx: 0, dy: -1}, {dx: 0, dy: 1}
    ]
    directionsOct = [
        {dx: -1, dy: 0}, {dx: 1, dy: 0},
        {dx: 0, dy: -1}, {dx: 0, dy: 1},
        {dx: -1, dy: -1}, {dx: 1, dy: -1},
        {dx: -1, dy: 1}, {dx: 1, dy: 1}
    ]

    getNeighbors(x, y) {
        const neighbors = [];

        const directions = this.allowDiagonal ? this.directionsOct : this.directions;

        directions.forEach(({dx, dy}) => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < this.width && ny < this.height) {
                neighbors.push({nx, ny});
            }
        });

        return neighbors;
    }

    getDirection(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.flowField[y]?.[x]?.direction;
        }
        else return null;
    }

    // Method to get the cost at a specific grid cell
    getCost(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.costField[y][x];
        }
        return Infinity; // Return Infinity if the coordinates are outside the grid or for impassable terrain
    }


    toggleVisualizationMode() {
        const modes = ['costField', 'integrationField', 'flowField'];
        const currentModeIndex = modes.indexOf(this.visualizationMode);
        const nextModeIndex = (currentModeIndex + 1) % modes.length;
        this.visualizationMode = modes[nextModeIndex];
    }

    visualize(canvas) {
        if(!this.visualizationMode) this.visualizationMode = 'flowField'; // Default visualization mode
        const ctx = canvas.getContext('2d');
        const cellSize = canvas.width / this.width;
        this.initializeDots(100);
        const animate = () => {
            // Clear previous visualization
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    
            // Draw each cell
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    this.drawCell(ctx, x, y, cellSize, this.visualizationMode);
                }
            }
    
            // Update and draw dots
            this.updateDots();
            this.drawDots(ctx, cellSize);
    
            requestAnimationFrame(animate);
        };
    
        animate();

        // Add click event listener to canvas for recalculating flow field
        canvas.onclick = (event) => this.handleClick(event, canvas, cellSize);
    }

    handleClick(event, canvas, cellSize) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        const gridX = Math.floor(mouseX / cellSize);
        const gridY = Math.floor(mouseY / cellSize);
        this.dots.forEach(dot => {dot.isSettled = false; dot.setGoal(gridX, gridY);});
        this.updateField(gridX, gridY);
        //this.visualize(canvas);
    }

    drawCell(ctx, x, y, cellSize, mode) {
        switch (mode) {
            case 'costField':
                this.drawCostFieldCell(ctx, x, y, cellSize);
                break;
            case 'integrationField':
                this.drawIntegrationFieldCell(ctx, x, y, cellSize);
                break;
            case 'flowField':
                this.drawFlowFieldCell(ctx, x, y, cellSize);
                break;
        }
    }

    drawCostFieldCell(ctx, x, y, cellSize) {
        const cost = this.costField[y][x];
        ctx.fillStyle = this.getCostFieldColor(cost);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize); // Optional: Draw cell border
    }

    drawIntegrationFieldCell(ctx, x, y, cellSize) {
        const integrationValue = this.integrationField[y][x];
        ctx.fillStyle = this.getIntegrationFieldColor(integrationValue);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize); // Optional: Draw cell border
        this.drawText(ctx, integrationValue, x * cellSize, y * cellSize, cellSize);
    }

    drawFlowFieldCell(ctx, x, y, cellSize) {
        const cost = this.costField[y][x];
        const direction = this.flowField[y][x].direction;
    
        // Set cell color based on cost
        ctx.fillStyle = this.getCostFieldColor(cost);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    
        // Draw arrow if there is a direction
        if (direction) {
            this.drawArrow(ctx, x, y, cellSize, direction);
        }
    }
    
    getCostFieldColor(cost) {
        if (cost === Infinity) {
            return 'gray'; // Impassable terrain
        } else {
            // Vary the color based on the cost. Adjust the color scheme as needed.
            const greenIntensity = 255 - Math.min(cost * 50, 255);
            return `rgb(0, ${greenIntensity}, 0)`; // Darker green for higher costs
        }
    }

    getIntegrationFieldColor(value) {
        if (value === Infinity) return 'gray'; // Impassable
        const intensity = Math.min(1, value / 100);
        return `rgba(0, 0, 255, ${intensity})`; // Scale the blue color based on integration value
    }

    drawText(ctx, text, x, y, cellSize) {
        ctx.fillStyle = 'black';
        ctx.font = `${cellSize / 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.toString(), x + cellSize / 2, y + cellSize / 2);
    }

    drawArrow(ctx, x, y, cellSize, direction) {
        const startX = x * cellSize + cellSize / 2;
        const startY = y * cellSize + cellSize / 2;
        const endX = startX + direction.x * cellSize / 2;
        const endY = startY + direction.y * cellSize / 2;
    
        // Line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    
        // Arrowhead
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLength = cellSize / 4; // Customize length of the arrow head
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'black';
        ctx.fill();
    }

    dots = [];

    initializeDots(numberOfDots) {
        this.dots = [];
        for (let i = 0; i < numberOfDots; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            this.dots.push(new Dot(x, y));
        }
    }

    // In your FlowField class, modify the updateDots method
    updateDots() {
        const collisionRadius = 0.5; // Radius for checking collisions
        const goalRadius = 2.0; // Radius for settling near the goal
        const settleDelay = 100; // Delay (in frames) before a dot can settle

        // Update each dot
        this.dots.forEach(dot => {
            if (!dot.isSettled) {
                dot.update(this);
                dot.checkSettle(this.dots, collisionRadius, goalRadius, settleDelay);
            }

            // Check for collisions
            for (let otherDot of this.dots) {
                if (dot !== otherDot && dot.collidesWith(otherDot)) {
                    this.resolveElasticCollision(dot, otherDot);
                }
            }
        });
}

    drawDots(ctx, cellSize) {
        this.dots.forEach(dot => dot.draw(ctx, cellSize));
    }

    // Resolves elastic collision between two dots
    resolveElasticCollision(dot1, dot2) {
        // Calculate the vector from dot1 to dot2
        const dx = dot2.x - dot1.x;
        const dy = dot2.y - dot1.y;
        
        // Calculate distance between dots
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance == 0) return; // Prevent division by zero

        // Normalize the collision vector
        const nx = dx / distance;
        const ny = dy / distance;

        // Calculate relative velocity
        const vx = dot1.vx - dot2.vx;
        const vy = dot1.vy - dot2.vy;

        // Calculate relative velocity in terms of the normal direction
        const velocityAlongNormal = nx * vx + ny * vy;

        // Do not resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution (elasticity) - set to 1 for a perfectly elastic collision
        const restitution = 1;

        // Calculate impulse scalar
        const impulse = -(1 + restitution) * velocityAlongNormal / (1 / dot1.mass + 1 / dot2.mass);

        // Apply impulse to the velocities of dot1 and dot2
        dot1.vx -= impulse * nx / dot1.mass;
        dot1.vy -= impulse * ny / dot1.mass;
        dot2.vx += impulse * nx / dot2.mass;
        dot2.vy += impulse * ny / dot2.mass;

        // Separate the dots slightly to prevent sticking
        const overlap = distance / 2;
        dot1.x -= overlap * nx;
        dot1.y -= overlap * ny;
        dot2.x += overlap * nx;
        dot2.y += overlap * ny;
    }

}

class Dot {
    constructor(x, y, speed = 0.1, mass = 1) {
        this.x = x;
        this.y = y;
        this.baseSpeed = speed; // Base speed of the dot
        this.vx = 0; // Velocity in x-direction
        this.vy = 0; // Velocity in y-direction
        this.mass = mass;

        this.isSettled = false; 
        this.settleDelay = 5;
    }

    
    // New method to set the goal coordinates
    setGoal(goalX, goalY) {
        this.goalX = goalX;
        this.goalY = goalY;
    }

    // New method to check if the dot should settle
    checkSettle(dots, settleRadius, goalRadius) {
        if (this.isSettled) return; // Skip already settled dots

        // Check if dot is close to the goal
        const distanceToGoal = this.distanceTo(this.goalX, this.goalY);
        if (distanceToGoal > goalRadius) return; // Only settle near the goal

        // Check proximity to other dots
        const closeDots = dots.filter(dot => this !== dot && this.distanceTo(dot.x, dot.y) < settleRadius);
        if (closeDots.length > 0) {
            this.isSettled = true;
        }
    }

    // Helper method to calculate distance to another dot
    distanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    update(flowField) {
        const cellX = Math.floor(this.x);
        const cellY = Math.floor(this.y);
        const direction = flowField.getDirection(cellX, cellY);
        const cost = flowField.getCost(cellX, cellY);

        if (direction && cost !== Infinity) {
            // Adjust speed based on the cost. Lower cost increases speed.
            const speed = this.baseSpeed / cost;

            // Update velocity based on the direction and speed
            this.vx = direction.x * speed;
            this.vy = direction.y * speed;

            // Update position
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    draw(ctx, cellSize) {
        ctx.beginPath();
        ctx.arc(this.x * cellSize, this.y * cellSize, cellSize / 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
    }

    collidesWith(otherDot) {
        const dx = this.x - otherDot.x;
        const dy = this.y - otherDot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 0.5; // Adjust the collision threshold as needed
    }

     // Method to update the velocity
    setVelocity(vx, vy) {
        this.vx = vx;
        this.vy = vy;
    }

    // Method to update the dot position
    updatePosition() {
        this.x += this.vx;
        this.y += this.vy;
    }
}