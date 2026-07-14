# 🃏 Play-Deck Arcade

Welcome to the **Play-Deck Arcade**, a scalable, enterprise-grade web application that houses a dynamic collection of mini-games under a single, unified ecosystem. 

Play-Deck is deployed live here: **[Play-Deck Arcade](https://malay-satapathy.github.io/play-deck/)**

---

## 🏗 System Architecture & Design Brilliance

Play-Deck isn't just a collection of games; it's designed with a robust, scalable architecture that mimics enterprise software patterns. 

### 1. Modular "Plugin" Ecosystem
The application is structured to treat each game as an isolated module (or "plugin"). 
- **Isolation**: Changes in one game (`TicTacToe`) have absolutely zero impact on another (`QuantumDice`). 
- **Extensibility**: Adding a new game is as simple as dropping a new folder into `src/games/` and appending a single configuration object to the Main Hub. The system scales effortlessly whether there are 7 games or 52.

### 2. Centralized Global State Management
Instead of passing props down a deeply nested component tree, Play-Deck utilizes a centralized **Global Context Store** (`GlobalContext.tsx`).
- **Global XP System**: All games hook into the same context to award the player "Global XP".
- **Cross-game Progression**: A victory in *Merge the Stack* levels up your profile, which is immediately reflected in the Main Hub and carried over when you launch *Tic Tac Toe*. 

### 3. Separation of Concerns (SoC)
The codebase strictly adheres to SoC principles:
- **`core/`**: Houses shared infrastructure, generic UI components (like the Universal Back Button), and the global state management.
- **`pages/`**: Contains the routing logic and the central Hub dashboard.
- **`games/`**: Contains the highly encapsulated logic, state, and CSS modules unique to each individual game.

### 4. Responsive & Adaptive UI Architecture
- **CSS Modules**: Every game utilizes CSS Modules (`Game.module.css`) to prevent global namespace pollution. A `.header` class in *Neon Rider* will never clash with a `.header` class in *Cosmic Miner*.
- **Device Agnostic**: The UI leverages CSS Grid, Flexbox, and Media Queries to ensure a flawless experience. Elements dynamically adapt—for instance, desktop games use keyboard controls, while mobile devices automatically render touch-based DPADs.
- **Glassmorphism Design System**: The UI utilizes a premium glassmorphic design language, featuring layered blurs (`backdrop-filter`), smooth CSS 3D transforms, and deep gradient backgrounds.

---

## 🎮 The Games Directory

Play-Deck currently features **7 encapsulated games**:

1. **Merge the Stack**: A 2048-inspired puzzle game focused on merging tech stacks.
2. **Cosmic Miner**: A strategic resource clicker where you mine for points while managing energy.
3. **Typing Defender**: An action typing game where you defend your base by typing out enemy words.
4. **Gridlock Escape**: A maze navigation game requiring you to reach the exit within a time limit.
5. **Neon Rider**: An endless runner where you dodge incoming obstacles at increasing speeds.
6. **Tic Tac Toe**: The classic grid game, featuring a smart 1-Player Bot and 2-Player local co-op.
7. **Quantum Dice**: A casino-style prediction game featuring a fully 3D CSS-rendered spinning cube.

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/malay-satapathy/play-deck.git

# Navigate to the directory
cd play-deck

# Install dependencies
npm install

# Start the development server
npm run dev
```

*Built with React, TypeScript, and Vite.*
