
export const generateIsland = (width: number, height: number, landRatio: number = 0.5): boolean[][] => {
    // 1. Initialize grid with random noise
    let grid = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => Math.random() < landRatio)
    );

    // 2. Apply cellular automata rules for smoothing
    const smoothGrid = (inputGrid: boolean[][]): boolean[][] => {
        const newGrid = JSON.parse(JSON.stringify(inputGrid));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let surroundingLand = 0;
                for (let j = -1; j <= 1; j++) {
                    for (let i = -1; i <= 1; i++) {
                        if (i === 0 && j === 0) continue;
                        const newX = x + i;
                        const newY = y + j;
                        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                            if (inputGrid[newY][newX]) surroundingLand++;
                        } else {
                            // Edges count as water, encouraging island formation
                            surroundingLand--; 
                        }
                    }
                }
                if (surroundingLand > 4) newGrid[y][x] = true;
                else if (surroundingLand < 3) newGrid[y][x] = false;
            }
        }
        return newGrid;
    };
    
    // Run smoothing several times
    for (let i = 0; i < 5; i++) {
        grid = smoothGrid(grid);
    }
    
    // 3. Find the largest contiguous landmass
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const islands: { x: number, y: number }[][] = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] && !visited[y][x]) {
                const currentIsland: { x: number, y: number }[] = [];
                const queue: { x: number, y: number }[] = [{ x, y }];
                visited[y][x] = true;

                while (queue.length > 0) {
                    const { x: cx, y: cy } = queue.shift()!;
                    currentIsland.push({ x: cx, y: cy });

                    const neighbors = [
                        { x: cx, y: cy - 1 }, { x: cx + 1, y: cy },
                        { x: cx, y: cy + 1 }, { x: cx - 1, y: cy },
                    ];

                    for (const neighbor of neighbors) {
                        const { x: nx, y: ny } = neighbor;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx] && !visited[ny][nx]) {
                            visited[ny][nx] = true;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
                islands.push(currentIsland);
            }
        }
    }

    if (islands.length === 0) {
        // If no land was generated at all (unlikely), try again with more initial land
        if (landRatio < 0.8) {
             return generateIsland(width, height, landRatio + 0.1);
        }
        // Fallback to a grid with at least one land tile
        const fallbackGrid = Array.from({ length: height }, () => Array(width).fill(false));
        fallbackGrid[Math.floor(height/2)][Math.floor(width/2)] = true;
        return fallbackGrid;
    }

    // Find the largest island
    islands.sort((a, b) => b.length - a.length);
    const mainIsland = islands[0];

    // 4. Create the final grid with only the main island
    const finalGrid = Array.from({ length: height }, () => Array(width).fill(false));
    mainIsland.forEach(({ x, y }) => {
        finalGrid[y][x] = true;
    });

    return finalGrid;
};

export const findRandomLandPosition = (islandGrid: boolean[][], existingObjects: {position: {x: number, y: number}}[]): {x: number, y: number} | null => {
    const landTiles: {x: number, y: number}[] = [];
    islandGrid.forEach((row, y) => {
        row.forEach((isLand, x) => {
            if (isLand) {
                landTiles.push({ x, y });
            }
        });
    });

    const isOccupied = (pos: {x: number, y: number}) => existingObjects.some(obj => obj.position.x === pos.x && obj.position.y === pos.y);

    const availableTiles = landTiles.filter(tile => !isOccupied(tile));
    
    if (availableTiles.length === 0) return null;

    return availableTiles[Math.floor(Math.random() * availableTiles.length)];
}
