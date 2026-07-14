import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './CyberSnake.module.css';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

type Point = { x: number, y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const CyberSnake: React.FC = () => {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });

  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const { addXp } = useGlobalState();
  const directionRef = useRef<Direction>('RIGHT');

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      const collision = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!collision) break;
    }
    return newFood;
  }, []);

  const moveSnake = useCallback(() => {
    if (gameOver) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (directionRef.current) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Check wall collision
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        addXp(Math.floor(score / 5));
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        addXp(Math.floor(score / 5));
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // remove tail
      }

      return newSnake;
    });
  }, [gameOver, food, generateFood, score, addXp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': 
        case 'w':
          if (directionRef.current !== 'DOWN') directionRef.current = 'UP'; 
          break;
        case 'ArrowDown':
        case 's':
          if (directionRef.current !== 'UP') directionRef.current = 'DOWN'; 
          break;
        case 'ArrowLeft':
        case 'a':
          if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT'; 
          break;
        case 'ArrowRight':
        case 'd':
          if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT'; 
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const speed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 10);
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [moveSnake, score]);

  const restart = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood([{ x: 10, y: 10 }]));
    directionRef.current = 'RIGHT';

    setScore(0);
    setGameOver(false);
  };

  const handleDPad = (dir: Direction) => {
    if (
      (dir === 'UP' && directionRef.current !== 'DOWN') ||
      (dir === 'DOWN' && directionRef.current !== 'UP') ||
      (dir === 'LEFT' && directionRef.current !== 'RIGHT') ||
      (dir === 'RIGHT' && directionRef.current !== 'LEFT')
    ) {
      directionRef.current = dir;
    }
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Cyber-Snake</h2>
          <div className={styles.scoreBoard}>Score: {score}</div>
        </div>

        <div className={styles.grid}>
          {Array.from({ length: GRID_SIZE }).map((_, y) => (
            Array.from({ length: GRID_SIZE }).map((_, x) => {
              const isSnake = snake.some(s => s.x === x && s.y === y);
              const isHead = snake[0].x === x && snake[0].y === y;
              const isFood = food.x === x && food.y === y;
              
              return (
                <div 
                  key={`${x}-${y}`} 
                  className={`
                    ${styles.cell} 
                    ${isSnake ? styles.snake : ''} 
                    ${isHead ? styles.head : ''} 
                    ${isFood ? styles.food : ''}
                  `}
                />
              );
            })
          ))}
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>SYSTEM FAILURE</h2>
            <p>Score: {score}</p>
            <p>XP Earned: +{Math.floor(score / 5)}</p>
            <button onClick={restart} className={styles.restartBtn}>Reboot</button>
          </div>
        )}
      </div>

      <div className={styles.dpad}>
        <button className={`${styles.dpadBtn} ${styles.up}`} onClick={() => handleDPad('UP')}>↑</button>
        <button className={`${styles.dpadBtn} ${styles.left}`} onClick={() => handleDPad('LEFT')}>←</button>
        <button className={`${styles.dpadBtn} ${styles.down}`} onClick={() => handleDPad('DOWN')}>↓</button>
        <button className={`${styles.dpadBtn} ${styles.right}`} onClick={() => handleDPad('RIGHT')}>→</button>
      </div>
    </div>
  );
};

export default CyberSnake;
