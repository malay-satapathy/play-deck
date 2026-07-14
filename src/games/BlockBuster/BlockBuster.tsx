import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './BlockBuster.module.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_SIZE = 12;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;
const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_PADDING = 10;
const BRICK_WIDTH = (CANVAS_WIDTH - (BRICK_COLS + 1) * BRICK_PADDING) / BRICK_COLS;
const BRICK_HEIGHT = 20;

type Rect = { x: number, y: number, w: number, h: number };
type Brick = Rect & { active: boolean, color: string, hp: number, points: number };

const BlockBuster: React.FC = () => {
  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    paddle: { x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2, y: CANVAS_HEIGHT - 30, w: PADDLE_WIDTH, h: PADDLE_HEIGHT },
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: INITIAL_BALL_SPEED, vy: -INITIAL_BALL_SPEED },
    bricks: [] as Brick[],
    keys: { left: false, right: false },
    score: 0,
    lives: 3,
    winTriggered: false,
    gameOverTriggered: false,
    started: false,
    bricksDestroyed: 0,
    speedMultiplier: 1
  });

  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const rowConfigs = [
      { color: '#ef4444', hp: 3, points: 50 }, // Red
      { color: '#f97316', hp: 2, points: 40 }, // Orange
      { color: '#eab308', hp: 2, points: 30 }, // Yellow
      { color: '#22c55e', hp: 1, points: 20 }, // Green
      { color: '#3b82f6', hp: 1, points: 10 }, // Blue
      { color: '#a855f7', hp: 1, points: 10 }  // Purple
    ];
    for (let r = 0; r < BRICK_ROWS; r++) {
      const config = rowConfigs[r];
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_PADDING,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING + 40,
          w: BRICK_WIDTH,
          h: BRICK_HEIGHT,
          active: true,
          color: config.color,
          hp: config.hp,
          points: config.points
        });
      }
    }
    gameState.current.bricks = bricks;
  }, []);

  const resetBall = useCallback(() => {
    gameState.current.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: INITIAL_BALL_SPEED, vy: -INITIAL_BALL_SPEED };
    gameState.current.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    gameState.current.started = false;
    gameState.current.speedMultiplier = 1;
  }, []);

  const getBrickColor = (baseColor: string, hp: number) => {
    if (hp === 3) return '#ffffff'; // White overlay for max hp
    if (hp === 2) return '#fca5a5'; // Lighter tone
    return baseColor; // Original color on 1 hp
  };

  const update = useCallback((dt: number) => {
    const state = gameState.current;
    if (state.gameOverTriggered || state.winTriggered) return;
    
    // Paddle movement
    if (state.keys.left) state.paddle.x -= PADDLE_SPEED * dt;
    if (state.keys.right) state.paddle.x += PADDLE_SPEED * dt;
    
    // Clamp paddle
    state.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - state.paddle.w, state.paddle.x));

    if (!state.started) {
      // Keep ball attached to paddle
      state.ball.x = state.paddle.x + state.paddle.w / 2;
      state.ball.y = state.paddle.y - BALL_SIZE;
      return;
    }

    // Ball movement
    state.ball.x += state.ball.vx * state.speedMultiplier * dt;
    state.ball.y += state.ball.vy * state.speedMultiplier * dt;

    // Wall collision
    if (state.ball.x <= 0 && state.ball.vx < 0) {
      state.ball.vx *= -1;
      state.ball.x = 0;
    }
    if (state.ball.x >= CANVAS_WIDTH - BALL_SIZE && state.ball.vx > 0) {
      state.ball.vx *= -1;
      state.ball.x = CANVAS_WIDTH - BALL_SIZE;
    }
    if (state.ball.y <= 0 && state.ball.vy < 0) {
      state.ball.vy *= -1;
      state.ball.y = 0;
    }

    // Bottom out
    if (state.ball.y >= CANVAS_HEIGHT) {
      state.lives -= 1;
      setUiLives(state.lives);
      if (state.lives <= 0) {
        state.gameOverTriggered = true;
        setGameOver(true);
        addXp(Math.floor(state.score / 5));
      } else {
        resetBall();
      }
      return;
    }

    // Paddle collision
    if (
      state.ball.x + BALL_SIZE >= state.paddle.x &&
      state.ball.x <= state.paddle.x + state.paddle.w &&
      state.ball.y + BALL_SIZE >= state.paddle.y &&
      state.ball.y <= state.paddle.y + state.paddle.h &&
      state.ball.vy > 0
    ) {
      state.ball.vy *= -1;
      const hitPos = (state.ball.x + BALL_SIZE / 2 - state.paddle.x) / state.paddle.w;
      state.ball.vx = INITIAL_BALL_SPEED * (hitPos - 0.5) * 2.5; 
      state.ball.y = state.paddle.y - BALL_SIZE; // push out
    }

    // Brick collision
    let activeBricksCount = 0;
    let hitOccurred = false;

    // We collect collisions to properly calculate physics reflection
    // Using Minkowski sum logic approximation
    for (let i = 0; i < state.bricks.length; i++) {
      const b = state.bricks[i];
      if (!b.active) continue;
      activeBricksCount++;

      // Check overlap
      if (
        !hitOccurred &&
        state.ball.x + BALL_SIZE >= b.x &&
        state.ball.x <= b.x + b.w &&
        state.ball.y + BALL_SIZE >= b.y &&
        state.ball.y <= b.y + b.h
      ) {
        hitOccurred = true;
        b.hp--;
        if (b.hp <= 0) {
          b.active = false;
          activeBricksCount--;
          state.score += b.points;
          state.bricksDestroyed++;
          
          // Speed progressive difficulty
          if (state.bricksDestroyed % 10 === 0) {
             state.speedMultiplier = Math.min(1.5, state.speedMultiplier + 0.05);
          }
        } else {
          state.score += 5; // points for a hit
        }
        setUiScore(state.score);

        // Determine side hit vs top/bottom hit
        const overlapLeft = (state.ball.x + BALL_SIZE) - b.x;
        const overlapRight = (b.x + b.w) - state.ball.x;
        const overlapTop = (state.ball.y + BALL_SIZE) - b.y;
        const overlapBottom = (b.y + b.h) - state.ball.y;
        
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        
        if (minOverlap === overlapLeft || minOverlap === overlapRight) {
           state.ball.vx *= -1; // side hit
        } else {
           state.ball.vy *= -1; // top/bottom hit
        }
      }
    }

    if (activeBricksCount === 0 && !state.winTriggered) {
      state.winTriggered = true;
      setWin(true);
      addXp(100);
    }

  }, [addXp, resetBall]);

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const state = gameState.current;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Paddle (White)
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);

    // Ball (Cyan)
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);

    // Bricks
    for (let i = 0; i < state.bricks.length; i++) {
      const b = state.bricks[i];
      if (b.active) {
        const renderColor = getBrickColor(b.color, b.hp);
        ctx.shadowBlur = 5;
        ctx.shadowColor = renderColor;
        ctx.fillStyle = renderColor;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
    }

    if (!state.started && !state.gameOverTriggered && !state.winTriggered) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK OR PRESS SPACE TO START', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    ctx.shadowBlur = 0;
  }, []);

  const lastTimeRef = useRef<number>(performance.now());

  const loop = useCallback((timestamp: number) => {
    const state = gameState.current;
    if (state.gameOverTriggered || state.winTriggered) return;

    const dt = Math.min((timestamp - lastTimeRef.current) / 16.666, 2.0); // Clamp dt to prevent tunneling
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
    initBricks();
  }, [initBricks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
      const key = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd', ' '].includes(key)) {
        e.preventDefault();
      }
      if (key === 'arrowleft' || key === 'a') state.keys.left = true;
      if (key === 'arrowright' || key === 'd') state.keys.right = true;
      if (key === ' ' && !state.started) {
        state.started = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameState.current;
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') state.keys.left = false;
      if (key === 'arrowright' || key === 'd') state.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const restart = () => {
    initBricks();
    resetBall();
    gameState.current.score = 0;
    gameState.current.lives = 3;
    gameState.current.gameOverTriggered = false;
    gameState.current.winTriggered = false;
    gameState.current.bricksDestroyed = 0;
    setUiScore(0);
    setUiLives(3);
    setGameOver(false);
    setWin(false);
  };

  const handleTouch = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = gameState.current;
    if (!state.started) {
      state.started = true;
    }
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const scaleX = CANVAS_WIDTH / rect.width;
    const internalX = touchX * scaleX;
    
    state.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, internalX - PADDLE_WIDTH / 2));
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Block-Buster</h2>
          <div className={styles.stats}>
            <span>Score: {uiScore}</span>
            <span style={{ color: '#ef4444' }}>Lives: {'❤️'.repeat(uiLives)}</span>
          </div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%', aspectRatio: '4/3' }}
            className={styles.canvas}
            onTouchMove={handleTouch}
            onTouchStart={handleTouch}
            onClick={() => {
              if (!gameState.current.started) {
                gameState.current.started = true;
              }
            }}
          />
        </div>

        {(gameOver || win) && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
              {win ? 'YOU WIN!' : 'GAME OVER'}
            </h2>
            <p>Score: {uiScore}</p>
            <p>XP Earned: {win ? '+100' : `+${Math.floor(uiScore / 5)}`}</p>
            <button onClick={restart} className={styles.restartBtn}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockBuster;
