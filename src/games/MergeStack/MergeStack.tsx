import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './MergeStack.module.css';

type Grid = number[][];

const TECH_MAP: Record<number, string> = {
  2: 'HTML',
  4: 'CSS',
  8: 'JS',
  16: 'React',
  32: 'TS',
  64: 'Node',
  128: 'SQL',
  256: 'Docker',
  512: 'K8s',
  1024: 'AWS',
  2048: 'WEB3'
};

const COLOR_MAP: Record<number, string> = {
  2: '#e34c26',
  4: '#264de4',
  8: '#f7df1e',
  16: '#61dafb',
  32: '#3178c6',
  64: '#339933',
  128: '#003b57',
  256: '#2496ed',
  512: '#326ce5',
  1024: '#ff9900',
  2048: '#a29bfe'
};

const getEmptyGrid = (): Grid => [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const addRandomTile = (grid: Grid): Grid => {
  const emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) emptyCells.push({ r, c });
    }
  }
  if (emptyCells.length === 0) return grid;
  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
};

const checkNoMoves = (grid: Grid): boolean => {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return false;
      if (r < 3 && grid[r][c] === grid[r+1][c]) return false;
      if (c < 3 && grid[r][c] === grid[r][c+1]) return false;
    }
  }
  return true;
};

const MergeStack: React.FC = () => {
  const [grid, setGrid] = useState<Grid>(() => addRandomTile(addRandomTile(getEmptyGrid())));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const { addXp } = useGlobalState();

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    addXp(Math.floor(score / 10)); // Convert score to XP
  }, [score, addXp]);

  const slideRow = (row: number[]): { newRow: number[], scoreIncrease: number } => {
    let scoreIncrease = 0;
    // Remove zeros
    let arr = row.filter(val => val !== 0);
    // Merge adjacent duplicates
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        scoreIncrease += arr[i];
        arr.splice(i + 1, 1);
      }
    }
    // Pad with zeros
    while (arr.length < 4) {
      arr.push(0);
    }
    return { newRow: arr, scoreIncrease };
  };

  const move = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    
    let newGrid = getEmptyGrid();
    let scoreInc = 0;
    let changed = false;

    for (let i = 0; i < 4; i++) {
      let row = [];
      if (direction === 'LEFT' || direction === 'RIGHT') {
        row = [...grid[i]];
        if (direction === 'RIGHT') row.reverse();
      } else {
        row = [grid[0][i], grid[1][i], grid[2][i], grid[3][i]];
        if (direction === 'DOWN') row.reverse();
      }

      const { newRow, scoreIncrease } = slideRow(row);
      scoreInc += scoreIncrease;

      if (direction === 'RIGHT' || direction === 'DOWN') newRow.reverse();

      for (let j = 0; j < 4; j++) {
        const val = newRow[j];
        if (direction === 'LEFT' || direction === 'RIGHT') {
          newGrid[i][j] = val;
          if (val !== grid[i][j]) changed = true;
        } else {
          newGrid[j][i] = val;
          if (val !== grid[j][i]) changed = true;
        }
      }
    }

    if (changed) {
      newGrid = addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(s => s + scoreInc);
      
      if (checkNoMoves(newGrid)) {
        handleGameOver();
      }
    }
  }, [grid, gameOver, handleGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('UP'); break;
        case 'ArrowDown': move('DOWN'); break;
        case 'ArrowLeft': move('LEFT'); break;
        case 'ArrowRight': move('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameOver) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) move(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      if (Math.abs(dy) > 30) move(dy > 0 ? 'DOWN' : 'UP');
    }
    
    touchStartRef.current = null;
  };

  const restart = () => {
    setGrid(addRandomTile(addRandomTile(getEmptyGrid())));
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h1>Merge the Stack</h1>
          <div className={styles.scoreBoard}>Score: {score}</div>
        </div>
        
        <div 
          className={styles.grid}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {grid.map((row, rIdx) => 
            row.map((cell, cIdx) => (
              <div 
                key={`${rIdx}-${cIdx}`} 
                className={styles.cell}
                style={{ 
                  backgroundColor: cell > 0 ? COLOR_MAP[cell] || '#333' : 'rgba(255,255,255,0.05)',
                  color: cell === 8 ? '#000' : '#fff', // JS is yellow, need black text
                  boxShadow: cell > 0 ? '0 4px 6px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {cell > 0 ? TECH_MAP[cell] || cell : ''}
              </div>
            ))
          )}
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>Game Over!</h2>
            <p>You earned {Math.floor(score / 10)} global XP!</p>
            <button onClick={restart} className={styles.restartBtn}>Restart</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MergeStack;
