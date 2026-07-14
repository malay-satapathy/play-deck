import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './TetraDrop.module.css';

const COLS = 10;
const ROWS = 20;

const TETROMINOS = {
  0: { shape: [[0]], color: 'transparent' },
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#06b6d4' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#3b82f6' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#f97316' },
  O: { shape: [[1,1],[1,1]], color: '#eab308' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#22c55e' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#a855f7' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#ef4444' }
};

type TetrominoType = keyof typeof TETROMINOS;

const createEmptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// 7-Bag Randomizer
const randomTetromino = (() => {
  let bag: TetrominoType[] = [];
  return () => {
    if (bag.length === 0) {
      bag = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop() as TetrominoType;
  };
})();

// Simple SRS Wall Kicks (Right, Left, Floor)
const KICK_OFFSETS = [
  { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, 
  { x: 0, y: -1 }, { x: -1, y: -1 }, { x: 1, y: -1 },
  { x: -2, y: 0 }, { x: 2, y: 0 }
];

const TetraDrop: React.FC = () => {
  const [grid, setGrid] = useState<any[][]>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([]);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  
  // Force react to re-render when refs change
  const [, setTick] = useState(0);
  const forceRender = useCallback(() => setTick(t => t + 1), []);

  const { addXp } = useGlobalState();
  const requestRef = useRef<number>(0);
  const dropCounter = useRef<number>(0);

  const state = useRef({
    pieceType: 0 as TetrominoType,
    piece: TETROMINOS[0 as keyof typeof TETROMINOS],
    x: 0,
    y: 0,
    dropInterval: 1000,
    canHold: true,
    lockDelayTimeout: null as any
  });

  const checkCollision = useCallback((piece: any, x: number, y: number, currentGrid: any[][]) => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0) {
          const newY = y + r;
          const newX = x + c;
          if (
            newX < 0 || newX >= COLS || newY >= ROWS ||
            (newY >= 0 && currentGrid[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const spawnPiece = useCallback((type: TetrominoType) => {
    const p = TETROMINOS[type];
    state.current.pieceType = type;
    state.current.piece = p;
    state.current.x = Math.floor(COLS / 2) - Math.floor(p.shape[0].length / 2);
    state.current.y = -p.shape.length; // Spawn above screen
    state.current.canHold = true;

    // Fast-forward y until piece is visible if spawned completely above
    let startY = state.current.y;
    while (startY < 0 && !checkCollision(p, state.current.x, startY + 1, grid)) {
      startY++;
    }
    state.current.y = startY;

    if (checkCollision(p, state.current.x, state.current.y, grid)) {
      setGameOver(true);
      addXp(Math.floor(score / 100));
    }
    forceRender();
  }, [grid, checkCollision, addXp, score, forceRender]);

  const popNextPiece = useCallback(() => {
    setNextPieces(prev => {
      const next = prev[0];
      const newNext = [...prev.slice(1), randomTetromino()];
      spawnPiece(next);
      return newNext;
    });
  }, [spawnPiece]);

  const initGame = useCallback(() => {
    setGrid(createEmptyGrid());
    setScore(0);
    setGameOver(false);
    setHoldPiece(null);
    state.current.dropInterval = 1000;
    
    const next1 = randomTetromino();
    const next2 = randomTetromino();
    const next3 = randomTetromino();
    setNextPieces([next1, next2, next3]);
    
    spawnPiece(randomTetromino());
  }, [spawnPiece]);

  useEffect(() => {
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergePiece = useCallback(() => {
    const newGrid = grid.map(row => [...row]);
    let gameOverCheck = false;

    for (let r = 0; r < state.current.piece.shape.length; r++) {
      for (let c = 0; c < state.current.piece.shape[r].length; c++) {
        if (state.current.piece.shape[r][c] !== 0) {
          const y = state.current.y + r;
          const x = state.current.x + c;
          if (y < 0) {
            gameOverCheck = true;
          } else if (y < ROWS) {
            newGrid[y][x] = state.current.piece.color;
          }
        }
      }
    }

    if (gameOverCheck) {
      setGameOver(true);
      addXp(Math.floor(score / 100));
      return;
    }

    // Clear lines
    let linesCleared = 0;
    const finalGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== 0);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (finalGrid.length < ROWS) {
      finalGrid.unshift(Array(COLS).fill(0));
    }

    setGrid(finalGrid);
    
    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800][linesCleared];
      setScore(prev => {
        const newScore = prev + points;
        state.current.dropInterval = Math.max(100, 1000 - Math.floor(newScore / 500) * 100);
        return newScore;
      });
    }

    popNextPiece();
  }, [grid, score, addXp, popNextPiece]);

  const lockPiece = useCallback(() => {
    if (state.current.lockDelayTimeout) {
      clearTimeout(state.current.lockDelayTimeout);
      state.current.lockDelayTimeout = null;
    }
    mergePiece();
  }, [mergePiece]);

  const startLockDelay = useCallback(() => {
    if (!state.current.lockDelayTimeout) {
      state.current.lockDelayTimeout = setTimeout(() => {
        lockPiece();
      }, 500); // 500ms lock delay
    }
  }, [lockPiece]);

  const drop = useCallback((forceLock = false) => {
    if (gameOver) return;
    
    if (!checkCollision(state.current.piece, state.current.x, state.current.y + 1, grid)) {
      state.current.y++;
      dropCounter.current = performance.now(); // reset timer
      forceRender();
      
      // If we just landed, start lock delay
      if (checkCollision(state.current.piece, state.current.x, state.current.y + 1, grid)) {
        startLockDelay();
      }
    } else {
      if (forceLock || !state.current.lockDelayTimeout) {
        lockPiece();
      }
    }
  }, [gameOver, checkCollision, grid, forceRender, startLockDelay, lockPiece]);

  const hardDrop = useCallback(() => {
    if (gameOver) return;
    let y = state.current.y;
    while (!checkCollision(state.current.piece, state.current.x, y + 1, grid)) {
      y++;
    }
    state.current.y = y;
    lockPiece();
  }, [gameOver, checkCollision, grid, lockPiece]);

  const move = useCallback((dir: -1 | 1) => {
    if (gameOver) return;
    if (!checkCollision(state.current.piece, state.current.x + dir, state.current.y, grid)) {
      state.current.x += dir;
      // Reset lock delay on movement
      if (state.current.lockDelayTimeout) {
        clearTimeout(state.current.lockDelayTimeout);
        state.current.lockDelayTimeout = null;
        startLockDelay();
      }
      forceRender();
    }
  }, [gameOver, checkCollision, grid, startLockDelay, forceRender]);

  const rotate = useCallback(() => {
    if (gameOver) return;
    const piece = state.current.piece;
    // Transpose and reverse rows for 90deg clockwise
    const rotatedShape = piece.shape[0].map((_: any, index: number) =>
      piece.shape.map((row: any[]) => row[index]).reverse()
    );
    const rotatedPiece = { ...piece, shape: rotatedShape };

    // SRS Wall Kicks
    for (const offset of KICK_OFFSETS) {
      if (!checkCollision(rotatedPiece, state.current.x + offset.x, state.current.y + offset.y, grid)) {
        state.current.piece = rotatedPiece;
        state.current.x += offset.x;
        state.current.y += offset.y;
        
        if (state.current.lockDelayTimeout) {
          clearTimeout(state.current.lockDelayTimeout);
          state.current.lockDelayTimeout = null;
          startLockDelay();
        }
        forceRender();
        return;
      }
    }
  }, [gameOver, checkCollision, grid, startLockDelay, forceRender]);

  const hold = useCallback(() => {
    if (gameOver || !state.current.canHold) return;
    const currentType = state.current.pieceType;
    
    if (holdPiece) {
      spawnPiece(holdPiece);
    } else {
      popNextPiece();
    }
    
    setHoldPiece(currentType);
    state.current.canHold = false;
  }, [gameOver, holdPiece, spawnPiece, popNextPiece]);

  const getGhostY = () => {
    if (state.current.pieceType === 0) return 0; // Fix infinite loop on mount
    let y = Math.max(0, state.current.y); // start from at least 0
    while (!checkCollision(state.current.piece, state.current.x, y + 1, grid)) {
      y++;
      // Failsafe to prevent catastrophic hangs just in case
      if (y > ROWS + 5) break; 
    }
    return y;
  };

  // Game Loop using rAF
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
  }, [gameOver, drop]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (state.current.lockDelayTimeout) clearTimeout(state.current.lockDelayTimeout);
    };
  }, [update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      // Prevent browser scrolling
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
      }

      if (key === 'arrowleft' || key === 'a') move(-1);
      if (key === 'arrowright' || key === 'd') move(1);
      if (key === 'arrowdown' || key === 's') drop(false);
      if (key === 'arrowup' || key === 'w') rotate();
      if (key === ' ' || key === 'enter') hardDrop();
      if (key === 'c' || e.key === 'Shift') hold();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, move, drop, rotate, hardDrop, hold]);

  // Render Grid
  const displayGrid = grid.map(row => [...row]);
  let ghostY = getGhostY();

  if (!gameOver && state.current.pieceType !== 0) {
    // Draw Ghost
    for (let r = 0; r < state.current.piece.shape.length; r++) {
      for (let c = 0; c < state.current.piece.shape[r].length; c++) {
        if (state.current.piece.shape[r][c] !== 0) {
          const gy = ghostY + r;
          const gx = state.current.x + c;
          if (gy >= 0 && gy < ROWS) {
            displayGrid[gy][gx] = 'rgba(255,255,255,0.2)'; // Ghost color
          }
        }
      }
    }
    // Draw Active Piece
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

  const renderMiniGrid = (type: TetrominoType | null) => {
    if (!type) return null;
    const p = TETROMINOS[type];
    return (
      <div className={styles.miniGrid}>
        {p.shape.map((row, r) => (
          <div key={r} className={styles.miniRow}>
            {row.map((cell, c) => (
              <div 
                key={c} 
                className={styles.miniCell}
                style={{
                  backgroundColor: cell !== 0 ? p.color : 'transparent',
                  border: cell !== 0 ? `1px solid ${p.color}` : 'none'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Tetra-Drop</h2>
          <div className={styles.scoreBoard}>Score: {score}</div>
        </div>

        <div className={styles.playArea}>
          {/* Hold Box */}
          <div className={styles.sidePanel}>
            <h3>Hold</h3>
            <div className={styles.box}>
              {renderMiniGrid(holdPiece)}
            </div>
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
                      border: cell !== 0 ? (cell === 'rgba(255,255,255,0.2)' ? '1px dashed rgba(255,255,255,0.3)' : `1px solid rgba(0,0,0,0.5)`) : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: cell !== 0 && cell !== 'rgba(255,255,255,0.2)' ? `inset 0 0 8px rgba(0,0,0,0.3)` : 'none',
                    }}
                  />
                ))
              ))}
            </div>
            
            {gameOver && (
              <div className={styles.gameOverOverlay}>
                <h2>TOPPED OUT!</h2>
                <p>Score: {score}</p>
                <button onClick={initGame} className={styles.restartBtn}>Play Again</button>
              </div>
            )}
          </div>

          {/* Next Box */}
          <div className={styles.sidePanel}>
            <h3>Next</h3>
            <div className={styles.box}>
              {nextPieces.slice(0, 3).map((type, i) => (
                <div key={i} className={styles.nextPieceWrapper}>
                  {renderMiniGrid(type)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.dpad}>
          <button className={`${styles.dpadBtn} ${styles.up}`} onClick={rotate} title="Rotate (Up)">⟳</button>
          <button className={`${styles.dpadBtn} ${styles.left}`} onClick={() => move(-1)} title="Left (L)">←</button>
          <button className={`${styles.dpadBtn} ${styles.down}`} onClick={() => drop(true)} title="Soft Drop (Down)">↓</button>
          <button className={`${styles.dpadBtn} ${styles.right}`} onClick={() => move(1)} title="Right (R)">→</button>
          <button className={`${styles.dpadBtn} ${styles.hardDrop}`} onClick={hardDrop} title="Hard Drop (Space)">⤓</button>
          <button className={`${styles.dpadBtn} ${styles.hold}`} onClick={hold} title="Hold (C)">H</button>
        </div>
      </div>
    </div>
  );
};

export default TetraDrop;
