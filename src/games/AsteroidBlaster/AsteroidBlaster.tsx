import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './AsteroidBlaster.module.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHIP_SIZE = 15;
const LASER_SPEED = 10;
const ROTATION_SPEED = 0.1;
const THRUST = 0.15;
const FRICTION = 0.98;
const MAX_LIVES = 3;
const INVULN_TIME = 2000; // 2 seconds

type Point = { x: number, y: number };
type Ship = Point & { vx: number, vy: number, a: number, invulnTimer: number };
type Laser = Point & { vx: number, vy: number, life: number };
type Asteroid = Point & { vx: number, vy: number, r: number, points: number[] };

const AsteroidBlaster: React.FC = () => {
  const [uiState, setUiState] = useState({ score: 0, lives: MAX_LIVES, gameOver: false, win: false, level: 1 });
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    ship: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0, a: -Math.PI / 2, invulnTimer: 0 } as Ship,
    lasers: [] as Laser[],
    asteroids: [] as Asteroid[],
    keys: { left: false, right: false, up: false, space: false },
    lastShot: 0,
    score: 0,
    lives: MAX_LIVES,
    level: 1,
    gameOver: false,
    win: false,
    xpAwarded: false
  });

  const syncUI = () => {
    setUiState({
      score: gameState.current.score,
      lives: gameState.current.lives,
      gameOver: gameState.current.gameOver,
      win: gameState.current.win,
      level: gameState.current.level
    });
  };

  const createAsteroid = (x: number, y: number, r: number, points?: number[], speedMultiplier: number = 2) => {
    const pts = points || [];
    if (!points) {
      const numPoints = Math.floor(Math.random() * 5 + 5);
      for (let i = 0; i < numPoints; i++) {
        pts.push(Math.random() * 0.4 + 0.8);
      }
    }
    return {
      x, y,
      vx: (Math.random() - 0.5) * speedMultiplier,
      vy: (Math.random() - 0.5) * speedMultiplier,
      r,
      points: pts
    };
  };

  const spawnAsteroids = (level: number) => {
    const asts = [];
    for (let i = 0; i < level + 3; i++) {
      let x, y;
      do {
        x = Math.random() * CANVAS_WIDTH;
        y = Math.random() * CANVAS_HEIGHT;
      } while ((x - CANVAS_WIDTH/2)**2 + (y - CANVAS_HEIGHT/2)**2 < 20000); // 141 dist sq
      asts.push(createAsteroid(x, y, 40, undefined, 2));
    }
    gameState.current.asteroids = asts;
  };

  const wrap = (p: Point) => {
    if (p.x < 0) p.x += CANVAS_WIDTH;
    if (p.x >= CANVAS_WIDTH) p.x -= CANVAS_WIDTH;
    if (p.y < 0) p.y += CANVAS_HEIGHT;
    if (p.y >= CANVAS_HEIGHT) p.y -= CANVAS_HEIGHT;
  };

  const resetShip = (state: any) => {
    state.ship = { 
      x: CANVAS_WIDTH / 2, 
      y: CANVAS_HEIGHT / 2, 
      vx: 0, 
      vy: 0, 
      a: -Math.PI / 2, 
      invulnTimer: INVULN_TIME 
    };
  };

  const update = useCallback((dt: number, realTimeMs: number) => {
    const state = gameState.current;
    if (state.gameOver || state.win) return;
    
    let uiNeedsSync = false;

    if (state.ship.invulnTimer > 0) {
      // dt here is roughly 1 for 16.6ms, so let's convert to ms
      state.ship.invulnTimer -= dt * 16.666;
    }

    // Ship rotation
    if (state.keys.left) state.ship.a -= ROTATION_SPEED * dt;
    if (state.keys.right) state.ship.a += ROTATION_SPEED * dt;
    
    // Thrust
    if (state.keys.up) {
      state.ship.vx += Math.cos(state.ship.a) * THRUST * dt;
      state.ship.vy += Math.sin(state.ship.a) * THRUST * dt;
    }
    
    // Apply friction & move
    state.ship.vx *= Math.pow(FRICTION, dt);
    state.ship.vy *= Math.pow(FRICTION, dt);
    state.ship.x += state.ship.vx * dt;
    state.ship.y += state.ship.vy * dt;
    wrap(state.ship);

    // Shoot
    if (state.keys.space && (realTimeMs - state.lastShot > 200)) {
      state.lasers.push({
        x: state.ship.x + Math.cos(state.ship.a) * SHIP_SIZE,
        y: state.ship.y + Math.sin(state.ship.a) * SHIP_SIZE,
        vx: Math.cos(state.ship.a) * LASER_SPEED,
        vy: Math.sin(state.ship.a) * LASER_SPEED,
        life: 60
      });
      state.lastShot = realTimeMs;
    }

    // Move lasers
    for (let i = state.lasers.length - 1; i >= 0; i--) {
      const l = state.lasers[i];
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.life -= dt;
      wrap(l);
      if (l.life <= 0) state.lasers.splice(i, 1);
    }

    // Move Asteroids & Collisions
    for (let i = state.asteroids.length - 1; i >= 0; i--) {
      const a = state.asteroids[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      wrap(a);

      // Ship collision
      if (state.ship.invulnTimer <= 0) {
        const dx = state.ship.x - a.x;
        const dy = state.ship.y - a.y;
        const distSq = dx*dx + dy*dy;
        const radSum = a.r + SHIP_SIZE;
        if (distSq < radSum * radSum) {
          state.lives--;
          uiNeedsSync = true;
          if (state.lives <= 0) {
            state.gameOver = true;
            if (!state.xpAwarded) {
               addXp(Math.floor(state.score / 10));
               state.xpAwarded = true;
            }
            syncUI();
            return;
          } else {
            resetShip(state);
          }
        }
      }

      // Laser collision
      for (let j = state.lasers.length - 1; j >= 0; j--) {
        const l = state.lasers[j];
        const dx = l.x - a.x;
        const dy = l.y - a.y;
        if (dx*dx + dy*dy < a.r * a.r) {
          // Hit!
          state.lasers.splice(j, 1);
          state.asteroids.splice(i, 1);
          
          let p = 0;
          if (a.r >= 35) p = 20;
          else if (a.r >= 15) p = 50;
          else p = 100;
          
          state.score += p;
          uiNeedsSync = true;
          
          // Split logic
          if (a.r >= 35) {
            // Large to Medium
            state.asteroids.push(createAsteroid(a.x, a.y, 20, a.points, 4));
            state.asteroids.push(createAsteroid(a.x, a.y, 20, a.points, 4));
          } else if (a.r >= 15) {
            // Medium to Small
            state.asteroids.push(createAsteroid(a.x, a.y, 10, a.points, 6));
            state.asteroids.push(createAsteroid(a.x, a.y, 10, a.points, 6));
          }
          break;
        }
      }
    }

    if (state.asteroids.length === 0 && !state.gameOver) {
      if (state.level === 3) {
        state.win = true;
        uiNeedsSync = true;
        if (!state.xpAwarded) {
          addXp(100);
          state.xpAwarded = true;
        }
      } else {
        state.level++;
        uiNeedsSync = true;
        spawnAsteroids(state.level);
        resetShip(state);
      }
    }

    if (uiNeedsSync) syncUI();

  }, [addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Clear
    ctx.fillStyle = '#0f172a'; // Deep slate
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ship
    if (state.ship.invulnTimer <= 0 || Math.floor(state.ship.invulnTimer / 100) % 2 === 0) {
      ctx.strokeStyle = '#22d3ee'; // Cyan
      ctx.lineWidth = 2;
      // Minimal shadow for ship only
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(
        state.ship.x + Math.cos(state.ship.a) * SHIP_SIZE,
        state.ship.y + Math.sin(state.ship.a) * SHIP_SIZE
      );
      ctx.lineTo(
        state.ship.x + Math.cos(state.ship.a - 2.5) * SHIP_SIZE,
        state.ship.y + Math.sin(state.ship.a - 2.5) * SHIP_SIZE
      );
      ctx.lineTo(
        state.ship.x + Math.cos(state.ship.a + 2.5) * SHIP_SIZE,
        state.ship.y + Math.sin(state.ship.a + 2.5) * SHIP_SIZE
      );
      ctx.closePath();
      ctx.stroke();
      
      // Thrust flame
      if (state.keys.up) {
        ctx.strokeStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.beginPath();
        ctx.moveTo(
          state.ship.x - Math.cos(state.ship.a) * SHIP_SIZE * 0.5,
          state.ship.y - Math.sin(state.ship.a) * SHIP_SIZE * 0.5
        );
        ctx.lineTo(
          state.ship.x + Math.cos(state.ship.a + Math.PI - 0.3) * SHIP_SIZE * 1.5,
          state.ship.y + Math.sin(state.ship.a + Math.PI - 0.3) * SHIP_SIZE * 1.5
        );
        ctx.lineTo(
          state.ship.x + Math.cos(state.ship.a + Math.PI + 0.3) * SHIP_SIZE * 1.5,
          state.ship.y + Math.sin(state.ship.a + Math.PI + 0.3) * SHIP_SIZE * 1.5
        );
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0; // Disable shadow for lasers/asteroids to save perf

    // Draw Lasers
    ctx.strokeStyle = '#fef08a';
    state.lasers.forEach(l => {
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x - l.vx, l.y - l.vy);
      ctx.stroke();
    });

    // Draw Asteroids
    ctx.strokeStyle = '#a78bfa';
    state.asteroids.forEach(a => {
      ctx.beginPath();
      for (let j = 0; j < a.points.length; j++) {
        const angle = (j / a.points.length) * Math.PI * 2;
        const radius = a.r * a.points[j];
        const px = a.x + Math.cos(angle) * radius;
        const py = a.y + Math.sin(angle) * radius;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    });

  }, []);

  const lastTimeRef = useRef<number>(performance.now());
  const isFirstFrameRef = useRef(true);

  const loop = useCallback((timestamp: number) => {
    if (!gameState.current.gameOver && !gameState.current.win) {
      if (isFirstFrameRef.current) {
         isFirstFrameRef.current = false;
         lastTimeRef.current = timestamp;
      }

      let dt = (timestamp - lastTimeRef.current) / 16.666;
      if (dt > 10) dt = 1; // Cap DT to prevent huge jumps

      lastTimeRef.current = timestamp;

      update(dt, timestamp);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    } else {
      lastTimeRef.current = timestamp;
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    resetShip(gameState.current);
    spawnAsteroids(gameState.current.level);
    syncUI();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'w', 'd'].includes(e.key)) {
         e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w') state.keys.up = true;
      if (e.key === ' ') state.keys.space = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w') state.keys.up = false;
      if (e.key === ' ') state.keys.space = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const restart = () => {
    gameState.current = {
      ship: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0, a: -Math.PI / 2, invulnTimer: INVULN_TIME },
      lasers: [],
      asteroids: [],
      keys: { left: false, right: false, up: false, space: false },
      lastShot: 0,
      score: 0,
      lives: MAX_LIVES,
      level: 1,
      gameOver: false,
      win: false,
      xpAwarded: false
    };
    spawnAsteroids(1);
    syncUI();
  };

  const handleInputStart = (e: React.SyntheticEvent, action: 'LEFT' | 'RIGHT' | 'UP' | 'FIRE') => {
    e.preventDefault();
    if (action === 'LEFT') gameState.current.keys.left = true;
    if (action === 'RIGHT') gameState.current.keys.right = true;
    if (action === 'UP') gameState.current.keys.up = true;
    if (action === 'FIRE') gameState.current.keys.space = true;
  };

  const handleInputEnd = (e: React.SyntheticEvent, action: 'LEFT' | 'RIGHT' | 'UP' | 'FIRE') => {
    e.preventDefault();
    if (action === 'LEFT') gameState.current.keys.left = false;
    if (action === 'RIGHT') gameState.current.keys.right = false;
    if (action === 'UP') gameState.current.keys.up = false;
    if (action === 'FIRE') gameState.current.keys.space = false;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Asteroid-Blaster</h2>
          <div className={styles.stats}>
            <span>Level: {uiState.level}</span>
            <span>Lives: {'❤️'.repeat(uiState.lives)}</span>
            <span>Score: {uiState.score}</span>
          </div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />
          
          {(uiState.gameOver || uiState.win) && (
            <div className={styles.gameOverOverlay}>
              <h2 style={{ color: uiState.win ? '#10b981' : '#ef4444' }}>
                {uiState.win ? 'SECTOR CLEARED!' : 'GAME OVER'}
              </h2>
              <p>Score: {uiState.score}</p>
              <p>XP Earned: {uiState.win ? '+100' : `+${Math.floor(uiState.score / 10)}`}</p>
              <button onClick={restart} className={styles.restartBtn}>Play Again</button>
            </div>
          )}
        </div>

        <div className={styles.mobileControls}>
          <div className={styles.dirButtons}>
            <button 
              className={styles.controlBtn} 
              onPointerDown={(e) => handleInputStart(e, 'LEFT')}
              onPointerUp={(e) => handleInputEnd(e, 'LEFT')}
              onPointerLeave={(e) => handleInputEnd(e, 'LEFT')}
              onPointerCancel={(e) => handleInputEnd(e, 'LEFT')}
              onContextMenu={(e) => e.preventDefault()}
            >↺</button>
            <button 
              className={styles.controlBtn} 
              onPointerDown={(e) => handleInputStart(e, 'RIGHT')}
              onPointerUp={(e) => handleInputEnd(e, 'RIGHT')}
              onPointerLeave={(e) => handleInputEnd(e, 'RIGHT')}
              onPointerCancel={(e) => handleInputEnd(e, 'RIGHT')}
              onContextMenu={(e) => e.preventDefault()}
            >↻</button>
          </div>
          <div className={styles.actionButtons}>
            <button 
              className={styles.controlBtn} 
              onPointerDown={(e) => handleInputStart(e, 'UP')}
              onPointerUp={(e) => handleInputEnd(e, 'UP')}
              onPointerLeave={(e) => handleInputEnd(e, 'UP')}
              onPointerCancel={(e) => handleInputEnd(e, 'UP')}
              onContextMenu={(e) => e.preventDefault()}
            >🚀</button>
            <button 
              className={`${styles.controlBtn} ${styles.fireBtn}`}
              onPointerDown={(e) => handleInputStart(e, 'FIRE')}
              onPointerUp={(e) => handleInputEnd(e, 'FIRE')}
              onPointerLeave={(e) => handleInputEnd(e, 'FIRE')}
              onPointerCancel={(e) => handleInputEnd(e, 'FIRE')}
              onContextMenu={(e) => e.preventDefault()}
            >🔥</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsteroidBlaster;
