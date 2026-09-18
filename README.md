# Cadence

[play now](https://isaiahcampusano.github.io/wpm-/)

<img width="918" height="600" alt="image" src="https://github.com/user-attachments/assets/676ada91-05ba-481d-ac04-101695b32f58" />

---

A dependency-free typing instrument with a quiet monochrome interface, compact live stats, and ice-blue accents. Practice public-domain prose passages or switch to structured C++ and Python code snippets while keeping the same WPM, accuracy, and mistake feedback.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm run serve` from this folder.
3. Open `http://127.0.0.1:4173`.

The application itself is static and can also be served by any standard static web server.

## C++ practice curriculum

Start with [easy/E0-hello-and-build](easy/E0-hello-and-build). Problems are single-file C++17 exercises with objective stdout tests; run `tools/run_tests.sh <problem-directory>` to check a reference solution. See [ROADMAP.md](ROADMAP.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Modes

- **Prose** uses locally stored, verbatim excerpts from public-domain works sourced through Project Gutenberg.
- **Code** includes C++ and Python snippets organized by difficulty and category.
- Code mode preserves punctuation, newlines, and indentation. Press **Enter** for a newline and **Tab** when the next expected indentation is four spaces.
- Code tokenization recognizes common multi-character operators such as `::`, `<<`, `++`, `<=`, `**`, and `//`, while typing correctness remains character-by-character.
- Code passages soft-wrap by design: long lines wrap at whitespace so tokens like `std::cout` stay intact, and indentation is preserved. A single token longer than the viewport gets a horizontal scrollbar inside the passage area rather than breaking the page.

Settings fade during a run and return on hover or keyboard focus. Prose uses a three-line viewport; code keeps indentation in a taller viewport. Results appear inline.

