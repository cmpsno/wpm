# Terminal Velocity

[play now](https://isaiahcampusano.github.io/wpm-/)

A polished, dependency-free typing test with a retro terminal interface. Practice public-domain prose passages or switch to structured C++ and Python code snippets while keeping the same WPM, accuracy, and error telemetry.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm run serve` from this folder.
3. Open `http://127.0.0.1:4173`.

The application itself is static and can also be served by any standard static web server.

## Modes

- **Prose** uses locally stored, verbatim excerpts from public-domain works sourced through Project Gutenberg.
- **Code** includes C++ and Python snippets organized by difficulty and category.
- Code mode preserves punctuation, newlines, and indentation. Press **Enter** for a newline and **Tab** when the next expected indentation is four spaces.
- Code tokenization recognizes common multi-character operators such as `::`, `<<`, `++`, `<=`, `**`, and `//`, while typing correctness remains character-by-character.

## Controls

- Type every character in the active passage or snippet, including spaces and punctuation.
- An incorrect key blocks progress and counts against accuracy immediately.
- Press **Backspace** to clear the current error; correct progress is locked in.
- Press **Enter** on the results screen to start a new run.
- Changing mode, language, difficulty, category, or passage length starts a fresh run and saves the selection locally.

## Tests

Run `npm test` for the dependency-free Node test suite. It covers character-level state transitions, prose selection and corpus shape, code snippet filtering and tokenization, WPM and accuracy calculations, persisted-state migration, and history limits.

Completed run history is stored only in the browser's `localStorage`; no data is transmitted.
