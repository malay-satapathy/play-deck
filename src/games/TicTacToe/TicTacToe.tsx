import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './TicTacToe.module.css';
import { User, Cpu, Users } from 'lucide-react';

type Player = 'X' | 'O' | null;
type Mode = '1P' | '2P' | null;

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

const TicTacToe: React.FC = () => {
  const [mode, setMode] = useState<Mode>(null);
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  
  const { addXp } = useGlobalState();

  const checkWinner = (squares: Player[]) => {
    for (let i = 0; i < WINNING_COMBOS.length; i++) {
      const [a, b, c] = WINNING_COMBOS[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every(s => s !== null)) return 'DRAW';
    return null;
  };

  const getBestMove = (squares: Player[], player: Player): number => {
    // 1. Can we win?
    for (let i = 0; i < WINNING_COMBOS.length; i++) {
      const [a, b, c] = WINNING_COMBOS[i];
      if (squares[a] === player && squares[b] === player && squares[c] === null) return c;
      if (squares[a] === player && squares[c] === player && squares[b] === null) return b;
      if (squares[b] === player && squares[c] === player && squares[a] === null) return a;
    }
    
    // 2. Do we need to block?
    const opp = player === 'X' ? 'O' : 'X';
    for (let i = 0; i < WINNING_COMBOS.length; i++) {
      const [a, b, c] = WINNING_COMBOS[i];
      if (squares[a] === opp && squares[b] === opp && squares[c] === null) return c;
      if (squares[a] === opp && squares[c] === opp && squares[b] === null) return b;
      if (squares[b] === opp && squares[c] === opp && squares[a] === null) return a;
    }

    // 3. Take center
    if (squares[4] === null) return 4;

    // 4. Take random available
    const available = squares.map((s, i) => s === null ? i : null).filter(s => s !== null) as number[];
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleCellClick = useCallback((index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    
    const win = checkWinner(newBoard);
    if (win) {
      setWinner(win);
      if (win === 'X') addXp(10);
      else if (win === 'O' && mode === '2P') addXp(10);
      else if (win === 'DRAW') addXp(2);
      return;
    }

    setXIsNext(!xIsNext);
  }, [board, winner, xIsNext, mode, addXp]);

  // Bot logic
  useEffect(() => {
    if (mode === '1P' && !xIsNext && !winner) {
      const timer = setTimeout(() => {
        const move = getBestMove(board, 'O');
        if (move !== undefined) {
          const newBoard = [...board];
          newBoard[move] = 'O';
          setBoard(newBoard);
          
          const win = checkWinner(newBoard);
          if (win) {
            setWinner(win);
            if (win === 'DRAW') addXp(2);
          } else {
            setXIsNext(true);
          }
        }
      }, 500); // add slight delay for realism
      return () => clearTimeout(timer);
    }
  }, [xIsNext, mode, board, winner, addXp]);

  const restart = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setWinner(null);
  };

  if (!mode) {
    return (
      <div className={styles.gameContainer}>
        <BackButton />
        <div className={styles.menuBox}>
          <h1>Tic Tac Toe</h1>
          <p>Select Game Mode</p>
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

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>{mode === '1P' ? 'Player vs Bot' : 'Player vs Player'}</h2>
          <div className={styles.status}>
            {winner ? (
              winner === 'DRAW' ? "It's a Draw!" : `Winner: ${winner}!`
            ) : (
              `Turn: ${xIsNext ? 'X' : 'O'} ${mode === '1P' && !xIsNext ? '(Thinking...)' : ''}`
            )}
          </div>
        </div>

        <div className={styles.grid}>
          {board.map((cell, i) => (
            <button 
              key={i} 
              className={`${styles.cell} ${cell ? styles[cell.toLowerCase()] : ''}`}
              onClick={() => handleCellClick(i)}
              disabled={!!cell || !!winner || (mode === '1P' && !xIsNext)}
            >
              {cell}
            </button>
          ))}
        </div>

        {(winner || board.every(c => c !== null)) && (
          <button onClick={restart} className={styles.restartBtn}>Play Again</button>
        )}
        <button onClick={() => { setMode(null); restart(); }} className={styles.menuReturnBtn}>Main Menu</button>
      </div>
    </div>
  );
};

export default TicTacToe;
