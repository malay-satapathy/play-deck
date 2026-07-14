import React from 'react';
import DeckCard from '../../core/components/DeckCard';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './Hub.module.css';
import { 
  Gamepad2, Ghost, Rocket, Bug, ScanLine, Crosshair, Shapes, Bomb, 
  Wind, Navigation, Type, ArrowDownToLine, Music, Hash, Layers, 
  Pickaxe, Keyboard, Grid, Dices, ArrowUpToLine, Shuffle
} from 'lucide-react';

const GAMES = [
  {
    id: 'maze-muncher',
    name: 'Maze-Muncher',
    description: 'The iconic dot-eating, ghost-dodging arcade legend.',
    gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
    icon: <Ghost size={48} color="white" />,
    suit: '♥', rank: 'K', color: '#ef4444'
  },
  {
    id: 'tetra-drop',
    name: 'Tetra-Drop',
    description: 'The world\'s most famous falling block puzzle. Clear lines to survive.',
    gradient: 'linear-gradient(135deg, #a855f7, #7e22ce)',
    icon: <Shapes size={48} color="white" />,
    suit: '♠', rank: 'A', color: '#f8fafc'
  },
  {
    id: 'cyber-snake',
    name: 'Cyber-Snake',
    description: 'The classic Nokia-era snake game with a neon twist.',
    gradient: 'linear-gradient(135deg, #22c55e, #15803d)',
    icon: <Bug size={48} color="white" />,
    suit: '♦', rank: 'J', color: '#ef4444'
  },
  {
    id: 'astro-strike',
    name: 'Astro-Strike',
    description: 'Defend earth from descending alien invaders.',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    icon: <Rocket size={48} color="white" />,
    suit: '♣', rank: 'Q', color: '#f8fafc'
  },
  {
    id: 'neon-pong',
    name: 'Neon-Pong',
    description: 'The grandfather of gaming. Bounce the ball past your opponent.',
    gradient: 'linear-gradient(135deg, #ec4899, #be185d)',
    icon: <ScanLine size={48} color="white" />,
    suit: '♠', rank: '10', color: '#f8fafc'
  },
  {
    id: 'asteroid-blaster',
    name: 'Asteroid-Blaster',
    description: 'Thrust through space and blast rocks into smaller pieces.',
    gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    icon: <Crosshair size={48} color="white" />,
    suit: '♥', rank: '9', color: '#ef4444'
  },
  {
    id: 'grid-sweeper',
    name: 'Grid-Sweeper',
    description: 'Use logic to flag hidden mines without detonating them.',
    gradient: 'linear-gradient(135deg, #94a3b8, #475569)',
    icon: <Bomb size={48} color="white" />,
    suit: '♦', rank: '7', color: '#ef4444'
  },
  {
    id: 'gravity-4',
    name: 'Gravity-4',
    description: 'Drop tokens to connect 4 in a row before the AI.',
    gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    icon: <ArrowDownToLine size={48} color="white" />,
    suit: '♦', rank: '3', color: '#ef4444'
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    description: 'The classic grid game. Play vs Bot or Local 2P.',
    gradient: 'linear-gradient(135deg, #14b8a6, #0f766e)',
    icon: <Hash size={48} color="white" />,
    suit: '♠', rank: '2', color: '#f8fafc'
  },
  {
    id: 'memory-seq',
    name: 'Memory-Seq',
    description: 'Repeat the flashing light and sound sequences.',
    gradient: 'linear-gradient(135deg, #1e293b, #020617)',
    icon: <Music size={48} color="white" />,
    suit: '♥', rank: 'A', color: '#ef4444'
  },
  {
    id: 'block-buster',
    name: 'Block-Buster',
    description: 'Bounce the ball to break all the colored bricks.',
    gradient: 'linear-gradient(135deg, #38bdf8, #0369a1)',
    icon: <Gamepad2 size={48} color="white" />,
    suit: '♣', rank: '8', color: '#f8fafc'
  },
  {
    id: 'hover-jumper',
    name: 'Hover-Jumper',
    description: 'Tap to flap and dodge the endless pipes.',
    gradient: 'linear-gradient(135deg, #f472b6, #db2777)',
    icon: <Wind size={48} color="white" />,
    suit: '♠', rank: '6', color: '#f8fafc'
  },
  {
    id: 'river-hopper',
    name: 'River-Hopper',
    description: 'Dodge cars and ride logs to cross the deadly river.',
    gradient: 'linear-gradient(135deg, #4ade80, #16a34a)',
    icon: <Navigation size={48} color="white" />,
    suit: '♥', rank: '5', color: '#ef4444'
  },
  {
    id: 'word-master',
    name: 'Word-Master',
    description: 'Guess the secret 5-letter word in 6 tries.',
    gradient: 'linear-gradient(135deg, #64748b, #334155)',
    icon: <Type size={48} color="white" />,
    suit: '♣', rank: '4', color: '#f8fafc'
  },
  {
    id: 'spring-ninja',
    name: 'Spring-Ninja',
    description: 'Bounce infinitely higher on generated platforms.',
    gradient: 'linear-gradient(135deg, #4c1d95, #312e81)',
    icon: <ArrowUpToLine size={48} color="white" />,
    suit: '♦', rank: 'Q', color: '#ef4444'
  },
  {
    id: 'card-flip',
    name: 'Card-Flip',
    description: 'Flip cards and find the matching pairs.',
    gradient: 'linear-gradient(135deg, #c084fc, #9333ea)',
    icon: <Shuffle size={48} color="white" />,
    suit: '♣', rank: 'K', color: '#f8fafc'
  },
  // Original indie games
  {
    id: 'merge-stack',
    name: 'Merge the Stack',
    description: 'Combine tech to build the ultimate web app.',
    gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    icon: <Layers size={48} color="white" />,
    suit: '♠', rank: 'J', color: '#f8fafc'
  },
  {
    id: 'cosmic-miner',
    name: 'Cosmic Miner',
    description: 'Build an idle space empire from scratch.',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    icon: <Pickaxe size={48} color="white" />,
    suit: '♥', rank: '10', color: '#ef4444'
  },
  {
    id: 'typing-defender',
    name: 'Typing Defender',
    description: 'Defend the mainframe by typing fast.',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    icon: <Keyboard size={48} color="white" />,
    suit: '♣', rank: '9', color: '#f8fafc'
  },
  {
    id: 'gridlock-escape',
    name: 'Gridlock Escape',
    description: 'Navigate the disappearing grid to escape.',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    icon: <Grid size={48} color="white" />,
    suit: '♦', rank: '8', color: '#ef4444'
  },
  {
    id: 'neon-rider',
    name: 'Neon Rider',
    description: 'Dodge obstacles in an endless synthwave runner.',
    gradient: 'linear-gradient(135deg, #ec4899, #be185d)',
    icon: <Rocket size={48} color="white" />,
    suit: '♠', rank: '7', color: '#f8fafc'
  },
  {
    id: 'quantum-dice',
    name: 'Quantum Dice',
    description: 'Predict the roll of a 3D quantum cube.',
    gradient: 'linear-gradient(135deg, #f43f5e, #be123c)',
    icon: <Dices size={48} color="white" />,
    suit: '♥', rank: '6', color: '#ef4444'
  }
];

const Hub: React.FC = () => {
  const { level, globalXp } = useGlobalState();

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.hubTitle}>Play-Deck</h1>
          <p className={styles.hubSubtitle}>The Ultimate Web Arcade (22 Games)</p>
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
        {GAMES.map((game, index) => (
          <DeckCard key={game.id} {...game} index={index} />
        ))}
      </main>
    </div>
  );
};

export default Hub;
