import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './MergeStack.module.css';

type Tile = {
  id: string;
  value: number;
  r: number;
  c: number;
  mergedInto?: string;
  isNew?: boolean;
};

const TECH_MAP: Record<number, string> = {
  2: 'HTML',
  4: 'CSS',
  8: 'JS',
  16: 'React',
  32: 'TS',
  64: 'Node',
  128: 'SQL',
  256: 'Docker',
  512: 'K8s',
  1024: 'AWS',
  2048: 'WEB3'
};

const COLOR_MAP: Record<number, string> = {
  2: '#e34c26',
  4: '#264de4',
  8: '#f7df1e',
  16: '#61dafb',
  32: '#3178c6',
  64: '#339933',
  128: '#003b57',
  256: '#2496ed',
  512: '#326ce5',
  1024: '#ff9900',
  2048: '#a29bfe'
};

const getTileColor = (val: number) => {
  if (val === 8 || val === 16 || val === 2048) return '#000';
  return '#fff';
};

const checkNoMoves = (currentTiles: Tile[]): boolean => {
  const activeTiles = currentTiles.filter(t => !t.mergedInto);
  if (activeTiles.length < 16) return false;
  
  const grid: number[][] = Array(4).fill(0).map(() => Array(4).fill(0));
  activeTiles.forEach(t => grid[t.r][t.c] = t.value);
  
  for (let r=0; r<4; r++) {
    for (let c=0; c<4; c++) {
      if (r < 3 && grid[r][c] === grid[r+1][c]) return false;
      if (c < 3 && grid[r][c] === grid[r][c+1]) return false;
    }
  }
  return true;
};

const moveTiles = (currentTiles: Tile[], direction: 'UP'|'DOWN'|'LEFT'|'RIGHT') => {
  let changed = false;
  let scoreInc = 0;
  
  const activeTiles = currentTiles.filter(t => !t.mergedInto).map(t => ({...t, isNew: false}));
  const nextTiles: Tile[] = []; 
  
  const grid: (Tile | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null));
  activeTiles.forEach(t => { grid[t.r][t.c] = t; });
  
  for (let i = 0; i < 4; i++) {
    let line: (Tile | null)[] = [];
    for (let j = 0; j < 4; j++) {
      if (direction === 'LEFT' || direction === 'RIGHT') line.push(grid[i][direction === 'RIGHT' ? 3 - j : j]);
      else line.push(grid[direction === 'DOWN' ? 3 - j : j][i]);
    }
    
    let compacted = line.filter(t => t !== null) as Tile[];
    let j = 0;
    let targetPos = 0; 
    
    while(j < compacted.length) {
      const t1 = compacted[j];
      const t2 = j + 1 < compacted.length ? compacted[j+1] : null;
      
      const r = direction === 'LEFT' || direction === 'RIGHT' ? i : (direction === 'DOWN' ? 3 - targetPos : targetPos);
      const c = direction === 'LEFT' || direction === 'RIGHT' ? (direction === 'RIGHT' ? 3 - targetPos : targetPos) : i;
      
      if (t2 && t1.value === t2.value) {
        const val = t1.value * 2;
        scoreInc += val;
        
        t1.r = r; t1.c = c;
        t2.r = r; t2.c = c;
        
        const newTile: Tile = {
          id: Math.random().toString(36).substring(2, 9),
          value: val,
          r, c,
          isNew: true
        };
        
        t1.mergedInto = newTile.id;
        t2.mergedInto = newTile.id;
        
        nextTiles.push(t1, t2, newTile);
        changed = true;
        j += 2;
      } else {
        if (t1.r !== r || t1.c !== c) changed = true;
        t1.r = r; t1.c = c;
        nextTiles.push(t1);
        j++;
      }
      targetPos++;
    }
  }
  
  return { newTiles: nextTiles, changed, scoreInc };
};

