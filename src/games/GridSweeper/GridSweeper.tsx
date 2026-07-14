import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './GridSweeper.module.css';
import { Flag, Bomb } from 'lucide-react';

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
};

const GridSweeper: React.FC = () => {
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [flags, setFlags] = useState(MINES);
  
  const { addXp } = useGlobalState();

  const initBoard = useCallback(() => {
    let newBoard: Cell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      newBoard.push([]);
      for (let c = 0; c < COLS; c++) {
        newBoard[r].push({ r, c, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0 });
      }
    }

    // Place mines
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!newBoard[r][c].isMine) {
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

    setBoard(newBoard);
    setGameOver(false);
    setWin(false);
    setFlags(MINES);
  }, []);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  const revealCell = (r: number, c: number) => {
    if (gameOver || win || board[r][c].isRevealed || board[r][c].isFlagged) return;

    const newBoard = [...board];
    
    if (newBoard[r][c].isMine) {
      // Game Over
      newBoard.forEach(row => row.forEach(cell => {
        if (cell.isMine) cell.isRevealed = true;
      }));
      setBoard(newBoard);
      setGameOver(true);
      return;
    }

    // Flood fill algorithm for 0s
    const stack = [[r, c]];
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

    setBoard(newBoard);
    checkWin(newBoard);
  };

  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameOver || win || board[r][c].isRevealed) return;

    const newBoard = [...board];
    const cell = newBoard[r][c];

    if (!cell.isFlagged && flags > 0) {
      cell.isFlagged = true;
      setFlags(f => f - 1);
    } else if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlags(f => f + 1);
    }
    
    setBoard(newBoard);
    checkWin(newBoard);
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
      // Reveal all mines as flagged
      currBoard.forEach(row => row.forEach(cell => {
        if (cell.isMine) cell.isFlagged = true;
      }));
    }
  };

  const getNumberColor = (num: number) => {
    const colors = ['', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f97316', '#06b6d4', '#000000', '#64748b'];
    return colors[num] || '#fff';
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Grid-Sweeper</h2>
          <div className={styles.stats}>
            <span><Flag size={16} /> {flags}</span>
          </div>
        </div>

        <div className={styles.grid}>
          {board.map((row, r) => (
            <div key={r} className={styles.row}>
              {row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`${styles.cell} ${cell.isRevealed ? styles.revealed : ''}`}
                  onClick={() => revealCell(r, c)}
                  onContextMenu={(e) => toggleFlag(e, r, c)}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb size={20} color="#ef4444" />
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
            <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
              {win ? 'GRID SECURED!' : 'MINE DETONATED!'}
            </h2>
            <p>XP Earned: {win ? '+100' : '+0'}</p>
            <button onClick={initBoard} className={styles.restartBtn}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridSweeper;
