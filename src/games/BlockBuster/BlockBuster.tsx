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
const BALL_SPEED = 6;
const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_PADDING = 10;
const BRICK_WIDTH = (CANVAS_WIDTH - (BRICK_COLS + 1) * BRICK_PADDING) / BRICK_COLS;
const BRICK_HEIGHT = 20;

type Rect = { x: number, y: number, w: number, h: number };
type Brick = Rect & { active: boolean, color: string };

const BlockBuster: React.FC = () => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    paddle: { x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2, y: CANVAS_HEIGHT - 30, w: PADDLE_WIDTH, h: PADDLE_HEIGHT },
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: BALL_SPEED, vy: -BALL_SPEED },
    bricks: [] as Brick[],
    keys: { left: false, right: false }
  });

  const initBricks = () => {
    const bricks: Brick[] = [];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_PADDING,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING + 40,
          w: BRICK_WIDTH,
          h: BRICK_HEIGHT,
          active: true,
          color: colors[r]
        });
      }
    }
    gameState.current.bricks = bricks;
  };

  const resetBall = () => {
    gameState.current.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: BALL_SPEED, vy: -BALL_SPEED };
    gameState.current.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
  };

  const update = useCallback((dt: number) => {
    if (gameOver || win) return;
    const state = gameState.current;
    
    // Paddle movement
    if (state.keys.left && state.paddle.x > 0) state.paddle.x -= PADDLE_SPEED * dt;
    if (state.keys.right && state.paddle.x < CANVAS_WIDTH - state.paddle.w) state.paddle.x += PADDLE_SPEED * dt;

    // Ball movement
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;

    // Wall collision
    if (state.ball.x <= 0 || state.ball.x >= CANVAS_WIDTH - BALL_SIZE) state.ball.vx *= -1;
    if (state.ball.y <= 0) state.ball.vy *= -1;

    // Bottom out
    if (state.ball.y >= CANVAS_HEIGHT) {
      setLives(l => {
        if (l - 1 <= 0) {
          setGameOver(true);
          addXp(Math.floor(score / 5));
          return 0;
        }
        resetBall();
        return l - 1;
      });
      return;
    }

    // Paddle collision
    if (
      state.ball.x + BALL_SIZE >= state.paddle.x &&
      state.ball.x <= state.paddle.x + state.paddle.w &&
      state.ball.y + BALL_SIZE >= state.paddle.y &&
      state.ball.y <= state.paddle.y + state.paddle.h
    ) {
      state.ball.vy = -Math.abs(state.ball.vy);
      // Add english based on where it hit paddle
      const hitPos = (state.ball.x - state.paddle.x) / state.paddle.w;
      state.ball.vx = BALL_SPEED * (hitPos - 0.5) * 2; 
    }

    // Brick collision
    let activeBricks = 0;
    state.bricks.forEach(b => {
      if (!b.active) return;
      activeBricks++;
      if (
        state.ball.x + BALL_SIZE >= b.x &&
        state.ball.x <= b.x + b.w &&
        state.ball.y + BALL_SIZE >= b.y &&
        state.ball.y <= b.y + b.h
      ) {
        b.active = false;
        state.ball.vy *= -1;
        setScore(s => s + 10);
      }
    });

    if (activeBricks === 0) {
      setWin(true);
      addXp(50);
    }

  }, [gameOver, win, score, addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
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
    state.bricks.forEach(b => {
      if (b.active) {
        ctx.shadowBlur = 5;
        ctx.shadowColor = b.color;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
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
    initBricks();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const restart = () => {
    initBricks();
    resetBall();
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWin(false);
  };

  const handleTouch = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const scaleX = CANVAS_WIDTH / rect.width;
    const internalX = touchX * scaleX;
    
    gameState.current.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, internalX - PADDLE_WIDTH / 2));
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Block-Buster</h2>
          <div className={styles.stats}>
            <span>Score: {score}</span>
            <span style={{ color: '#ef4444' }}>Lives: {'❤️'.repeat(lives)}</span>
          </div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className={styles.canvas}
            onTouchMove={handleTouch}
          />
        </div>

        {(gameOver || win) && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
              {win ? 'YOU WIN!' : 'GAME OVER'}
            </h2>
            <p>Score: {score}</p>
            <p>XP Earned: {win ? '+50' : `+${Math.floor(score / 5)}`}</p>
            <button onClick={restart} className={styles.restartBtn}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockBuster;
