import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingScreen from './core/components/LoadingScreen';

// Lazy loaded Hub
const Hub = React.lazy(() => import('./pages/Hub/Hub'));

// Lazy loaded Games
const MergeStack = React.lazy(() => import('./games/MergeStack/MergeStack'));
const CosmicMiner = React.lazy(() => import('./games/CosmicMiner/CosmicMiner'));
const TypingDefender = React.lazy(() => import('./games/TypingDefender/TypingDefender'));
const GridlockEscape = React.lazy(() => import('./games/GridlockEscape/GridlockEscape'));
const NeonRider = React.lazy(() => import('./games/NeonRider/NeonRider'));
const TicTacToe = React.lazy(() => import('./games/TicTacToe/TicTacToe'));
const QuantumDice = React.lazy(() => import('./games/QuantumDice/QuantumDice'));
const CyberSnake = React.lazy(() => import('./games/CyberSnake/CyberSnake'));
const NeonPong = React.lazy(() => import('./games/NeonPong/NeonPong'));
const AstroStrike = React.lazy(() => import('./games/AstroStrike/AstroStrike'));
const BlockBuster = React.lazy(() => import('./games/BlockBuster/BlockBuster'));
const HoverJumper = React.lazy(() => import('./games/HoverJumper/HoverJumper'));
const MazeMuncher = React.lazy(() => import('./games/MazeMuncher/MazeMuncher'));
const TetraDrop = React.lazy(() => import('./games/TetraDrop/TetraDrop'));
const AsteroidBlaster = React.lazy(() => import('./games/AsteroidBlaster/AsteroidBlaster'));
const GridSweeper = React.lazy(() => import('./games/GridSweeper/GridSweeper'));
const RiverHopper = React.lazy(() => import('./games/RiverHopper/RiverHopper'));
const WordMaster = React.lazy(() => import('./games/WordMaster/WordMaster'));
const Gravity4 = React.lazy(() => import('./games/Gravity4/Gravity4'));
const MemorySeq = React.lazy(() => import('./games/MemorySeq/MemorySeq'));
const SpringNinja = React.lazy(() => import('./games/SpringNinja/SpringNinja'));
const CardFlip = React.lazy(() => import('./games/CardFlip/CardFlip'));

const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/game/merge-stack" element={<MergeStack />} />
        <Route path="/game/cosmic-miner" element={<CosmicMiner />} />
        <Route path="/game/typing-defender" element={<TypingDefender />} />
        <Route path="/game/gridlock-escape" element={<GridlockEscape />} />
        <Route path="/game/neon-rider" element={<NeonRider />} />
        <Route path="/game/tic-tac-toe" element={<TicTacToe />} />
        <Route path="/game/quantum-dice" element={<QuantumDice />} />
        
        <Route path="/game/cyber-snake" element={<CyberSnake />} />
        <Route path="/game/neon-pong" element={<NeonPong />} />
        <Route path="/game/astro-strike" element={<AstroStrike />} />
        <Route path="/game/block-buster" element={<BlockBuster />} />
        <Route path="/game/hover-jumper" element={<HoverJumper />} />
        <Route path="/game/maze-muncher" element={<MazeMuncher />} />
        <Route path="/game/tetra-drop" element={<TetraDrop />} />
        <Route path="/game/asteroid-blaster" element={<AsteroidBlaster />} />
        <Route path="/game/grid-sweeper" element={<GridSweeper />} />
        
        <Route path="/game/river-hopper" element={<RiverHopper />} />
        <Route path="/game/word-master" element={<WordMaster />} />
        <Route path="/game/gravity-4" element={<Gravity4 />} />
        <Route path="/game/memory-seq" element={<MemorySeq />} />
        <Route path="/game/spring-ninja" element={<SpringNinja />} />
        <Route path="/game/card-flip" element={<CardFlip />} />
      </Routes>
    </Suspense>
  );
};

export default App;
