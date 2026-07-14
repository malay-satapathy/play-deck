import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './Gravity4.module.css';

const ROWS = 6;
const COLS = 7;

type Player = 1 | 2; // 1: Red (User), 2: Yellow (AI)

const Gravity4: React.FC = () => {
  const [board, setBoard] = useState<number[][]>(() => Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  const [winningLine, setWinningLine] = useState<{r: number, c: number}[] | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  
  const { addXp } = useGlobalState();
  const isProcessingRef = useRef(false);

  const initGame = useCallback(() => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    setCurrentPlayer(1);
    setWinner(null);
    setWinningLine(null);
    isProcessingRef.current = false;
  }, []);

  const checkWin = (b: number[][], p: Player) => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] === p && b[r][c+1] === p && b[r][c+2] === p && b[r][c+3] === p) 
          return [{r, c}, {r, c: c+1}, {r, c: c+2}, {r, c: c+3}];
      }
    }
    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] === p && b[r+1][c] === p && b[r+2][c] === p && b[r+3][c] === p) 
          return [{r, c}, {r: r+1, c}, {r: r+2, c}, {r: r+3, c}];
      }
    }
    // Diagonal \
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] === p && b[r+1][c+1] === p && b[r+2][c+2] === p && b[r+3][c+3] === p) 
          return [{r, c}, {r: r+1, c: c+1}, {r: r+2, c: c+2}, {r: r+3, c: c+3}];
      }
    }
    // Diagonal /
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] === p && b[r-1][c+1] === p && b[r-2][c+2] === p && b[r-3][c+3] === p) 
          return [{r, c}, {r: r-1, c: c+1}, {r: r-2, c: c+2}, {r: r-3, c: c+3}];
      }
    }
    return null;
  };

  const getLowestEmptyRow = (b: number[][], col: number) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) return r;
    }
    return -1;
  };

  const dropToken = (col: number, player: Player, currentBoard: number[][]) => {
    const row = getLowestEmptyRow(currentBoard, col);
    if (row === -1) return null;

    const newBoard = currentBoard.map(r => [...r]);
    newBoard[row][col] = player;
    return newBoard;
  };

  const handleMoveResult = useCallback((newBoard: number[][], player: Player) => {
    setBoard(newBoard);
    
    const winLine = checkWin(newBoard, player);
    if (winLine) {
      setWinner(player);
      setWinningLine(winLine);
      if (player === 1) addXp(50);
      isProcessingRef.current = false;
      return;
    }
    
    // Check Draw
    if (newBoard[0].every(cell => cell !== 0)) {
      setWinner('DRAW');
      addXp(10);
      isProcessingRef.current = false;
      return;
    }

    // Switch player
    setCurrentPlayer(player === 1 ? 2 : 1);
    isProcessingRef.current = false;
  }, [addXp]);

  const handleColumnClick = (col: number) => {
    if (winner || currentPlayer !== 1 || isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    const newBoard = dropToken(col, 1, board);
    if (newBoard) {
      handleMoveResult(newBoard, 1);
    } else {
      isProcessingRef.current = false;
    }
  };

  useEffect(() => {
    if (currentPlayer === 2 && !winner) {
      isProcessingRef.current = true;
      const timeout = setTimeout(() => {
        let validCols = [];
        for (let c = 0; c < COLS; c++) {
          if (board[0][c] === 0) validCols.push(c);
        }
        
        if (validCols.length === 0) {
          isProcessingRef.current = false;
          return;
        }

        // Check if AI can win
        for (let c of validCols) {
          const tempBoard = dropToken(c, 2, board);
          if (tempBoard && checkWin(tempBoard, 2)) {
            handleMoveResult(tempBoard, 2);
            return;
          }
        }

        // Check if player might win and block
        for (let c of validCols) {
          const tempBoard = dropToken(c, 1, board);
          if (tempBoard && checkWin(tempBoard, 1)) {
            const nextBoard = dropToken(c, 2, board)!;
            handleMoveResult(nextBoard, 2);
            return;
          }
        }

        // Random
        const randomCol = validCols[Math.floor(Math.random() * validCols.length)];
        const newBoard = dropToken(randomCol, 2, board)!;
        handleMoveResult(newBoard, 2);

      }, 600); 
      return () => clearTimeout(timeout);
    }
  }, [currentPlayer, winner, board, handleMoveResult]);

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Gravity-4</h2>
          <div className={styles.turnIndicator}>
            Turn: <span className={currentPlayer === 1 ? styles.redText : styles.yellowText}>
              {currentPlayer === 1 ? 'Player' : 'AI Thinking...'}
            </span>
          </div>
        </div>

        <div className={styles.gridContainer}>
          <div className={styles.grid}>
            {Array.from({ length: COLS }).map((_, c) => (
              <div 
                key={c} 
                className={styles.column}
                onClick={() => handleColumnClick(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
              >
                {/* Ghost token indicator for hover */}
                <div className={styles.ghostCell}>
                  {(hoverCol === c && currentPlayer === 1 && !winner && board[0][c] === 0) && (
                    <div className={`${styles.cell} ${styles.red} ${styles.ghost}`} />
                  )}
                </div>

                {Array.from({ length: ROWS }).map((_, r) => {
                  const cell = board[r][c];
                  const isWinningToken = winningLine?.some(pos => pos.r === r && pos.c === c);
                  const dim = winner && winner !== 'DRAW' && !isWinningToken;

                  return (
                    <div key={`${r}-${c}`} className={styles.cellWrapper}>
                      <div className={`
                        ${styles.cell} 
                        ${cell === 1 ? styles.red : cell === 2 ? styles.yellow : ''} 
                        ${cell !== 0 ? styles.dropped : ''}
                        ${isWinningToken ? styles.pulse : ''}
                        ${dim ? styles.dimmed : ''}
                      `} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {winner && (
          <div className={styles.gameOverOverlay}>
            {winner === 'DRAW' ? (
              <h2 className={styles.drawText}>IT'S A DRAW!</h2>
            ) : (
              <h2 className={winner === 1 ? styles.redText : styles.yellowText}>
                {winner === 1 ? 'YOU WIN!' : 'AI WINS!'}
              </h2>
            )}
            <p>XP Earned: {winner === 1 ? '+50' : winner === 'DRAW' ? '+10' : '+0'}</p>
            <button onClick={initGame} className={styles.restartBtn}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gravity4;
