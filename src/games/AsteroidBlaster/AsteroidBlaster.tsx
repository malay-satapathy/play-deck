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

type Point = { x: number, y: number };
type Ship = Point & { vx: number, vy: number, a: number };
type Laser = Point & { vx: number, vy: number, life: number };
type Asteroid = Point & { vx: number, vy: number, r: number, points: number[] };

const AsteroidBlaster: React.FC = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    ship: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0, a: -Math.PI / 2 } as Ship,
    lasers: [] as Laser[],
    asteroids: [] as Asteroid[],
    keys: { left: false, right: false, up: false, space: false },
    lastShot: 0,
    level: 1
  });

  const createAsteroid = (x: number, y: number, r: number) => {
    const points = [];
    const numPoints = Math.floor(Math.random() * 5 + 5);
    for (let i = 0; i < numPoints; i++) {
      points.push(Math.random() * 0.4 + 0.8); // random jaggedness
    }
    return {
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      r,
      points
    };
  };

  const spawnAsteroids = (level: number) => {
    const asts = [];
    for (let i = 0; i < level + 3; i++) {
      let x, y;
      do {
        x = Math.random() * CANVAS_WIDTH;
        y = Math.random() * CANVAS_HEIGHT;
      } while (Math.hypot(x - CANVAS_WIDTH / 2, y - CANVAS_HEIGHT / 2) < 100);
      asts.push(createAsteroid(x, y, 40));
    }
    gameState.current.asteroids = asts;
  };

  const wrap = (p: Point) => {
    if (p.x < 0) p.x += CANVAS_WIDTH;
    if (p.x >= CANVAS_WIDTH) p.x -= CANVAS_WIDTH;
    if (p.y < 0) p.y += CANVAS_HEIGHT;
    if (p.y >= CANVAS_HEIGHT) p.y -= CANVAS_HEIGHT;
  };

  const update = useCallback((dt: number) => {
    if (gameOver || win) return;
    const state = gameState.current;
    
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
    if (state.keys.space && Date.now() - state.lastShot > 200) {
      state.lasers.push({
        x: state.ship.x + Math.cos(state.ship.a) * SHIP_SIZE,
        y: state.ship.y + Math.sin(state.ship.a) * SHIP_SIZE,
        vx: Math.cos(state.ship.a) * LASER_SPEED,
        vy: Math.sin(state.ship.a) * LASER_SPEED,
        life: 60 // frames
      });
      state.lastShot = Date.now();
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
      if (Math.hypot(state.ship.x - a.x, state.ship.y - a.y) < a.r + SHIP_SIZE) {
        setGameOver(true);
        addXp(Math.floor(score / 10));
        return;
      }

      // Laser collision
      for (let j = state.lasers.length - 1; j >= 0; j--) {
        const l = state.lasers[j];
        if (Math.hypot(l.x - a.x, l.y - a.y) < a.r) {
          // Hit!
          state.lasers.splice(j, 1);
          state.asteroids.splice(i, 1);
          setScore(s => s + (a.r > 20 ? 10 : 20));
          
          if (a.r > 20) {
            state.asteroids.push(createAsteroid(a.x, a.y, a.r / 2));
            state.asteroids.push(createAsteroid(a.x, a.y, a.r / 2));
          }
          break; // break laser loop since asteroid is destroyed
        }
      }
    }

    if (state.asteroids.length === 0) {
      if (state.level === 3) {
        setWin(true);
        addXp(100);
      } else {
        state.level++;
        spawnAsteroids(state.level);
      }
    }

  }, [gameOver, win, score, addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Clear
    ctx.fillStyle = '#0f172a'; // Deep slate
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ship
    ctx.strokeStyle = '#22d3ee'; // Cyan
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
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

    // Draw Lasers
    ctx.strokeStyle = '#fef08a';
    ctx.shadowColor = '#fef08a';
    state.lasers.forEach(l => {
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x - l.vx, l.y - l.vy);
      ctx.stroke();
    });

    // Draw Asteroids
    ctx.strokeStyle = '#a78bfa';
    ctx.shadowColor = '#a78bfa';
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

    ctx.shadowBlur = 0;
  }, []);

  const lastTimeRef = useRef<number>(performance.now());

  const loop = useCallback((timestamp: number) => {
    if (!gameOver && !win) {
      const dt = (timestamp - lastTimeRef.current) / 16.666;
      lastTimeRef.current = timestamp;

      update(dt);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    } else {
      lastTimeRef.current = timestamp;
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw, gameOver, win]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    spawnAsteroids(gameState.current.level);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const restart = () => {
    gameState.current = {
      ship: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0, a: -Math.PI / 2 },
      lasers: [],
      asteroids: [],
      keys: { left: false, right: false, up: false, space: false },
      lastShot: 0,
      level: 1
    };
    spawnAsteroids(1);
    setScore(0);
    setGameOver(false);
    setWin(false);
  };

  const handleTouchStart = (action: 'LEFT' | 'RIGHT' | 'UP' | 'FIRE') => {
    if (action === 'LEFT') gameState.current.keys.left = true;
    if (action === 'RIGHT') gameState.current.keys.right = true;
    if (action === 'UP') gameState.current.keys.up = true;
    if (action === 'FIRE') gameState.current.keys.space = true;
  };

  const handleTouchEnd = (action: 'LEFT' | 'RIGHT' | 'UP' | 'FIRE') => {
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
            <span>Level: {gameState.current.level}</span>
            <span>Score: {score}</span>
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

        {(gameOver || win) && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
              {win ? 'SECTOR CLEARED!' : 'SHIP DESTROYED'}
            </h2>
            <p>Score: {score}</p>
            <p>XP Earned: {win ? '+100' : `+${Math.floor(score / 10)}`}</p>
            <button onClick={restart} className={styles.restartBtn}>Play Again</button>
          </div>
        )}

        <div className={styles.mobileControls}>
          <div className={styles.dirButtons}>
            <button 
              className={styles.controlBtn} 
              onTouchStart={() => handleTouchStart('LEFT')} 
              onTouchEnd={() => handleTouchEnd('LEFT')}
            >↺</button>
            <button 
              className={styles.controlBtn} 
              onTouchStart={() => handleTouchStart('RIGHT')} 
              onTouchEnd={() => handleTouchEnd('RIGHT')}
            >↻</button>
          </div>
          <div className={styles.actionButtons}>
            <button 
              className={styles.controlBtn} 
              onTouchStart={() => handleTouchStart('UP')} 
              onTouchEnd={() => handleTouchEnd('UP')}
            >🚀</button>
            <button 
              className={`${styles.controlBtn} ${styles.fireBtn}`}
              onTouchStart={() => handleTouchStart('FIRE')} 
              onTouchEnd={() => handleTouchEnd('FIRE')}
            >🔥</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsteroidBlaster;
