import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './HoverJumper.module.css';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.6;
const JUMP = -8;
const TERMINAL_VELOCITY = 12;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPAWN_RATE = 100;

type Pipe = { x: number, topHeight: number, passed: boolean };

const HoverJumper: React.FC = () => {
  const [uiScore, setUiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    bird: { x: 50, y: CANVAS_HEIGHT / 2, vy: 0, radius: 15 },
    pipes: [] as Pipe[],
    pipeTimer: PIPE_SPAWN_RATE,
    score: 0,
    started: false,
    gameOverTriggered: false
  });

  const jump = useCallback(() => {
    const state = gameState.current;
    if (state.gameOverTriggered) return;
    if (!state.started) {
      state.started = true;
    }
    state.bird.vy = JUMP;
  }, []);

  const checkCircleRectCollision = (cx: number, cy: number, radius: number, rx: number, ry: number, rw: number, rh: number) => {
    const testX = Math.max(rx, Math.min(cx, rx + rw));
    const testY = Math.max(ry, Math.min(cy, ry + rh));
    const distX = cx - testX;
    const distY = cy - testY;
    const distanceSquared = (distX * distX) + (distY * distY);
    return distanceSquared <= (radius * radius);
  };

  const update = useCallback((dt: number) => {
    const state = gameState.current;
    if (!state.started || state.gameOverTriggered) return;
    
    // Bird physics
    state.bird.vy += GRAVITY * dt;
    state.bird.vy = Math.min(state.bird.vy, TERMINAL_VELOCITY);
    state.bird.y += state.bird.vy * dt;

    // Floor/Ceiling collision
    if (state.bird.y + state.bird.radius >= CANVAS_HEIGHT || state.bird.y - state.bird.radius <= 0) {
      state.gameOverTriggered = true;
      setGameOver(true);
      addXp(Math.floor(state.score / 2));
      return;
    }

    // Spawn pipes
    state.pipeTimer -= dt;
    if (state.pipeTimer <= 0) {
      const minHeight = 50;
      const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
      const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
      state.pipes.push({ x: CANVAS_WIDTH, topHeight, passed: false });
      state.pipeTimer = PIPE_SPAWN_RATE; // reset timer
    }

    // Move pipes & check collision
    for (let i = 0; i < state.pipes.length; i++) {
      const p = state.pipes[i];
      p.x -= PIPE_SPEED * dt;

      // Top pipe collision
      const hitTop = checkCircleRectCollision(
        state.bird.x, state.bird.y, state.bird.radius,
        p.x, 0, PIPE_WIDTH, p.topHeight
      );
      
      // Bottom pipe collision
      const hitBottom = checkCircleRectCollision(
        state.bird.x, state.bird.y, state.bird.radius,
        p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - p.topHeight - PIPE_GAP
      );

      if (hitTop || hitBottom) {
        state.gameOverTriggered = true;
        setGameOver(true);
        addXp(Math.floor(state.score / 2));
        return;
      }

      // Score
      if (p.x + PIPE_WIDTH < state.bird.x && !p.passed) {
        p.passed = true;
        state.score += 1;
        setUiScore(state.score);
      }
    }

    // Cleanup offscreen pipes
    if (state.pipes.length > 0 && state.pipes[0].x + PIPE_WIDTH < 0) {
      state.pipes.shift();
    }

  }, [addXp]);

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const state = gameState.current;
    
    // Clear
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Pipes (Neon Green)
    ctx.fillStyle = '#4ade80';
    state.pipes.forEach(p => {
      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      // Bottom pipe
      ctx.fillRect(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - p.topHeight - PIPE_GAP);
    });

    // Bird (Neon Pink)
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(state.bird.x, state.bird.y, state.bird.radius, 0, Math.PI * 2);
    ctx.fill();

    if (!state.started && !state.gameOverTriggered) {
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap repeatedly to fly', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }
  }, []);

  const lastTimeRef = useRef<number>(performance.now());

  const loop = useCallback((timestamp: number) => {
    const dt = Math.min((timestamp - lastTimeRef.current) / 16.666, 2.0);
    lastTimeRef.current = timestamp;

    update(dt);
    draw();
    
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !ctxRef.current) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctxRef.current = ctx;
      }
    }
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const restart = () => {
    gameState.current = {
      bird: { x: 50, y: CANVAS_HEIGHT / 2, vy: 0, radius: 15 },
      pipes: [],
      pipeTimer: PIPE_SPAWN_RATE,
      score: 0,
      started: false,
      gameOverTriggered: false
    };
    setUiScore(0);
    setGameOver(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    jump();
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Hover-Jumper</h2>
          <div className={styles.scoreBoard}>Score: {uiScore}</div>
        </div>

        <div className={styles.canvasContainer} onPointerDown={handlePointerDown}>
          <canvas 
            ref={canvasRef} 
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%', aspectRatio: '4/3' }}
            className={styles.canvas}
          />
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>CRASHED!</h2>
            <p>Score: {uiScore}</p>
            <p>XP Earned: +{Math.floor(uiScore / 2)}</p>
            <button onClick={restart} className={styles.restartBtn}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HoverJumper;
