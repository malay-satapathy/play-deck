import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './TicTacToe.module.css';
import { Cpu, Users } from 'lucide-react';

type Player = 'X' | 'O' | null;
type Mode = '1P' | '2P' | null;

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

interface GameState {
  board: Player[];
  xIsNext: boolean;
  winner: Player | 'DRAW' | null;
  winningCombo: number[] | null;
}

const TicTacToe: React.FC = () => {
  const [mode, setMode] = useState<Mode>(null);
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    xIsNext: true,
    winner: null,
    winningCombo: null
  });
  
  const { addXp } = useGlobalState();

  const checkWinner = (squares: Player[]) => {
    for (let i = 0; i < WINNING_COMBOS.length; i++) {
      const [a, b, c] = WINNING_COMBOS[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { player: squares[a], combo: [a, b, c] };
      }
    }
    if (squares.every(s => s !== null)) return { player: 'DRAW' as const, combo: null };
    return null;
  };

  const getBestMove = (squares: Player[], player: Player): number | undefined => {
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
    if (available.length === 0) return undefined;
    return available[Math.floor(Math.random() * available.length)];
  };

  const processMove = useCallback((index: number, player: Player, currentMode: Mode, xpAdder: typeof addXp) => {
    setGameState(prev => {
      // Guard against multiple clicks or state desync
      if (prev.board[index] || prev.winner || (currentMode === '1P' && player === 'X' && !prev.xIsNext)) {
        return prev;
      }

      const newBoard = [...prev.board];
      newBoard[index] = player;
      
      const winResult = checkWinner(newBoard);
      if (winResult) {
        // Award XP
        if (winResult.player === 'X') setTimeout(() => xpAdder(10), 0);
        else if (winResult.player === 'O' && currentMode === '2P') setTimeout(() => xpAdder(10), 0);
        else if (winResult.player === 'DRAW') setTimeout(() => xpAdder(2), 0);

        return {
          ...prev,
          board: newBoard,
          winner: winResult.player,
          winningCombo: winResult.combo
        };
      }

      return {
        ...prev,
        board: newBoard,
        xIsNext: !prev.xIsNext
      };
    });
  }, []);

  const handleCellClick = (index: number) => {
    processMove(index, gameState.xIsNext ? 'X' : 'O', mode, addXp);
  };

  // Bot logic
  useEffect(() => {
    if (mode === '1P' && !gameState.xIsNext && !gameState.winner) {
      const timer = setTimeout(() => {
        setGameState(prev => {
          if (prev.winner || prev.xIsNext) return prev; // Guard
          
          const move = getBestMove(prev.board, 'O');
          if (move !== undefined) {
            const newBoard = [...prev.board];
            newBoard[move] = 'O';
            
            const winResult = checkWinner(newBoard);
            if (winResult) {
              if (winResult.player === 'DRAW') addXp(2);
              return {
                ...prev,
                board: newBoard,
                winner: winResult.player,
                winningCombo: winResult.combo
              };
            }
            
            return {
              ...prev,
              board: newBoard,
              xIsNext: true
            };
          }
          return prev;
        });
      }, 600); // slight delay for realism
      return () => clearTimeout(timer);
    }
  }, [gameState.xIsNext, gameState.winner, mode, addXp]);

  const restart = () => {
    setGameState({
      board: Array(9).fill(null),
      xIsNext: true,
      winner: null,
      winningCombo: null
    });
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
            {gameState.winner ? (
              gameState.winner === 'DRAW' ? "It's a Draw!" : `Winner: ${gameState.winner}!`
            ) : (
              <span className={styles.turnText}>
                Turn: {gameState.xIsNext ? 'X' : 'O'} 
                {mode === '1P' && !gameState.xIsNext && <span className={styles.thinking}> Thinking</span>}
              </span>
            )}
          </div>
        </div>

        <div className={styles.grid} data-turn={gameState.xIsNext ? 'X' : 'O'}>
          {gameState.board.map((cell, i) => {
            const isWinningCell = gameState.winningCombo?.includes(i);
            return (
              <button 
                key={i} 
                className={`
                  ${styles.cell} 
                  ${cell ? styles[cell.toLowerCase()] : ''} 
                  ${isWinningCell ? styles.winningCell : ''}
                  ${cell ? styles.popIn : ''}
                `}
                onClick={() => handleCellClick(i)}
                disabled={!!cell || !!gameState.winner || (mode === '1P' && !gameState.xIsNext)}
                aria-label={`Cell ${i}, ${cell ? 'Occupied by ' + cell : 'Empty'}`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        {(gameState.winner || gameState.board.every(c => c !== null)) && (
          <button onClick={restart} className={styles.restartBtn}>Play Again</button>
        )}
        <button onClick={() => { setMode(null); restart(); }} className={styles.menuReturnBtn}>Main Menu</button>
      </div>
    </div>
  );
};

export default TicTacToe;
