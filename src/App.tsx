import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub/Hub';
import MergeStack from './games/MergeStack/MergeStack';
import CosmicMiner from './games/CosmicMiner/CosmicMiner';
import TypingDefender from './games/TypingDefender/TypingDefender';
import GridlockEscape from './games/GridlockEscape/GridlockEscape';
import NeonRider from './games/NeonRider/NeonRider';
import TicTacToe from './games/TicTacToe/TicTacToe';
import QuantumDice from './games/QuantumDice/QuantumDice';
import CyberSnake from './games/CyberSnake/CyberSnake';
import NeonPong from './games/NeonPong/NeonPong';
import AstroStrike from './games/AstroStrike/AstroStrike';
import BlockBuster from './games/BlockBuster/BlockBuster';
import HoverJumper from './games/HoverJumper/HoverJumper';
import MazeMuncher from './games/MazeMuncher/MazeMuncher';
import TetraDrop from './games/TetraDrop/TetraDrop';
import AsteroidBlaster from './games/AsteroidBlaster/AsteroidBlaster';
import GridSweeper from './games/GridSweeper/GridSweeper';
import RiverHopper from './games/RiverHopper/RiverHopper';
import WordMaster from './games/WordMaster/WordMaster';
import Gravity4 from './games/Gravity4/Gravity4';
import MemorySeq from './games/MemorySeq/MemorySeq';
import SpringNinja from './games/SpringNinja/SpringNinja';
import CardFlip from './games/CardFlip/CardFlip';

const App: React.FC = () => {
  return (
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
  );
};

export default App;
