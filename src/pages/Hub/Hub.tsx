import React from 'react';
import DeckCard from '../../core/components/DeckCard';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './Hub.module.css';
import { Layers, Pickaxe, Keyboard, Grid, Rocket, Hash, Dices } from 'lucide-react';

const GAMES = [
  {
    id: 'merge-stack',
    name: 'Merge the Stack',
    description: 'Combine tech to build the ultimate web app.',
    gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    icon: <Layers size={48} color="white" />,
    suit: '♠',
    rank: 'A',
    color: '#f8fafc'
  },
  {
    id: 'cosmic-miner',
    name: 'Cosmic Miner',
    description: 'Build an idle space empire from scratch.',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    icon: <Pickaxe size={48} color="white" />,
    suit: '♥',
    rank: 'K',
    color: '#ef4444'
  },
  {
    id: 'typing-defender',
    name: 'Typing Defender',
    description: 'Defend the mainframe by typing fast.',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    icon: <Keyboard size={48} color="white" />,
    suit: '♣',
    rank: 'Q',
    color: '#f8fafc'
  },
  {
    id: 'gridlock-escape',
    name: 'Gridlock Escape',
    description: 'Navigate the disappearing grid to escape.',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    icon: <Grid size={48} color="white" />,
    suit: '♦',
    rank: 'J',
    color: '#ef4444'
  },
  {
    id: 'neon-rider',
    name: 'Neon Rider',
    description: 'Dodge obstacles in an endless synthwave runner.',
    gradient: 'linear-gradient(135deg, #ec4899, #be185d)',
    icon: <Rocket size={48} color="white" />,
    suit: '♠',
    rank: '10',
    color: '#f8fafc'
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    description: 'The classic grid game. Play vs Bot or Local 2P.',
    gradient: 'linear-gradient(135deg, #14b8a6, #0f766e)',
    icon: <Hash size={48} color="white" />,
    suit: '♣',
    rank: '2',
    color: '#f8fafc'
  },
  {
    id: 'quantum-dice',
    name: 'Quantum Dice',
    description: 'Predict the roll of a 3D quantum cube.',
    gradient: 'linear-gradient(135deg, #f43f5e, #be123c)',
    icon: <Dices size={48} color="white" />,
    suit: '♦',
    rank: '7',
    color: '#ef4444'
  }
];

const Hub: React.FC = () => {
  const { level, globalXp } = useGlobalState();

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.hubTitle}>Play-Deck</h1>
          <p className={styles.hubSubtitle}>Your Digital Web Arcade</p>
        </div>
        <div className={`${styles.statsPanel} glass-panel`}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Level</span>
            <span className={styles.statValue}>{level}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Total XP</span>
            <span className={styles.statValue}>{globalXp}</span>
          </div>
        </div>
      </header>
      
      <main className={styles.deckGrid}>
        {GAMES.map(game => (
          <DeckCard key={game.id} {...game} />
        ))}
      </main>
    </div>
  );
};

export default Hub;
