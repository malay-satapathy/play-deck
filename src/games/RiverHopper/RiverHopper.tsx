import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './RiverHopper.module.css';

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 600;
const GRID = 50; // 10 cols, 12 rows


type Rect = { x: number, y: number, w: number, h: number, speed?: number, type: 'car' | 'log' | 'water' | 'safe' };

const RiverHopper: React.FC = () => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    frog: { x: CANVAS_WIDTH / 2 - GRID / 2, y: CANVAS_HEIGHT - GRID, w: GRID - 10, h: GRID - 10 },
    obstacles: [] as Rect[],
    lanes: [] as { y: number, type: 'car' | 'log' | 'water' | 'safe', speed: number }[]
  });

  const initLevel = useCallback((lvl: number) => {
    // Row 0: Safe (Win)
    // Row 1-4: River (Logs)
    // Row 5: Safe
    // Row 6-10: Road (Cars)
    // Row 11: Safe (Start)
    const lanes = [];
    lanes.push({ y: 0, type: 'safe' as const, speed: 0 });
    lanes.push({ y: 1, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1 + lvl * 0.5) });
    lanes.push({ y: 2, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1.5 + lvl * 0.5) });
    lanes.push({ y: 3, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1 + lvl * 0.5) });
    lanes.push({ y: 4, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (2 + lvl * 0.5) });
    lanes.push({ y: 5, type: 'safe' as const, speed: 0 });
    lanes.push({ y: 6, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (2 + lvl * 0.5) });
    lanes.push({ y: 7, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1.5 + lvl * 0.5) });
    lanes.push({ y: 8, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (2.5 + lvl * 0.5) });
    lanes.push({ y: 9, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1 + lvl * 0.5) });
    lanes.push({ y: 10, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (3 + lvl * 0.5) });
    lanes.push({ y: 11, type: 'safe' as const, speed: 0 });

    const obstacles: Rect[] = [];
    lanes.forEach(lane => {
      if (lane.type === 'car') {
        const num = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < num; i++) {
          obstacles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: lane.y * GRID,
            w: 80, h: 40,
            speed: lane.speed,
            type: 'car'
          });
        }
      } else if (lane.type === 'log') {
        const num = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < num; i++) {
          obstacles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: lane.y * GRID,
            w: 120, h: 40,
            speed: lane.speed,
            type: 'log'
          });
        }
      }
    });

    gameState.current = {
      frog: { x: CANVAS_WIDTH / 2 - GRID / 2 + 5, y: CANVAS_HEIGHT - GRID + 5, w: GRID - 10, h: GRID - 10 },
      obstacles,
      lanes
    };
  }, []);

  const resetFrog = () => {
    gameState.current.frog.x = CANVAS_WIDTH / 2 - GRID / 2 + 5;
    gameState.current.frog.y = CANVAS_HEIGHT - GRID + 5;
  };

  const loseLife = useCallback(() => {
    setLives(l => {
      if (l - 1 <= 0) {
        setGameOver(true);
        addXp(Math.floor(score / 10));
        return 0;
      }
      resetFrog();
      return l - 1;
    });
  }, [score, addXp]);

  const update = useCallback(() => {
    if (gameOver) return;
    const state = gameState.current;
    
    // Move obstacles
    state.obstacles.forEach(obs => {
      obs.x += obs.speed!;
      if (obs.speed! > 0 && obs.x > CANVAS_WIDTH) obs.x = -obs.w;
      if (obs.speed! < 0 && obs.x + obs.w < 0) obs.x = CANVAS_WIDTH;
    });

    // Check row type
    const frogRow = Math.floor(state.frog.y / GRID);
    const laneType = state.lanes[frogRow]?.type;

    let hitCar = false;

    state.obstacles.forEach(obs => {
      if (
        state.frog.x < obs.x + obs.w &&
        state.frog.x + state.frog.w > obs.x &&
        state.frog.y < obs.y + obs.h &&
        state.frog.y + state.frog.h > obs.y
      ) {
        if (obs.type === 'car') hitCar = true;
      }
    });

    if (hitCar) {
      loseLife();
      return;
    }

    if (laneType === 'log') {
      let currentAttachedLog = null;
      for (const obs of state.obstacles) {
        if (
          obs.type === 'log' &&
          state.frog.x < obs.x + obs.w &&
          state.frog.x + state.frog.w > obs.x &&
          state.frog.y < obs.y + obs.h &&
          state.frog.y + state.frog.h > obs.y
        ) {
          currentAttachedLog = obs;
          break;
        }
      }

      if (currentAttachedLog) {
        state.frog.x += currentAttachedLog.speed!;
        // Screen bounds
        if (state.frog.x < 0 || state.frog.x + state.frog.w > CANVAS_WIDTH) {
          loseLife();
          return;
        }
      } else {
        // Drowned in river
        loseLife();
        return;
      }
    }

    // Win condition
    if (frogRow === 0) {
      setScore(s => s + 50);
      setLevel(l => l + 1);
      initLevel(level + 1);
    }

  }, [gameOver, score, level, initLevel, loseLife]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Background zones
    ctx.fillStyle = '#1e293b'; // Road
    ctx.fillRect(0, 6 * GRID, CANVAS_WIDTH, 5 * GRID);
    
    ctx.fillStyle = '#0284c7'; // River
    ctx.fillRect(0, 1 * GRID, CANVAS_WIDTH, 4 * GRID);
    
    ctx.fillStyle = '#10b981'; // Safe zones
    ctx.fillRect(0, 0, CANVAS_WIDTH, GRID);
    ctx.fillRect(0, 5 * GRID, CANVAS_WIDTH, GRID);
    ctx.fillRect(0, 11 * GRID, CANVAS_WIDTH, GRID);

    // Obstacles
    state.obstacles.forEach(obs => {
      if (obs.type === 'car') {
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.fillRect(obs.x, obs.y + 5, obs.w, obs.h);
      } else if (obs.type === 'log') {
        ctx.fillStyle = '#92400e';
        ctx.shadowBlur = 0;
        ctx.fillRect(obs.x, obs.y + 5, obs.w, obs.h);
      }
    });
    ctx.shadowBlur = 0;

    // Frog
    ctx.fillStyle = '#4ade80';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4ade80';
    ctx.fillRect(state.frog.x, state.frog.y, state.frog.w, state.frog.h);
    ctx.shadowBlur = 0;

  }, []);

  const loop = useCallback(() => {
    if (!gameOver) {
      update();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw, gameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    initLevel(1);
  }, [initLevel]);

  const moveFrog = (dx: number, dy: number) => {
    if (gameOver) return;
    const state = gameState.current;
    const newX = state.frog.x + dx * GRID;
    const newY = state.frog.y + dy * GRID;

    if (newX >= 0 && newX + state.frog.w <= CANVAS_WIDTH) {
      state.frog.x = newX;
    }
    if (newY >= 0 && newY + state.frog.h <= CANVAS_HEIGHT) {
      state.frog.y = newY;
    }
    setScore(s => s + 1); // point for moving
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') moveFrog(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') moveFrog(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') moveFrog(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') moveFrog(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    initLevel(1);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>River-Hopper</h2>
          <div className={styles.stats}>
            <span>Lvl: {level}</span>
            <span>Score: {score}</span>
            <span style={{ color: '#ef4444' }}>{'❤️'.repeat(lives)}</span>
          </div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>SQUASHED!</h2>
            <p>Level: {level} | Score: {score}</p>
            <p>XP Earned: +{Math.floor(score / 10)}</p>
            <button onClick={restart} className={styles.restartBtn}>Play Again</button>
          </div>
        )}

        <div className={styles.dpad}>
          <button className={`${styles.dpadBtn} ${styles.up}`} onClick={() => moveFrog(0, -1)}>↑</button>
          <button className={`${styles.dpadBtn} ${styles.left}`} onClick={() => moveFrog(-1, 0)}>←</button>
          <button className={`${styles.dpadBtn} ${styles.down}`} onClick={() => moveFrog(0, 1)}>↓</button>
          <button className={`${styles.dpadBtn} ${styles.right}`} onClick={() => moveFrog(1, 0)}>→</button>
        </div>
      </div>
    </div>
  );
};

export default RiverHopper;
