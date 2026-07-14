import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GlobalProvider } from './core/store/GlobalContext';
import Hub from './pages/Hub/Hub';

import MergeStack from './games/MergeStack/MergeStack';
import CosmicMiner from './games/CosmicMiner/CosmicMiner';
import TypingDefender from './games/TypingDefender/TypingDefender';
import GridlockEscape from './games/GridlockEscape/GridlockEscape';
import NeonRider from './games/NeonRider/NeonRider';
import TicTacToe from './games/TicTacToe/TicTacToe';
import QuantumDice from './games/QuantumDice/QuantumDice';

const App: React.FC = () => {
  return (
    <GlobalProvider>
      <Router basename="/play-deck/">
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/game/merge-stack" element={<MergeStack />} />
          <Route path="/game/cosmic-miner" element={<CosmicMiner />} />
          <Route path="/game/typing-defender" element={<TypingDefender />} />
          <Route path="/game/gridlock-escape" element={<GridlockEscape />} />
          <Route path="/game/neon-rider" element={<NeonRider />} />
          <Route path="/game/tic-tac-toe" element={<TicTacToe />} />
          <Route path="/game/quantum-dice" element={<QuantumDice />} />
        </Routes>
      </Router>
    </GlobalProvider>
  );
};

export default App;
