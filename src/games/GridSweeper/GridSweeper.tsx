import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './GridSweeper.module.css';
import { Flag, Bomb, Clock, RefreshCw, Shovel } from 'lucide-react';

const ROWS = 10;
const COLS = 10;
const MINES = 15;

type Cell = {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  isDetonated: boolean;
};

const GridSweeper: React.FC = () => {
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [flags, setFlags] = useState(MINES);
  const [firstClick, setFirstClick] = useState(true);
  const [flagMode, setFlagMode] = useState(false);
  const [time, setTime] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  
  const { addXp } = useGlobalState();

  const initEmptyBoard = useCallback(() => {
    const newBoard: Cell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      newBoard.push([]);
      for (let c = 0; c < COLS; c++) {
        newBoard[r].push({ r, c, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0, isDetonated: false });
      }
    }
    setBoard(newBoard);
    setGameOver(false);
    setWin(false);
    setFlags(MINES);
    setFirstClick(true);
    setTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    initEmptyBoard();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initEmptyBoard]);

  const placeMines = (firstR: number, firstC: number, currentBoard: Cell[][]) => {
    const newBoard = currentBoard.map(row => row.map(cell => ({ ...cell })));
    
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      
      // Prevent mine on first click or its immediate neighbors to guarantee an opening
      const isFirstClickArea = Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1;
      
      if (!newBoard[r][c].isMine && !isFirstClickArea) {
        newBoard[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // Calc neighbors
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!newBoard[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (r + dr >= 0 && r + dr < ROWS && c + dc >= 0 && c + dc < COLS) {
                if (newBoard[r + dr][c + dc].isMine) count++;
              }
            }
          }
          newBoard[r][c].neighborMines = count;
        }
      }
    }
    return newBoard;
  };

  const floodFill = (startR: number, startC: number, newBoard: Cell[][]) => {
    const stack = [[startR, startC]];
    while (stack.length > 0) {
      const [currR, currC] = stack.pop()!;
      if (!newBoard[currR][currC].isRevealed) {
        newBoard[currR][currC].isRevealed = true;
        if (newBoard[currR][currC].neighborMines === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = currR + dr;
              const nc = currC + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !newBoard[nr][nc].isRevealed && !newBoard[nr][nc].isFlagged) {
                stack.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || win || board[r][c].isRevealed) {
      if (board[r][c].isRevealed && board[r][c].neighborMines > 0) {
        handleChord(r, c);
      }
      return;
    }
    if (flagMode) {
      toggleFlagInternal(r, c);
      return;
    }
    if (board[r][c].isFlagged) return;

    let currentBoard = board;

    if (firstClick) {
      setFirstClick(false);
      currentBoard = placeMines(r, c, currentBoard);
      timerRef.current = window.setInterval(() => setTime(t => t + 1), 1000);
    }

    const newBoard = currentBoard.map(row => row.map(cell => ({ ...cell })));
    
    if (newBoard[r][c].isMine) {
      // Game Over
      newBoard[r][c].isDetonated = true;
      newBoard.forEach(row => row.forEach(cell => {
        if (cell.isMine) cell.isRevealed = true;
      }));
      setBoard(newBoard);
      setGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    floodFill(r, c, newBoard);
    
    setBoard(newBoard);
    checkWin(newBoard);
  };

  const handleChord = (r: number, c: number) => {
    const cell = board[r][c];
    let flaggedNeighbors = 0;
    
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isFlagged) {
          flaggedNeighbors++;
        }
      }
    }

    if (flaggedNeighbors === cell.neighborMines) {
      const newBoard = board.map(row => row.map(cl => ({ ...cl })));
      let hitMine = false;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !newBoard[nr][nc].isRevealed && !newBoard[nr][nc].isFlagged) {
            if (newBoard[nr][nc].isMine) {
              newBoard[nr][nc].isDetonated = true;
              hitMine = true;
            } else {
              floodFill(nr, nc, newBoard);
            }
          }
        }
      }

      if (hitMine) {
        newBoard.forEach(row => row.forEach(cl => {
          if (cl.isMine) cl.isRevealed = true;
        }));
        setBoard(newBoard);
        setGameOver(true);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setBoard(newBoard);
        checkWin(newBoard);
      }
    }
  };

  const toggleFlagInternal = (r: number, c: number) => {
    if (gameOver || win || board[r][c].isRevealed) return;

    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = newBoard[r][c];

    if (!cell.isFlagged && flags > 0) {
      cell.isFlagged = true;
      setFlags(f => f - 1);
    } else if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlags(f => f + 1);
    }
    
    setBoard(newBoard);
  };

  const toggleFlagEvent = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    toggleFlagInternal(r, c);
  };

  const checkWin = (currBoard: Cell[][]) => {
    let unrevealedSafeCells = 0;
    currBoard.forEach(row => row.forEach(cell => {
      if (!cell.isRevealed && !cell.isMine) {
        unrevealedSafeCells++;
      }
    }));

    if (unrevealedSafeCells === 0) {
      setWin(true);
      addXp(100);
      if (timerRef.current) clearInterval(timerRef.current);
      // Reveal all mines as flagged
      const newBoard = currBoard.map(row => row.map(cell => ({ ...cell })));
      newBoard.forEach(row => row.forEach(cell => {
        if (cell.isMine) cell.isFlagged = true;
      }));
      setBoard(newBoard);
      setFlags(0);
    }
  };

  const getNumberColor = (num: number) => {
    // 7 and 8 updated to high contrast neon variants against slate
    const colors = ['', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f97316', '#06b6d4', '#fde047', '#fbcfe8'];
    return colors[num] || '#fff';
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Grid-Sweeper</h2>
          <div className={styles.controls}>
            <button className={styles.iconBtn} onClick={initEmptyBoard} title="Restart">
              <RefreshCw size={20} />
            </button>
            <button 
              className={`${styles.modeBtn} ${flagMode ? styles.flagModeActive : ''}`}
              onClick={() => setFlagMode(!flagMode)}
              title={flagMode ? "Flag Mode" : "Dig Mode"}
            >
              {flagMode ? <Flag size={20} /> : <Shovel size={20} />}
            </button>
          </div>
        </div>

        <div className={styles.stats}>
          <span className={styles.statBox}><Flag size={18} /> {flags}</span>
          <span className={styles.statBox}><Clock size={18} /> {time}</span>
        </div>

        <div className={styles.grid}>
          {board.map((row, r) => (
            <div key={r} className={styles.row}>
              {row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`${styles.cell} ${cell.isRevealed ? styles.revealed : ''}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => toggleFlagEvent(e, r, c)}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb size={20} color={cell.isDetonated ? "#ef4444" : "#94a3b8"} />
                    ) : (
                      cell.neighborMines > 0 && (
                        <span style={{ color: getNumberColor(cell.neighborMines) }}>
                          {cell.neighborMines}
                        </span>
                      )
                    )
                  ) : (
                    cell.isFlagged && <Flag size={20} color="#f43f5e" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {(gameOver || win) && (
          <div className={styles.gameOverOverlay}>
            <div className={styles.overlayBox}>
              <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
                {win ? 'GRID SECURED!' : 'MINE DETONATED!'}
              </h2>
              <p>Time: {time}s</p>
              <p>XP Earned: {win ? '+100' : '+0'}</p>
              <button onClick={initEmptyBoard} className={styles.restartBtn}>Play Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridSweeper;
