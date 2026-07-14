# 🃏 Play-Deck Arcade

Welcome to the **Play-Deck Arcade**, a scalable, enterprise-grade web application that houses a dynamic collection of mini-games under a single, unified ecosystem. 

Play-Deck is deployed live here: **[Play-Deck Arcade](https://malay-satapathy.github.io/play-deck/)**

---

## 🏗 System Architecture & Design Brilliance

Play-Deck isn't just a collection of games; it's designed with a robust, scalable architecture that mimics enterprise software patterns. 

### 1. Modular "Plugin" Ecosystem
The application is structured to treat each game as an isolated module (or "plugin"). 
- **Isolation**: Changes in one game (`TicTacToe`) have absolutely zero impact on another (`QuantumDice`). 
- **Extensibility**: Adding a new game is as simple as dropping a new folder into `src/games/` and appending a single configuration object to the Main Hub. The system scales effortlessly—demonstrated by scaling from 7 to an incredible **22 games** within the exact same architecture.

### 2. Centralized Global State Management
Instead of passing props down a deeply nested component tree, Play-Deck utilizes a centralized **Global Context Store** (`GlobalContext.tsx`).
- **Global XP System**: All games hook into the same context to award the player "Global XP".
- **Cross-game Progression**: A victory in *Tetra-Drop* levels up your profile, which is immediately reflected in the Main Hub and carried over when you launch *Tic Tac Toe*. 

### 3. Separation of Concerns (SoC)
The codebase strictly adheres to SoC principles:
- **`core/`**: Houses shared infrastructure, generic UI components (like the Universal Back Button), and the global state management.
- **`pages/`**: Contains the routing logic and the central Hub dashboard.
- **`games/`**: Contains the highly encapsulated logic, state, and CSS modules unique to each individual game.

### 4. Responsive & Adaptive UI Architecture
- **CSS Modules**: Every game utilizes CSS Modules (`Game.module.css`) to prevent global namespace pollution. A `.header` class in *Neon Rider* will never clash with a `.header` class in *Cosmic Miner*.
- **Device Agnostic**: The UI leverages CSS Grid, Flexbox, and Media Queries to ensure a flawless experience. Elements dynamically adapt—for instance, desktop games use keyboard controls, while mobile devices automatically render touch-based DPADs and controls.
- **Glassmorphism Design System**: The UI utilizes a premium glassmorphic design language, featuring layered blurs (`backdrop-filter`), smooth CSS 3D transforms, and deep gradient backgrounds.

---

## 🎮 The Massive Games Directory (22 Games)

Play-Deck currently features **22 encapsulated games**, carefully ranked in the Hub by global popularity and legacy:

### The Arcade Classics
1. **Tetra-Drop**: The world's most famous falling block puzzle. Clear lines to survive.
2. **Maze-Muncher**: The iconic dot-eating, ghost-dodging arcade legend.
3. **Astro-Strike**: Defend earth from descending alien invaders.
4. **Cyber-Snake**: The classic Nokia-era snake game with a neon twist.
5. **Neon-Pong**: The grandfather of gaming. Bounce the ball past your opponent.
6. **Asteroid-Blaster**: Thrust through space and blast rocks into smaller pieces.
7. **Block-Buster**: Bounce the ball to break all the colored bricks.
8. **Grid-Sweeper**: Use logic to flag hidden mines without detonating them.

### Modern & Casual Legends
9. **Hover-Jumper**: Tap to flap and dodge the endless pipes.
10. **River-Hopper**: Dodge cars and ride logs to cross the deadly river.
11. **Word-Master**: Guess the secret 5-letter word in 6 tries.
12. **Gravity-4**: Drop tokens to connect 4 in a row before the AI.
13. **Tic Tac Toe**: The classic grid game. Play vs Bot or Local 2P.
14. **Memory-Seq**: Repeat the flashing light and sound sequences.
15. **Card-Flip**: Flip cards and find the matching pairs.
16. **Spring-Ninja**: Bounce infinitely higher on generated platforms.

### Indie Originals
17. **Merge the Stack**: A 2048-inspired puzzle game focused on merging tech stacks.
18. **Cosmic Miner**: A strategic resource clicker where you mine for points while managing energy.
19. **Typing Defender**: An action typing game where you defend your base by typing out enemy words.
20. **Gridlock Escape**: A maze navigation game requiring you to reach the exit within a time limit.
21. **Neon Rider**: An endless runner where you dodge incoming obstacles at increasing speeds.
22. **Quantum Dice**: A casino-style prediction game featuring a fully 3D CSS-rendered spinning cube.

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
