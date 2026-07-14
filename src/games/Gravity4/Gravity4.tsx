import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './Gravity4.module.css';

const ROWS = 6;
const COLS = 7;

type Player = 1 | 2; // 1: Red (User), 2: Yellow (AI)

const Gravity4: React.FC = () => {
  const [board, setBoard] = useState<number[][]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  
  const { addXp } = useGlobalState();

  const initGame = useCallback(() => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    setCurrentPlayer(1);
    setWinner(null);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkWin = (b: number[][], p: Player) => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] === p && b[r][c+1] === p && b[r][c+2] === p && b[r][c+3] === p) return true;
      }
    }
    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] === p && b[r+1][c] === p && b[r+2][c] === p && b[r+3][c] === p) return true;
      }
    }
    // Diagonal \
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] === p && b[r+1][c+1] === p && b[r+2][c+2] === p && b[r+3][c+3] === p) return true;
      }
    }
    // Diagonal /
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] === p && b[r-1][c+1] === p && b[r-2][c+2] === p && b[r-3][c+3] === p) return true;
      }
    }
    return false;
  };

  const getLowestEmptyRow = (b: number[][], col: number) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) return r;
    }
    return -1;
  };

  const dropToken = (col: number, player: Player, currentBoard: number[][]) => {
    const row = getLowestEmptyRow(currentBoard, col);
    if (row === -1) return null; // column full

    const newBoard = currentBoard.map(r => [...r]);
    newBoard[row][col] = player;
    return newBoard;
  };

  const aiMove = useCallback((currentBoard: number[][]) => {
    // Very simple AI: random valid column
    let validCols = [];
    for (let c = 0; c < COLS; c++) {
      if (currentBoard[0][c] === 0) validCols.push(c);
    }
    
    if (validCols.length === 0) return; // Draw
    
    // Check if AI can win
    for (let c of validCols) {
      const tempBoard = dropToken(c, 2, currentBoard);
      if (tempBoard && checkWin(tempBoard, 2)) {
        handleMoveResult(tempBoard, 2);
        return;
      }
    }

    // Check if player might win and block
    for (let c of validCols) {
      const tempBoard = dropToken(c, 1, currentBoard);
      if (tempBoard && checkWin(tempBoard, 1)) {
        const nextBoard = dropToken(c, 2, currentBoard)!;
        handleMoveResult(nextBoard, 2);
        return;
      }
    }

    // Random
    const randomCol = validCols[Math.floor(Math.random() * validCols.length)];
    const newBoard = dropToken(randomCol, 2, currentBoard)!;
    handleMoveResult(newBoard, 2);
  }, []);

  const handleMoveResult = (newBoard: number[][], player: Player) => {
    setBoard(newBoard);
    
    if (checkWin(newBoard, player)) {
      setWinner(player);
      if (player === 1) addXp(50);
      return;
    }
    
    // Check Draw
    if (newBoard[0].every(cell => cell !== 0)) {
      setWinner('DRAW');
      addXp(10);
      return;
    }

    // Switch player
    setCurrentPlayer(player === 1 ? 2 : 1);
  };

  const handleColumnClick = (col: number) => {
    if (winner || currentPlayer !== 1) return;
    
    const newBoard = dropToken(col, 1, board);
    if (newBoard) {
      handleMoveResult(newBoard, 1);
    }
  };

  useEffect(() => {
    if (currentPlayer === 2 && !winner) {
      const timeout = setTimeout(() => aiMove(board), 500); // slight delay for feel
      return () => clearTimeout(timeout);
    }
  }, [currentPlayer, winner, board, aiMove]);

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Gravity-4</h2>
          <div className={styles.turnIndicator}>
            Turn: <span className={currentPlayer === 1 ? styles.redText : styles.yellowText}>
              {currentPlayer === 1 ? 'Player' : 'AI'}
            </span>
          </div>
        </div>

        <div className={styles.gridContainer}>
          <div className={styles.grid}>
            {board.map((row, r) => (
              row.map((cell, c) => (
                <div 
                  key={`${r}-${c}`} 
                  className={styles.cellWrapper}
                  onClick={() => handleColumnClick(c)}
                >
                  <div className={`${styles.cell} ${cell === 1 ? styles.red : cell === 2 ? styles.yellow : ''}`} />
                </div>
              ))
            ))}
          </div>
        </div>

        {winner && (
          <div className={styles.gameOverOverlay}>
            {winner === 'DRAW' ? (
              <h2 style={{ color: '#94a3b8' }}>IT'S A DRAW!</h2>
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
