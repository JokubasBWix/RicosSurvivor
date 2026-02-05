# Typing Asteroids

A 360-degree typing shooter game built with TypeScript and HTML5 Canvas.

## How to Play

- You are the tree stump (white circle) in the center
- Nails with words approach from all directions (360°)
- Type the words to destroy nails before they hit you
- If a nail touches you, it's game over!

## Features

- **360° Gameplay**: Enemies spawn from all angles
- **TypeScript**: Full type safety and better code organization
- **Modular Architecture**: Clean separation of concerns
  - Entities (TreeStump, Nail, future enemies)
  - Game logic
  - Input management
  - Collision detection
  - Asset management (images, sounds)
- **Collision Detection**: Real-time circle-to-circle collision
- **Extensible**: Easy to add new enemy types

## Project Structure

```
src/
├── assets/        # Game assets
│   ├── images/    # Image files
│   └── sounds/    # Sound files
├── entities/      # Game entities (TreeStump, Nail, etc.)
├── game/          # Core game logic and managers
├── utils/         # Utility functions (collision, etc.)
├── types/         # TypeScript type definitions
└── main.ts        # Entry point
public/
└── assets/        # Public assets (accessible via URL)
    ├── images/
    └── sounds/
```

## Local Development

1. Install dependencies:
```bash
yarn install
```

2. Run dev server:
```bash
yarn dev
```

3. Build for production:
```bash
yarn build
```

## Deploy to Vercel

1. Push to GitHub:
```bash
git add .
git commit -m "Typing shooter game"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. Deploy on Vercel:
   - Go to [vercel.com](https://vercel.com)
   - New Project → Select repo
   - Framework: Vite
   - Deploy!

## Tech Stack

- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Yarn** - Package management
- **HTML5 Canvas** - Rendering
- **ES Modules** - Modern JavaScript

## Future Enhancements

- Different enemy types (fast, slow, zigzag)
- Power-ups
- Lives system
- Difficulty progression
- Sound effects
- Particle effects
