# Contributing

## Passage rendering and soft-wrap

Any change to how passages render must be tested for wrapping behaviour:

- Code mode (`white-space: pre-wrap`, `overflow-wrap: normal`) wraps long lines at whitespace without breaking tokens; verify a long C++ line wraps and no horizontal page scrollbar appears.
- An unbreakable single token longer than the viewport must stay contained by the passage area's `overflow-x: auto`, never the page.
- The cursor/scroll logic in `scripts/ui.js` positions by `getBoundingClientRect()`, not by manual line math — keep it that way so wrapped lines track correctly.

## Contributing problems

Each problem uses `problem.md`, `starter.cpp`, `expected/out*.txt`, and a matching `solutions/.../solution.cpp` in the parallel solutions tree. Use C++17, one source file, and exact stdout tests. Order problems recognition → recall → application. Keep prompts short and every problem runnable. Application starters contain no solution beyond includes and `main`.

Run `tools/run_tests.sh <problem-directory>` before submitting. Keep reference solutions only under `solutions/`.
