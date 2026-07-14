import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './CyberSnake.module.css';

const GRID_SIZE = 20;
const CELL_SIZE = 20; // Internal resolution
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;

const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = 'UP';
const TICK_RATE_MS = 120; // Base speed

type Point = { x: number, y: number };

const CyberSnake: React.FC = () => {
  const [uiState, setUiState] = useState({ score: 0, gameOver: false, win: false });
  const { addXp } = useGlobalState();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    snake: [...INITIAL_SNAKE] as Point[],
    direction: INITIAL_DIRECTION,
    lastProcessedDirection: INITIAL_DIRECTION, // Fixes suicide bug
    food: { x: 5, y: 5 } as Point,
    score: 0,
    gameOver: false,
    win: false,
    lastTick: performance.now(),
    xpAwarded: false
  });

  const syncUI = () => {
    setUiState({
      score: gameState.current.score,
      gameOver: gameState.current.gameOver,
      win: gameState.current.win
    });
  };

  const generateFood = (snake: Point[]) => {
    if (snake.length >= GRID_SIZE * GRID_SIZE) return { x: -1, y: -1 }; // Full grid = Win!
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  };

  const resetGame = () => {
    gameState.current = {
      snake: [...INITIAL_SNAKE],
      direction: INITIAL_DIRECTION,
      lastProcessedDirection: INITIAL_DIRECTION,
      food: generateFood(INITIAL_SNAKE),
      score: 0,
      gameOver: false,
      win: false,
      lastTick: performance.now(),
      xpAwarded: false
    };
    syncUI();
  };

  // Fixed timestep loop
  const update = useCallback((time: number) => {
    const state = gameState.current;
    if (state.gameOver || state.win) return;

    // Execute exactly 1 tick every TICK_RATE_MS
    if (time - state.lastTick >= TICK_RATE_MS) {
      state.lastTick = time;

      const head = state.snake[0];
      const newHead = { ...head };

      // Apply direction
      const dir = state.direction;
      state.lastProcessedDirection = dir;

      if (dir === 'UP') newHead.y -= 1;
      if (dir === 'DOWN') newHead.y += 1;
      if (dir === 'LEFT') newHead.x -= 1;
      if (dir === 'RIGHT') newHead.x += 1;

      // Wrap-around logic
      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      else if (newHead.x >= GRID_SIZE) newHead.x = 0;
      if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
      else if (newHead.y >= GRID_SIZE) newHead.y = 0;

      const eating = newHead.x === state.food.x && newHead.y === state.food.y;
      
      // Self collision (exclude the tail if not eating, as it moves out of the way)
      const collidableBody = eating ? state.snake : state.snake.slice(0, -1);
      
      if (collidableBody.some(s => s.x === newHead.x && s.y === newHead.y)) {
        state.gameOver = true;
        if (!state.xpAwarded) {
           addXp(Math.floor(state.score / 5));
           state.xpAwarded = true;
        }
        syncUI();
        return;
      }

      state.snake.unshift(newHead);

      if (eating) {
        state.score += 10;
        state.food = generateFood(state.snake);
        if (state.food.x === -1) {
          state.win = true;
          if (!state.xpAwarded) {
             addXp(100);
             state.xpAwarded = true;
          }
        }
        syncUI();
      } else {
        state.snake.pop(); // Remove tail
      }
    }
  }, [addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.lineWidth = 1;
    for(let i=0; i<GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
        ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      state.food.x * CELL_SIZE + CELL_SIZE / 2, 
      state.food.y * CELL_SIZE + CELL_SIZE / 2, 
      CELL_SIZE / 2 - 2, 0, Math.PI * 2
    );
    ctx.fill();

    // Draw Snake
    state.snake.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = '#10b981'; // Head
      } else {
        ctx.fillStyle = '#059669'; // Body
      }
      ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      
      // Eyes for head
      if (index === 0) {
        ctx.fillStyle = '#020617';
        const d = state.direction;
        const hx = segment.x * CELL_SIZE;
        const hy = segment.y * CELL_SIZE;
        if (d === 'UP' || d === 'DOWN') {
           const e1y = d === 'UP' ? hy + 4 : hy + CELL_SIZE - 6;
           ctx.fillRect(hx + 4, e1y, 3, 3);
           ctx.fillRect(hx + CELL_SIZE - 7, e1y, 3, 3);
        } else {
           const e1x = d === 'LEFT' ? hx + 4 : hx + CELL_SIZE - 6;
           ctx.fillRect(e1x, hy + 4, 3, 3);
           ctx.fillRect(e1x, hy + CELL_SIZE - 7, 3, 3);
        }
      }
    });

  }, []);

  const loop = useCallback((time: number) => {
    update(time);
    if (canvasRef.current && !gameState.current.gameOver && !gameState.current.win) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx);
    }
    if (!gameState.current.gameOver && !gameState.current.win) {
       requestRef.current = requestAnimationFrame(loop);
    }
  }, [update, draw]);

  useEffect(() => {
    // Canvas setup
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        draw(ctx);
      }
    }
    
    // Start game
    gameState.current.food = generateFood(gameState.current.snake);
    requestRef.current = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop, draw]);

  const changeDirection = useCallback((newDir: string) => {
    const lastDir = gameState.current.lastProcessedDirection;
    if (newDir === 'UP' && lastDir !== 'DOWN') gameState.current.direction = 'UP';
    if (newDir === 'DOWN' && lastDir !== 'UP') gameState.current.direction = 'DOWN';
    if (newDir === 'LEFT' && lastDir !== 'RIGHT') gameState.current.direction = 'LEFT';
    if (newDir === 'RIGHT' && lastDir !== 'LEFT') gameState.current.direction = 'RIGHT';
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w') changeDirection('UP');
      if (e.key === 'ArrowDown' || e.key === 's') changeDirection('DOWN');
      if (e.key === 'ArrowLeft' || e.key === 'a') changeDirection('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd') changeDirection('RIGHT');
    };
    
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection]);

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Cyber-Snake</h2>
          <div className={styles.scoreBoard}>Score: {uiState.score}</div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            style={{ width: '100%', maxWidth: '400px', aspectRatio: '1/1' }}
            className={styles.canvas}
          />
          
          {(uiState.gameOver || uiState.win) && (
            <div className={styles.gameOverOverlay}>
              <h2 style={{ color: uiState.win ? '#10b981' : '#ef4444' }}>
                {uiState.win ? 'SYSTEM SECURED!' : 'CONNECTION LOST!'}
              </h2>
              <p>Score: {uiState.score}</p>
              <p>XP Earned: {uiState.win ? '+100' : `+${Math.floor(uiState.score / 5)}`}</p>
              <button 
                onClick={() => {
                   resetGame();
                   requestRef.current = requestAnimationFrame(loop);
                }} 
                className={styles.restartBtn}
              >
                Reboot System
              </button>
            </div>
          )}
        </div>
        
        <div className={styles.mobileControls}>
          <div className={styles.dpadRow}>
             <button className={`${styles.dpadBtn} ${styles.upBtn}`} onPointerDown={(e) => { e.preventDefault(); changeDirection('UP'); }} onPointerUp={(e)=>e.preventDefault()}>↑</button>
          </div>
          <div className={styles.dpadRowX}>
             <button className={styles.dpadBtn} onPointerDown={(e) => { e.preventDefault(); changeDirection('LEFT'); }} onPointerUp={(e)=>e.preventDefault()}>←</button>
             <button className={styles.dpadBtn} onPointerDown={(e) => { e.preventDefault(); changeDirection('RIGHT'); }} onPointerUp={(e)=>e.preventDefault()}>→</button>
          </div>
          <div className={styles.dpadRow}>
             <button className={`${styles.dpadBtn} ${styles.downBtn}`} onPointerDown={(e) => { e.preventDefault(); changeDirection('DOWN'); }} onPointerUp={(e)=>e.preventDefault()}>↓</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberSnake;
