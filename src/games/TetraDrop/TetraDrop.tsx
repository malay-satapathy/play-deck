import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './TetraDrop.module.css';

const COLS = 10;
const ROWS = 20;

// Tetromino shapes and their colors
const TETROMINOS = {
  I: { shape: [[1,1,1,1]], color: '#06b6d4' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#3b82f6' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#f97316' },
  O: { shape: [[1,1],[1,1]], color: '#eab308' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#22c55e' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#ef4444' }
};

const TETRO_KEYS = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];

const createEmptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const randomTetromino = () => {
  const rand = TETRO_KEYS[Math.floor(Math.random() * TETRO_KEYS.length)];
  return TETROMINOS[rand];
};

const TetraDrop: React.FC = () => {
  const [grid, setGrid] = useState<any[][]>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const { addXp } = useGlobalState();
  const requestRef = useRef<number>(0);
  const dropCounter = useRef(0);
  
  const state = useRef({
    piece: randomTetromino(),
    x: 3,
    y: 0,
    dropInterval: 1000
  });

  const checkCollision = (piece: any, x: number, y: number, currentGrid: any[][]) => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0) {
          if (
            y + r >= ROWS ||
            x + c < 0 ||
            x + c >= COLS ||
            (y + r >= 0 && currentGrid[y + r][x + c] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergePiece = (piece: any, x: number, y: number, currentGrid: any[][]) => {
    const newGrid = currentGrid.map(row => [...row]);
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0 && y + r >= 0) {
          newGrid[y + r][x + c] = piece.color;
        }
      }
    }
    return newGrid;
  };

  const clearLines = (currentGrid: any[][]) => {
    let linesCleared = 0;
    const newGrid = currentGrid.filter(row => {
      const isFull = row.every(cell => cell !== 0);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newGrid.length < ROWS) {
      newGrid.unshift(Array(COLS).fill(0));
    }

    if (linesCleared > 0) {
      setScore(s => {
        const points = [0, 100, 300, 500, 800][linesCleared];
        return s + points;
      });
      state.current.dropInterval = Math.max(100, 1000 - Math.floor(score / 500) * 100);
    }
    
    return newGrid;
  };

  const drop = useCallback(() => {
    if (gameOver) return;
    
    if (!checkCollision(state.current.piece, state.current.x, state.current.y + 1, grid)) {
      state.current.y++;
      setGrid([...grid]); // force re-render
    } else {
      if (state.current.y === 0) {
        setGameOver(true);
        addXp(Math.floor(score / 100));
        return;
      }
      const newGrid = mergePiece(state.current.piece, state.current.x, state.current.y, grid);
      const clearedGrid = clearLines(newGrid);
      setGrid(clearedGrid);
      
      state.current.piece = randomTetromino();
      state.current.y = 0;
      state.current.x = 3;
    }
    dropCounter.current = 0;
  }, [grid, gameOver, score, addXp]);

  const move = (dir: -1 | 1) => {
    if (!checkCollision(state.current.piece, state.current.x + dir, state.current.y, grid)) {
      state.current.x += dir;
      setGrid([...grid]);
    }
  };

  const rotate = () => {
    const piece = state.current.piece;
    const rotatedShape = piece.shape[0].map((_: any, index: number) =>
      piece.shape.map((row: any[]) => row[index]).reverse()
    );
    const rotatedPiece = { ...piece, shape: rotatedShape };

    // Wall kick
    let offset = 0;
    if (checkCollision(rotatedPiece, state.current.x, state.current.y, grid)) {
      offset = state.current.x > COLS / 2 ? -1 : 1;
      if (checkCollision(rotatedPiece, state.current.x + offset, state.current.y, grid)) {
        return; // cant rotate
      }
    }
    
    state.current.piece = rotatedPiece;
    state.current.x += offset;
    setGrid([...grid]);
  };

  const update = useCallback((time: number) => {
    if (!gameOver) {
      if (!dropCounter.current) dropCounter.current = time;
      const deltaTime = time - dropCounter.current;

      if (deltaTime > state.current.dropInterval) {
        drop();
        dropCounter.current = time;
      }
    }
    requestRef.current = requestAnimationFrame(update);
  }, [drop, gameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowDown') drop();
      if (e.key === 'ArrowUp') rotate();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drop, gameOver, grid]);

  const restart = () => {
    setGrid(createEmptyGrid());
    setScore(0);
    setGameOver(false);
    state.current = { piece: randomTetromino(), x: 3, y: 0, dropInterval: 1000 };
    dropCounter.current = 0;
  };

  // Combine grid and falling piece for rendering
  const displayGrid = grid.map(row => [...row]);
  if (!gameOver) {
    for (let r = 0; r < state.current.piece.shape.length; r++) {
      for (let c = 0; c < state.current.piece.shape[r].length; c++) {
        if (state.current.piece.shape[r][c] !== 0) {
          const gy = state.current.y + r;
          const gx = state.current.x + c;
          if (gy >= 0 && gy < ROWS) {
            displayGrid[gy][gx] = state.current.piece.color;
          }
        }
      }
    }
  }

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Tetra-Drop</h2>
          <div className={styles.scoreBoard}>Score: {score}</div>
        </div>

        <div className={styles.gridContainer}>
          <div className={styles.grid}>
            {displayGrid.map((row, y) => (
              row.map((cell, x) => (
                <div 
                  key={`${x}-${y}`} 
                  className={styles.cell}
                  style={{ 
                    backgroundColor: cell !== 0 ? cell : 'transparent',
                    boxShadow: cell !== 0 ? `0 0 10px ${cell}88, inset 0 0 5px rgba(0,0,0,0.5)` : 'none',
                    border: cell !== 0 ? `1px solid ${cell}` : '1px solid rgba(255,255,255,0.05)'
                  }}
                />
              ))
            ))}
          </div>
          
          {gameOver && (
            <div className={styles.gameOverOverlay}>
              <h2>TOPPED OUT!</h2>
              <p>Score: {score}</p>
              <p>XP Earned: +{Math.floor(score / 100)}</p>
              <button onClick={restart} className={styles.restartBtn}>Play Again</button>
            </div>
          )}
        </div>

        <div className={styles.dpad}>
          <button className={`${styles.dpadBtn} ${styles.up}`} onClick={rotate}>⟳</button>
          <button className={`${styles.dpadBtn} ${styles.left}`} onClick={() => move(-1)}>←</button>
          <button className={`${styles.dpadBtn} ${styles.down}`} onClick={drop}>↓</button>
          <button className={`${styles.dpadBtn} ${styles.right}`} onClick={() => move(1)}>→</button>
        </div>
      </div>
    </div>
  );
};

export default TetraDrop;