const MergeStack: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  
  const tilesRef = useRef<Tile[]>([]);
  const scoreRef = useRef<number>(0);
  const gameOverRef = useRef(false);
  const hasWonRef = useRef(false);
  const keepPlayingRef = useRef(false);
  
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { hasWonRef.current = hasWon; }, [hasWon]);
  useEffect(() => { keepPlayingRef.current = keepPlaying; }, [keepPlaying]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const { addXp } = useGlobalState();

  const initGame = useCallback(() => {
    const initTiles = [];
    const emptySpots = [];
    for(let r=0;r<4;r++) for(let c=0;c<4;c++) emptySpots.push({r,c});
    
    for (let i=0; i<2; i++) {
      const idx = Math.floor(Math.random() * emptySpots.length);
      const spot = emptySpots.splice(idx, 1)[0];
      initTiles.push({
        id: Math.random().toString(36).substring(2, 9),
        value: Math.random() < 0.9 ? 2 : 4,
        r: spot.r, c: spot.c,
        isNew: true
      });
    }
    setTiles(initTiles);
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
  }, []);

  // Initialize once on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleGameOver = useCallback((finalScore: number) => {
    setGameOver(true);
    addXp(Math.floor(finalScore / 10)); 
  }, [addXp]);

  const move = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOverRef.current || (hasWonRef.current && !keepPlayingRef.current)) return;
    
    const currentTiles = tilesRef.current;
    const { newTiles, changed, scoreInc } = moveTiles(currentTiles, direction);
    
    if (changed) {
      const finalTiles = [...newTiles];
      
      if (finalTiles.some(t => t.value >= 2048) && !hasWonRef.current) {
        setHasWon(true);
        hasWonRef.current = true;
      }
      
      const emptySpots = [];
      const occupied = new Set(finalTiles.filter(t => !t.mergedInto).map(t => `${t.r},${t.c}`));
      for (let r=0; r<4; r++) {
        for (let c=0; c<4; c++) {
          if (!occupied.has(`${r},${c}`)) emptySpots.push({r,c});
        }
      }
      if (emptySpots.length > 0) {
        const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
        finalTiles.push({
          id: Math.random().toString(36).substring(2, 9),
          value: Math.random() < 0.9 ? 2 : 4,
          r: spot.r, c: spot.c,
          isNew: true
        });
      }
      
      setTiles(finalTiles);
      setScore(s => s + scoreInc);
      
      setTimeout(() => {
        setTiles(curr => curr.filter(t => !t.mergedInto));
      }, 150);
      
      if (checkNoMoves(finalTiles)) {
        handleGameOver(scoreRef.current + scoreInc);
      }
    }
  }, [handleGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowUp': move('UP'); break;
        case 'ArrowDown': move('DOWN'); break;
        case 'ArrowLeft': move('LEFT'); break;
        case 'ArrowRight': move('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameOver || (hasWon && !keepPlaying)) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) move(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      if (Math.abs(dy) > 30) move(dy > 0 ? 'DOWN' : 'UP');
    }
    
    touchStartRef.current = null;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h1>Merge the Stack</h1>
          <div className={styles.scoreBoard}>Score: {score}</div>
        </div>
        
        <div 
          className={styles.grid}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.gridBackground}>
            {Array(16).fill(0).map((_, i) => (
              <div key={i} className={styles.emptyCell} />
            ))}
          </div>
          
          {tiles.map(t => (
            <div 
              className={styles.tileWrapper} 
              style={{ 
                '--r': t.r,
                '--c': t.c,
                zIndex: t.mergedInto ? 1 : 2
              } as React.CSSProperties}
              key={t.id}
            >
              <div 
                className={`${styles.tile} ${t.isNew ? styles.new : ''}`} 
                style={{ backgroundColor: COLOR_MAP[t.value] || '#333', color: getTileColor(t.value) }}
              >
                <span>{TECH_MAP[t.value] || t.value}</span>
              </div>
            </div>
          ))}
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>Game Over!</h2>
            <p>You earned {Math.floor(score / 10)} global XP!</p>
            <button onClick={initGame} className={styles.restartBtn}>Restart</button>
          </div>
        )}
        
        {hasWon && !keepPlaying && !gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2 className={styles.win}>STACK MERGED!</h2>
            <p>You mastered WEB3!</p>
            <div className={styles.btnGroup}>
              <button onClick={() => setKeepPlaying(true)} className={styles.continueBtn}>Keep Playing</button>
              <button onClick={initGame} className={styles.restartBtn}>Play Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MergeStack;
