import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './GridlockEscape.module.css';

interface Block {
  id: string;
  x: number;
  y: number;
  len: number;
  dir: 'h' | 'v';
  isRed: boolean;
  color: string;
}

const LEVEL_1: Block[] = [
  { id: 'red', x: 1, y: 2, len: 2, dir: 'h', isRed: true, color: '#ef4444' }, 
  { id: '1', x: 0, y: 0, len: 2, dir: 'v', isRed: false, color: '#10b981' },
  { id: '2', x: 1, y: 0, len: 2, dir: 'h', isRed: false, color: '#f59e0b' },
  { id: '3', x: 4, y: 0, len: 3, dir: 'v', isRed: false, color: '#3b82f6' },
  { id: '4', x: 1, y: 3, len: 3, dir: 'h', isRed: false, color: '#8b5cf6' },
  { id: '5', x: 4, y: 4, len: 2, dir: 'h', isRed: false, color: '#ec4899' },
];

const LEVEL_2: Block[] = [
  { id: 'red', x: 0, y: 2, len: 2, dir: 'h', isRed: true, color: '#ef4444' }, 
  { id: '1', x: 0, y: 0, len: 2, dir: 'h', isRed: false, color: '#10b981' },
  { id: '2', x: 2, y: 0, len: 3, dir: 'v', isRed: false, color: '#f59e0b' },
  { id: '3', x: 0, y: 3, len: 2, dir: 'v', isRed: false, color: '#3b82f6' },
  { id: '4', x: 2, y: 4, len: 2, dir: 'h', isRed: false, color: '#8b5cf6' },
  { id: '5', x: 5, y: 1, len: 3, dir: 'v', isRed: false, color: '#ec4899' },
  { id: '6', x: 4, y: 5, len: 2, dir: 'h', isRed: false, color: '#14b8a6' },
];

const LEVEL_3: Block[] = [
  { id: 'red', x: 1, y: 2, len: 2, dir: 'h', isRed: true, color: '#ef4444' },
  { id: '1', x: 0, y: 0, len: 3, dir: 'v', isRed: false, color: '#10b981' },
  { id: '2', x: 1, y: 0, len: 2, dir: 'v', isRed: false, color: '#f59e0b' },
  { id: '3', x: 3, y: 0, len: 2, dir: 'h', isRed: false, color: '#3b82f6' },
  { id: '4', x: 5, y: 0, len: 3, dir: 'v', isRed: false, color: '#8b5cf6' },
  { id: '5', x: 3, y: 1, len: 2, dir: 'v', isRed: false, color: '#ec4899' },
  { id: '6', x: 3, y: 3, len: 2, dir: 'h', isRed: false, color: '#14b8a6' },
  { id: '7', x: 1, y: 4, len: 2, dir: 'h', isRed: false, color: '#f97316' },
  { id: '8', x: 3, y: 4, len: 2, dir: 'v', isRed: false, color: '#0ea5e9' },
  { id: '9', x: 0, y: 5, len: 3, dir: 'h', isRed: false, color: '#84cc16' },
];

const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];

const isOccupied = (blocks: Block[], cx: number, cy: number, ignoreId: string) => {
  for (let b of blocks) {
      if (b.id === ignoreId) continue;
      if (b.dir === 'h') {
          if (cy === b.y && cx >= b.x && cx < b.x + b.len) return true;
      } else {
          if (cx === b.x && cy >= b.y && cy < b.y + b.len) return true;
      }
  }
  return false;
};

