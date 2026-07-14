import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './GridlockEscape.module.css';

const GridlockEscape: React.FC = () => {
  const [level, setLevel] = useState(1);
  const GRID_SIZE = 2 + level; // Level 1 is 3x3, Level 2 is 4x4, etc.
  const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [visited, setVisited] = useState<Set<string>>(new Set(['0,0']));
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5 + level * 5); // Base 5s + 5s per level
  
  const { addXp } = useGlobalState();

  // Timer logic
  useEffect(() => {
    if (gameOver || win) return;
    if (timeLeft <= 0) {
      setGameOver(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, gameOver, win]);

  const handleWin = useCallback(() => {
    setWin(true);
    setGameOver(true);
    // Score based on grid size and remaining time
    const earnedScore = (level * 20) + (timeLeft * 5);
    setScore(s => s + earnedScore);
    addXp(Math.floor(earnedScore / 2));
  }, [level, timeLeft, addXp]);

  const handleLose = useCallback(() => {
    setGameOver(true);
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    if (gameOver) return;
    
    setPlayer(p => {
      const nx = p.x + dx;
      const ny = p.y + dy;
      
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return p;
      const key = `${nx},${ny}`;
      if (visited.has(key)) return p; // Cannot step on visited tile
      
      setVisited(v => {
        const nextV = new Set(v).add(key);
        // Check win condition: exit is bottom right and all tiles visited
        if (nx === GRID_SIZE - 1 && ny === GRID_SIZE - 1) {
          if (nextV.size === TOTAL_TILES) {
            handleWin();
          } else {
            handleLose(); // Reached exit too early
          }
        } else {
          // Check if trapped
          const moves = [
            [0, 1], [0, -1], [1, 0], [-1, 0]
          ];
          let canMove = false;
          for (let m of moves) {
            const mx = nx + m[0];
            const my = ny + m[1];
            if (mx >= 0 && mx < GRID_SIZE && my >= 0 && my < GRID_SIZE && !nextV.has(`${mx},${my}`)) {
              canMove = true;
              break;
            }
          }
          if (!canMove) {
            handleLose();
          }
        }
        return nextV;
      });
      
      return { x: nx, y: ny };
    });
  }, [gameOver, visited, GRID_SIZE, TOTAL_TILES, handleWin, handleLose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowUp': move(0, -1); break;
        case 'ArrowDown': move(0, 1); break;
        case 'ArrowLeft': move(-1, 0); break;
        case 'ArrowRight': move(1, 0); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const restart = () => {
    setLevel(1);
    setPlayer({ x: 0, y: 0 });
    setVisited(new Set(['0,0']));
    setScore(0);
    setTimeLeft(10); // Reset to base level 1 time
    setGameOver(false);
    setWin(false);
  };

  const nextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setPlayer({ x: 0, y: 0 });
    setVisited(new Set(['0,0']));
    setTimeLeft(5 + nextLvl * 5);
    setGameOver(false);
    setWin(false);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Gridlock Escape: Level {level}</h2>
          <div className={styles.infoBar}>
            <div className={styles.timer} style={{ color: timeLeft <= 5 ? '#ef4444' : '#f8fafc' }}>
              Time: {timeLeft}s
            </div>
            <div className={styles.scoreBoard}>Score: {score}</div>
          </div>
        </div>

        <div className={styles.grid}>
          {Array.from({ length: GRID_SIZE }).map((_, y) => (
            <div key={y} className={styles.row}>
              {Array.from({ length: GRID_SIZE }).map((_, x) => {
                const isPlayer = player.x === x && player.y === y;
                const isExit = x === GRID_SIZE - 1 && y === GRID_SIZE - 1;
                const isVisited = visited.has(`${x},${y}`);
                
                let cellClass = styles.cell;
                if (isPlayer) cellClass += ` ${styles.player}`;
                else if (isExit) cellClass += ` ${styles.exit}`;
                else if (isVisited) cellClass += ` ${styles.visited}`;
                
                // Scale cell size down slightly as grid gets bigger
                const cellSize = Math.max(30, 80 - (GRID_SIZE * 5));

                return (
                  <div 
                    key={`${x}-${y}`} 
                    className={cellClass} 
                    style={{ width: cellSize, height: cellSize }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.dpad}>
          <button className={`${styles.dpadBtn} ${styles.up}`} onClick={() => move(0, -1)}>↑</button>
          <button className={`${styles.dpadBtn} ${styles.left}`} onClick={() => move(-1, 0)}>←</button>
          <button className={`${styles.dpadBtn} ${styles.down}`} onClick={() => move(0, 1)}>↓</button>
          <button className={`${styles.dpadBtn} ${styles.right}`} onClick={() => move(1, 0)}>→</button>
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
              {win ? 'Level Complete!' : (timeLeft <= 0 ? 'Time Up!' : 'Trapped!')}
            </h2>
            {win ? (
              <>
                <p>Time bonus applied!</p>
                <button onClick={nextLevel} className={styles.nextBtn}>Next Level</button>
              </>
            ) : (
              <>
                <p>Final Score: {score}</p>
                <button onClick={restart} className={styles.restartBtn}>Play Again</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GridlockEscape;
