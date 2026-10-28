# Repository guide

- This is a dependency-free static HTML5 Canvas game: open `index.html` directly, or serve the repository with `npx serve .` and use `http://localhost:3000`.
- There is no package manifest, build step, linter, or automated test suite. Verify changes manually in a browser.

## Code map and constraints

- `index.html` owns the fixed `800x600` canvas and loads `game.js` as a classic (non-module) script. `favicon.svg` is the only other asset.
- `game.js` contains all input handling, entity classes, game state, update/render logic, and the `requestAnimationFrame` loop. Keep browser-compatible plain JavaScript; do not introduce imports or a bundler without also changing the app setup.
- Keep `W`/`H` in `game.js` synchronized with the canvas dimensions in `index.html`; movement wrapping, spawning, HUD placement, and rendering all depend on them.
- Simulation is delta-time based; retain the `dt` cap in `loop()` when altering timing or movement.
- For gameplay changes, manually exercise arrow-key movement, Space shooting/restart, asteroid splitting, death/respawn, game over, and level transition. Browser controls intentionally call `preventDefault()` for arrows and Space.