const GridlockEscape: React.FC = () => {
  const [level, setLevel] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>(LEVELS[0]);
  const [moves, setMoves] = useState(0);
  const [win, setWin] = useState(false);
  const [score, setScore] = useState(0);
  const [boardSize, setBoardSize] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  
  const boardRef = useRef<HTMLDivElement>(null);
  const { addXp } = useGlobalState();
  
  const dragRef = useRef<{ 
    id: string, 
    startX: number, 
    startY: number, 
    minDiff: number, 
    maxDiff: number, 
    currentDiff: number 
  } | null>(null);

  useEffect(() => {
    const updateSize = () => {
        if (boardRef.current) {
            setBoardSize(boardRef.current.clientWidth);
        }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleWin = useCallback(() => {
    setWin(true);
    const earnedScore = (level + 1) * 100 - (moves * 2);
    const finalScore = Math.max(10, earnedScore);
    setScore(s => s + finalScore);
    addXp(Math.floor(finalScore / 2));
  }, [level, moves, addXp]);

  const onPointerDown = (e: React.PointerEvent, block: Block) => {
    if (win) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLDivElement;
    el.setPointerCapture(e.pointerId);
    
    let minDiff = 0;
    let maxDiff = 0;
    
    if (block.dir === 'h') {
        for (let i = block.x - 1; i >= 0; i--) {
            if (isOccupied(blocks, i, block.y, block.id)) break;
            minDiff--;
        }
        for (let i = block.x + block.len; i < 6; i++) {
            if (isOccupied(blocks, i, block.y, block.id)) break;
            maxDiff++;
        }
    } else {
        for (let i = block.y - 1; i >= 0; i--) {
            if (isOccupied(blocks, block.x, i, block.id)) break;
            minDiff--;
        }
        for (let i = block.y + block.len; i < 6; i++) {
            if (isOccupied(blocks, block.x, i, block.id)) break;
            maxDiff++;
        }
    }
    
    dragRef.current = {
        id: block.id,
        startX: e.clientX,
        startY: e.clientY,
        minDiff, 
        maxDiff,
        currentDiff: 0
    };
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { id, startX, startY, minDiff, maxDiff } = dragRef.current;
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    
    const cellSize = boardSize / 6;
    let diffPx = block.dir === 'h' ? (e.clientX - startX) : (e.clientY - startY);
    let diffCells = Math.round(diffPx / cellSize);
    diffCells = Math.max(minDiff, Math.min(maxDiff, diffCells));
    
    dragRef.current.currentDiff = diffCells;
    
    const el = document.getElementById(`block-${id}`);
    if (el) {
       if (block.dir === 'h') {
           el.style.transform = `translate(${(block.x + diffCells) * cellSize}px, ${block.y * cellSize}px)`;
       } else {
           el.style.transform = `translate(${block.x * cellSize}px, ${(block.y + diffCells) * cellSize}px)`;
       }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const el = e.currentTarget as HTMLDivElement;
    el.releasePointerCapture(e.pointerId);
    
    const { id, currentDiff } = dragRef.current;
    
    if (currentDiff !== 0) {
       let didWin = false;
       setBlocks(prev => prev.map(b => {
           if (b.id === id) {
               const nx = b.dir === 'h' ? b.x + currentDiff : b.x;
               const ny = b.dir === 'v' ? b.y + currentDiff : b.y;
               if (b.isRed && nx + b.len === 6) didWin = true;
               return { ...b, x: nx, y: ny };
           }
           return b;
       }));
       setMoves(m => m + 1);
       if (didWin) handleWin();
    } else {
       // snap back
       const block = blocks.find(b => b.id === id);
       if (block) {
         const cellSize = boardSize / 6;
         el.style.transform = `translate(${block.x * cellSize}px, ${block.y * cellSize}px)`;
       }
    }
    
    dragRef.current = null;
    setIsDragging(false);
  };

  const restart = () => {
    setBlocks(LEVELS[level]);
    setMoves(0);
    setWin(false);
  };

  const nextLevel = () => {
    const nextLvl = (level + 1) % LEVELS.length;
    setLevel(nextLvl);
    setBlocks(LEVELS[nextLvl]);
    setMoves(0);
    setWin(false);
  };

  const cellSize = boardSize / 6;

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoardContainer}>
        <div className={styles.header}>
          <h2>Gridlock Escape: Lvl {level + 1}</h2>
          <div className={styles.infoBar}>
            <div className={styles.moves}>Moves: {moves}</div>
            <button onClick={restart} style={{background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem'}}>↻ Restart</button>
            <div className={styles.scoreBoard}>Score: {score}</div>
          </div>
        </div>

        <div className={styles.boardWrapper}>
          <div 
            className={styles.board} 
            ref={boardRef}
            style={{ height: boardSize }}
          >
            {/* Grid background lines */}
            {Array.from({ length: 6 }).map((_, i) => (
              <React.Fragment key={`grid-${i}`}>
                <div className={styles.gridLineH} style={{ top: `${(i * 100) / 6}%` }} />
                <div className={styles.gridLineV} style={{ left: `${(i * 100) / 6}%` }} />
              </React.Fragment>
            ))}

            <div 
              className={styles.exit} 
              style={{ 
                  top: 2 * cellSize,
                  height: cellSize
              }}
            >
              EXIT
            </div>

            {blocks.map(b => {
              const isBeingDragged = isDragging && dragRef.current?.id === b.id;
              return (
                <div 
                  key={b.id}
                  id={`block-${b.id}`}
                  className={`${styles.block} ${b.isRed ? styles.redCar : ''}`}
                  style={{
                      width: b.dir === 'h' ? b.len * cellSize : cellSize,
                      height: b.dir === 'v' ? b.len * cellSize : cellSize,
                      transform: `translate(${b.x * cellSize}px, ${b.y * cellSize}px)`,
                      backgroundColor: b.color,
                      transition: isBeingDragged ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                  }}
                  onPointerDown={(e) => onPointerDown(e, b)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              );
            })}
          </div>
        </div>

        <div className={styles.controlsHelp}>
          Drag the blocks. Red block must reach the EXIT.
        </div>

        {win && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: '#10b981' }}>Escaped!</h2>
            <p>Moves: {moves}</p>
            <button onClick={nextLevel} className={styles.nextBtn}>Next Level</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridlockEscape;
