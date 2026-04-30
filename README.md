# WordQuest

WordQuest is a polished browser-based word search puzzle game built with plain HTML, CSS, and JavaScript. Players choose from three difficulty levels, search for hidden words in a dynamic letter grid, and earn coins, streak rewards, and level bonuses as they progress.

## Features

- Three difficulty modes: Easy, Medium, Hard
- Dynamic word search grid with hidden words
- Word list panel showing found and remaining words
- Level completion modal displaying score, time, and coin rewards
- Hint system with a confirmation popup and temporary word reveal
- Daily reward popup with streak tracking and bonus coins
- Responsive, modern UI with animated overlays, buttons, and particle effects
- Local storage save support for coins, score, streaks, and progress
- Built with no external libraries

## Files

- `word.html` — game layout and user interface
- `word_style.css` — styles, theme, and animations
- `script.js` — game logic, grid generation, scoring, and UI interactions

## How to run locally

1. Open the project folder in your browser.
2. Open `word.html` directly, or use a simple local server for best compatibility.

### Run with a simple local server

If you have Python installed, run:

```bash
cd c:\Users\bhava\GAME\WORD_SEARCH
python -m http.server 8000
```

Then open `http://localhost:8000/word.html` in your browser.

## Gameplay

1. Choose a difficulty level from the selection screen.
2. Search the grid for the listed words.
3. Select words by dragging or clicking letters.
4. Earn coins and score for each completed level.
5. Use hints if you need help finding a word.
6. Claim daily rewards and build your streak over time.

## Notes

- The game stores progress in browser `localStorage`.
- Close and reopen the browser to continue from your saved progress.
- The UI is designed to be easily extended with new words, levels, and game mechanics.

## License

This project is free to use and modify.
