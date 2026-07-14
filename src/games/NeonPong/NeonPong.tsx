import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './NeonPong.module.css';
import { Cpu, Users } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 15;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;

type Mode = '1P' | '2P' | null;

const NeonPong: React.FC = () => {
  const [mode, setMode] = useState<Mode>(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    p1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
    p2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: INITIAL_BALL_SPEED, vy: INITIAL_BALL_SPEED },
    keys: { w: false, s: false, up: false, down: false }
  });

  const resetBall = () => {
    gameState.current.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED,
      vy: (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED
    };
  };

  const update = useCallback(() => {
    if (gameOver) return;
    const state = gameState.current;
    
    // Player 1 Movement (W/S)
    if (state.keys.w && state.p1.y > 0) state.p1.y -= PADDLE_SPEED;
    if (state.keys.s && state.p1.y < CANVAS_HEIGHT - PADDLE_HEIGHT) state.p1.y += PADDLE_SPEED;

    // Player 2 / Bot Movement
    if (mode === '2P') {
      if (state.keys.up && state.p2.y > 0) state.p2.y -= PADDLE_SPEED;
      if (state.keys.down && state.p2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) state.p2.y += PADDLE_SPEED;
    } else if (mode === '1P') {
      // Simple Bot AI
      const botCenter = state.p2.y + PADDLE_HEIGHT / 2;
      if (botCenter < state.ball.y - 10 && state.p2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        state.p2.y += PADDLE_SPEED * 0.7; // slightly slower than player
      } else if (botCenter > state.ball.y + 10 && state.p2.y > 0) {
        state.p2.y -= PADDLE_SPEED * 0.7;
      }
    }

    // Ball movement
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // Wall collision (top/bottom)
    if (state.ball.y <= 0 || state.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      state.ball.vy *= -1;
    }

    // Paddle collision
    // P1
    if (state.ball.x <= PADDLE_WIDTH && state.ball.y + BALL_SIZE >= state.p1.y && state.ball.y <= state.p1.y + PADDLE_HEIGHT) {
      state.ball.vx = Math.abs(state.ball.vx) + 0.5; // speed up slightly
      state.ball.x = PADDLE_WIDTH; // prevent clipping
    }
    // P2
    if (state.ball.x + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH && state.ball.y + BALL_SIZE >= state.p2.y && state.ball.y <= state.p2.y + PADDLE_HEIGHT) {
      state.ball.vx = -Math.abs(state.ball.vx) - 0.5;
      state.ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
    }

    // Scoring
    if (state.ball.x < 0) {
      state.p2.score++;
      setScore({ p1: state.p1.score, p2: state.p2.score });
      resetBall();
    } else if (state.ball.x > CANVAS_WIDTH) {
      state.p1.score++;
      setScore({ p1: state.p1.score, p2: state.p2.score });
      resetBall();
    }

    // Win condition (First to 5)
    if (state.p1.score >= 5 || state.p2.score >= 5) {
      setGameOver(true);
      if (state.p1.score >= 5) addXp(25); // Player 1 wins
      if (mode === '2P' && state.p2.score >= 5) addXp(25); // P2 wins in 2P mode
    }

  }, [mode, gameOver, addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;

    // Clear
    ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Center line
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // P1 Paddle (Cyan)
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#06b6d4';
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(0, state.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // P2 Paddle (Magenta)
    ctx.shadowColor = '#ec4899';
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, state.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball (White/Yellow)
    ctx.shadowColor = '#facc15';
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.rect(state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);
    ctx.fill();

    ctx.shadowBlur = 0; // reset for next frame
  }, []);

  const loop = useCallback(() => {
    if (!gameOver && mode) {
      update();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw, gameOver, mode]);

  useEffect(() => {
    if (mode) {
      requestRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key.toLowerCase() === 'w') state.keys.w = true;
      if (e.key.toLowerCase() === 's') state.keys.s = true;
      if (e.key === 'ArrowUp') state.keys.up = true;
      if (e.key === 'ArrowDown') state.keys.down = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key.toLowerCase() === 'w') state.keys.w = false;
      if (e.key.toLowerCase() === 's') state.keys.s = false;
      if (e.key === 'ArrowUp') state.keys.up = false;
      if (e.key === 'ArrowDown') state.keys.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const restart = () => {
    gameState.current.p1.score = 0;
    gameState.current.p2.score = 0;
    setScore({ p1: 0, p2: 0 });
    setGameOver(false);
    resetBall();
  };

  if (!mode) {
    return (
      <div className={styles.gameContainer}>
        <BackButton />
        <div className={styles.menuBox}>
          <h1>Neon-Pong</h1>
          <p>Select Game Mode (First to 5 wins)</p>
          <div className={styles.modeButtons}>
            <button onClick={() => setMode('1P')} className={styles.modeBtn}>
              <Cpu size={32} />
              <span>1 Player (vs Bot)</span>
            </button>
            <button onClick={() => setMode('2P')} className={styles.modeBtn}>
              <Users size={32} />
              <span>2 Player (Local)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Touch Controls
  const handleTouch = (player: 'p1'|'p2', e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    
    // Scale touch Y to internal canvas coordinate system
    const scaleY = CANVAS_HEIGHT / rect.height;
    const internalY = touchY * scaleY;
    
    const newY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, internalY - PADDLE_HEIGHT / 2));
    if (player === 'p1') gameState.current.p1.y = newY;
    if (player === 'p2' && mode === '2P') gameState.current.p2.y = newY;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.scoreBoard}>
          <div className={styles.p1Score}>{score.p1}</div>
          <div className={styles.title}>NEON PONG</div>
          <div className={styles.p2Score}>{score.p2}</div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />
          {/* Invisible touch overlays for mobile */}
          <div className={styles.touchZones}>
            <div 
              className={styles.touchLeft} 
              onTouchMove={(e) => handleTouch('p1', e)}
            />
            {mode === '2P' && (
              <div 
                className={styles.touchRight} 
                onTouchMove={(e) => handleTouch('p2', e)}
              />
            )}
          </div>
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>{score.p1 >= 5 ? 'PLAYER 1 WINS' : (mode === '1P' ? 'BOT WINS' : 'PLAYER 2 WINS')}</h2>
            <p>XP Earned: {score.p1 >= 5 || (score.p2 >= 5 && mode === '2P') ? '+25' : '+0'}</p>
            <div className={styles.endButtons}>
              <button onClick={restart} className={styles.restartBtn}>Play Again</button>
              <button onClick={() => { setMode(null); restart(); }} className={styles.menuReturnBtn}>Main Menu</button>
            </div>
          </div>
        )}
        
        <div className={styles.controlsHelp}>
          P1: [W] / [S] &nbsp;&nbsp;|&nbsp;&nbsp; {mode === '2P' ? 'P2: [↑] / [↓]' : 'Bot is active'}
        </div>
      </div>
    </div>
  );
};

export default NeonPong;
