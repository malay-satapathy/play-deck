import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './HoverJumper.module.css';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.6;
const JUMP = -8;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;

type Pipe = { x: number, topHeight: number, passed: boolean };

const HoverJumper: React.FC = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frames = useRef(0);
  
  const gameState = useRef({
    bird: { x: 50, y: CANVAS_HEIGHT / 2, vy: 0, radius: 15 },
    pipes: [] as Pipe[]
  });

  const jump = useCallback(() => {
    if (gameOver) return;
    if (!gameStarted) setGameStarted(true);
    gameState.current.bird.vy = JUMP;
  }, [gameOver, gameStarted]);

  const update = useCallback(() => {
    if (!gameStarted || gameOver) return;
    
    const state = gameState.current;
    frames.current++;

    // Bird physics
    state.bird.vy += GRAVITY;
    state.bird.y += state.bird.vy;

    // Floor/Ceiling collision
    if (state.bird.y + state.bird.radius >= CANVAS_HEIGHT || state.bird.y - state.bird.radius <= 0) {
      setGameOver(true);
      addXp(Math.floor(score / 2));
      return;
    }

    // Spawn pipes
    if (frames.current % 100 === 0) {
      const minHeight = 50;
      const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
      const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
      state.pipes.push({ x: CANVAS_WIDTH, topHeight, passed: false });
    }

    // Move pipes & check collision
    for (let i = 0; i < state.pipes.length; i++) {
      const p = state.pipes[i];
      p.x -= PIPE_SPEED;

      // Collision
      const birdRect = { 
        x: state.bird.x - state.bird.radius, 
        y: state.bird.y - state.bird.radius, 
        w: state.bird.radius * 2, 
        h: state.bird.radius * 2 
      };

      const hitTop = (
        birdRect.x < p.x + PIPE_WIDTH &&
        birdRect.x + birdRect.w > p.x &&
        birdRect.y < p.topHeight
      );
      const hitBottom = (
        birdRect.x < p.x + PIPE_WIDTH &&
        birdRect.x + birdRect.w > p.x &&
        birdRect.y + birdRect.h > p.topHeight + PIPE_GAP
      );

      if (hitTop || hitBottom) {
        setGameOver(true);
        addXp(Math.floor(score / 2));
        return;
      }

      // Score
      if (p.x + PIPE_WIDTH < state.bird.x && !p.passed) {
        p.passed = true;
        setScore(s => s + 1);
      }
    }

    // Cleanup offscreen pipes
    if (state.pipes.length > 0 && state.pipes[0].x + PIPE_WIDTH < 0) {
      state.pipes.shift();
    }

  }, [gameOver, gameStarted, score, addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Clear
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Pipes (Neon Green)
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22c55e';
    ctx.fillStyle = '#4ade80';
    state.pipes.forEach(p => {
      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      // Bottom pipe
      ctx.fillRect(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - p.topHeight - PIPE_GAP);
    });
    ctx.shadowBlur = 0;

    // Bird (Neon Pink)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899';
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(state.bird.x, state.bird.y, state.bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (!gameStarted && !gameOver) {
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap or Space to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }
  }, [gameStarted, gameOver]);

  const loop = useCallback(() => {
    update();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
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
      pipes: []
    };
    frames.current = 0;
    setScore(0);
    setGameStarted(false);
    setGameOver(false);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Hover-Jumper</h2>
          <div className={styles.scoreBoard}>Score: {score}</div>
        </div>

        <div className={styles.canvasContainer} onPointerDown={jump}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>CRASHED!</h2>
            <p>Score: {score}</p>
            <p>XP Earned: +{Math.floor(score / 2)}</p>
            <button onClick={restart} className={styles.restartBtn}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HoverJumper;
