import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './RiverHopper.module.css';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 650;
const GRID = 50; // 10 cols, 13 rows
const NUM_HOME_SLOTS = 5;
const LEVEL_TIME = 60; // seconds

type Rect = { x: number, y: number, w: number, h: number, speed?: number, type: 'car' | 'log' | 'water' | 'safe' };

const RiverHopper: React.FC = () => {
  const [uiScore, setUiScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(LEVEL_TIME);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const timerRef = useRef<number | null>(null);
  
  const gameState = useRef({
    frog: { x: 5 * GRID + 5, y: 12 * GRID + 5, w: GRID - 10, h: GRID - 10 },
    obstacles: [] as Rect[],
    lanes: [] as { y: number, type: 'car' | 'log' | 'water' | 'safe', speed: number }[],
    homeSlots: [false, false, false, false, false], // 5 slots at top
    score: 0,
    highestRow: 12,
    gameOverTriggered: false
  });

  const initLevel = useCallback((lvl: number, keepScore = false) => {
    // Row 0: Home slots
    // Row 1: Water
    // Row 2-5: River (Logs)
    // Row 6: Safe
    // Row 7-11: Road (Cars)
    // Row 12: Safe (Start)
    const lanes = [];
    lanes.push({ y: 0, type: 'safe' as const, speed: 0 }); // Home row
    lanes.push({ y: 1, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1.5 + lvl * 0.2) });
    lanes.push({ y: 2, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1.2 + lvl * 0.2) });
    lanes.push({ y: 3, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1.8 + lvl * 0.2) });
    lanes.push({ y: 4, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1 + lvl * 0.2) });
    lanes.push({ y: 5, type: 'log' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (2 + lvl * 0.2) });
    lanes.push({ y: 6, type: 'safe' as const, speed: 0 });
    lanes.push({ y: 7, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (2 + lvl * 0.2) });
    lanes.push({ y: 8, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1.5 + lvl * 0.2) });
    lanes.push({ y: 9, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (2.5 + lvl * 0.2) });
    lanes.push({ y: 10, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (1 + lvl * 0.2) });
    lanes.push({ y: 11, type: 'car' as const, speed: (Math.random() > 0.5 ? 1 : -1) * (3 + lvl * 0.2) });
    lanes.push({ y: 12, type: 'safe' as const, speed: 0 });

    const obstacles: Rect[] = [];
    lanes.forEach(lane => {
      if (lane.type === 'car') {
        const num = Math.floor(Math.random() * 2) + 1;
        const spacing = CANVAS_WIDTH / num;
        for (let i = 0; i < num; i++) {
          obstacles.push({
            x: i * spacing + (Math.random() * 30),
            y: lane.y * GRID,
            w: 80, h: 40,
            speed: lane.speed,
            type: 'car'
          });
        }
      } else if (lane.type === 'log') {
        const num = Math.floor(Math.random() * 2) + 2;
        const spacing = CANVAS_WIDTH / num;
        for (let i = 0; i < num; i++) {
          obstacles.push({
            x: i * spacing + (Math.random() * 30),
            y: lane.y * GRID,
            w: 120, h: 40,
            speed: lane.speed,
            type: 'log'
          });
        }
      }
    });

    gameState.current = {
      ...gameState.current,
      frog: { x: 4 * GRID + 5, y: 12 * GRID + 5, w: GRID - 10, h: GRID - 10 },
      obstacles,
      lanes,
      homeSlots: [false, false, false, false, false],
      highestRow: 12,
      score: keepScore ? gameState.current.score : 0,
      gameOverTriggered: false
    };

    setTimeLeft(LEVEL_TIME);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          triggerDeath();
          return LEVEL_TIME;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const resetFrog = () => {
    gameState.current.frog.x = 4 * GRID + 5;
    gameState.current.frog.y = 12 * GRID + 5;
    gameState.current.highestRow = 12;
    setTimeLeft(LEVEL_TIME);
  };

  const triggerDeath = useCallback(() => {
    if (gameState.current.gameOverTriggered) return;
    
    setLives(l => {
      if (l - 1 <= 0) {
        gameState.current.gameOverTriggered = true;
        setGameOver(true);
        addXp(Math.floor(gameState.current.score / 10));
        if (timerRef.current) clearInterval(timerRef.current);
        return 0;
      }
      resetFrog();
      return l - 1;
    });
  }, [addXp]);

  const update = useCallback((dt: number) => {
    const state = gameState.current;
    if (state.gameOverTriggered) return;
    
    // Move obstacles
    state.obstacles.forEach(obs => {
      obs.x += obs.speed! * dt;
      if (obs.speed! > 0 && obs.x > CANVAS_WIDTH) obs.x = -obs.w;
      if (obs.speed! < 0 && obs.x + obs.w < 0) obs.x = CANVAS_WIDTH;
    });

    const frogRow = Math.floor(state.frog.y / GRID);
    const laneType = state.lanes[frogRow]?.type;

    let hitCar = false;
    let hitSafeHome = false;

    // Check Home slots
    if (frogRow === 0) {
      // 5 slots: col 0, 2, 4, 6, 8
      const col = Math.floor(state.frog.x / GRID);
      if (col % 2 === 0 && col < 10) {
        const slotIndex = col / 2;
        if (!state.homeSlots[slotIndex]) {
          state.homeSlots[slotIndex] = true;
          hitSafeHome = true;
          state.score += 50;
          setUiScore(state.score);
          
          if (state.homeSlots.every(s => s)) {
            // Level complete
            state.score += 200 + (timeLeft * 10);
            setUiScore(state.score);
            setLevel(l => l + 1);
            initLevel(level + 1, true);
            return;
          } else {
            resetFrog();
            return;
          }
        }
      }
      // If we didn't hit a safe home, die
      if (!hitSafeHome) {
        triggerDeath();
        return;
      }
    }

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
      triggerDeath();
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
        state.frog.x += currentAttachedLog.speed! * dt;
        // Screen bounds
        if (state.frog.x < 0 || state.frog.x + state.frog.w > CANVAS_WIDTH) {
          triggerDeath();
          return;
        }
      } else {
        // Drowned in river
        triggerDeath();
        return;
      }
    }

  }, [triggerDeath, initLevel, level, timeLeft]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Background zones
    ctx.fillStyle = '#334155'; // Safe / Road
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#0ea5e9'; // River
    ctx.fillRect(0, 1 * GRID, CANVAS_WIDTH, 5 * GRID);
    
    ctx.fillStyle = '#1e293b'; // Road
    ctx.fillRect(0, 7 * GRID, CANVAS_WIDTH, 5 * GRID);
    
    // Home Slots
    ctx.fillStyle = '#0284c7'; // Water in home
    ctx.fillRect(0, 0, CANVAS_WIDTH, GRID);
    for (let i = 0; i < NUM_HOME_SLOTS; i++) {
      ctx.fillStyle = state.homeSlots[i] ? '#22c55e' : '#475569';
      ctx.fillRect(i * 2 * GRID, 0, GRID, GRID);
    }

    // Obstacles
    state.obstacles.forEach(obs => {
      if (obs.type === 'car') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(obs.x, obs.y + 5, obs.w, obs.h);
      } else if (obs.type === 'log') {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(obs.x, obs.y + 5, obs.w, obs.h);
      }
    });

    // Frog
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(state.frog.x, state.frog.y, state.frog.w, state.frog.h);

  }, []);

  const loop = useCallback((timestamp: number) => {
    const dt = Math.min((timestamp - lastTimeRef.current) / 16.666, 2.0);
    lastTimeRef.current = timestamp;

    if (!gameState.current.gameOverTriggered) {
      update(dt);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loop]);

  useEffect(() => {
    initLevel(1);
  }, [initLevel]);

  const moveFrog = useCallback((dx: number, dy: number) => {
    const state = gameState.current;
    if (state.gameOverTriggered) return;
    
    // Ensure frog x aligns to grid (useful when hopping off logs)
    const currentLaneType = state.lanes[Math.floor(state.frog.y / GRID)]?.type;
    if (dy !== 0 && currentLaneType === 'log') {
      // snap x to nearest grid
      state.frog.x = Math.round((state.frog.x - 5) / GRID) * GRID + 5;
    }

    const newX = state.frog.x + dx * GRID;
    const newY = state.frog.y + dy * GRID;

    if (newX >= 0 && newX + state.frog.w <= CANVAS_WIDTH) {
      state.frog.x = newX;
    }
    if (newY >= 0 && newY + state.frog.h <= CANVAS_HEIGHT) {
      state.frog.y = newY;
    }

    const frogRow = Math.floor(state.frog.y / GRID);
    if (frogRow < state.highestRow) {
      state.highestRow = frogRow;
      state.score += 10;
      setUiScore(state.score);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); moveFrog(0, -1); }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); moveFrog(0, 1); }
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); moveFrog(-1, 0); }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); moveFrog(1, 0); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveFrog]);

  const restart = () => {
    setUiScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    initLevel(1);
  };

  const handleDpad = (e: React.TouchEvent | React.MouseEvent, dx: number, dy: number) => {
    e.preventDefault();
    moveFrog(dx, dy);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>River-Hopper</h2>
          <div className={styles.stats}>
            <span>Lv: {level}</span>
            <span>Sc: {uiScore}</span>
            <span>⏱️ {timeLeft}</span>
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
          {gameOver && (
            <div className={styles.gameOverOverlay}>
              <h2>SQUASHED!</h2>
              <p>Level: {level} | Score: {uiScore}</p>
              <p>XP Earned: +{Math.floor(uiScore / 10)}</p>
              <button onClick={restart} className={styles.restartBtn}>Play Again</button>
            </div>
          )}
        </div>

        <div className={styles.dpad}>
          <button className={`${styles.dpadBtn} ${styles.up}`} onTouchStart={(e) => handleDpad(e, 0, -1)} onMouseDown={(e) => handleDpad(e, 0, -1)}><ArrowUp /></button>
          <button className={`${styles.dpadBtn} ${styles.left}`} onTouchStart={(e) => handleDpad(e, -1, 0)} onMouseDown={(e) => handleDpad(e, -1, 0)}><ArrowLeft /></button>
          <button className={`${styles.dpadBtn} ${styles.down}`} onTouchStart={(e) => handleDpad(e, 0, 1)} onMouseDown={(e) => handleDpad(e, 0, 1)}><ArrowDown /></button>
          <button className={`${styles.dpadBtn} ${styles.right}`} onTouchStart={(e) => handleDpad(e, 1, 0)} onMouseDown={(e) => handleDpad(e, 1, 0)}><ArrowRight /></button>
        </div>
      </div>
    </div>
  );
};

export default RiverHopper;
