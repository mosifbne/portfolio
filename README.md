# Mohamed Yousif · Portfolio

An interactive portfolio résumé that looks like a desktop: warm paper, ink text and muted blue accents. Desktop icons open About me, Previous experience, Skills & education, Selected work, Contact and **Paper Route**, an original runner game with a shared leaderboard.

## Features

- **Draggable windows on desktop.** Windows move across the whole blue area and stay grabbed when the pointer crosses the top banner.
- **One window at a time on phones.**
- **Close all windows** appears once two or more windows are open.
- **Print résumé** prints the portfolio content without the game.
- **Paper Route.** Press Space or tap to jump over mail crates. Players can post a display name and score. The leaderboard shows the top 10 and keeps the best score per name, matched case-insensitively.

## How it's built

| Path | What it does |
|---|---|
| `public/index.html` | Portfolio content |
| `public/style.css` | Design, including print styles |
| `public/site.js` | Window opening, stacking, dragging and closing |
| `public/runner.js` | The Paper Route game and leaderboard client |
| `worker/index.js` | Cloudflare Worker that serves the site and the `/api/runner` leaderboard |
| `drizzle/0000_leaderboard.sql` | D1 table for scores |
| `scripts/build.mjs` | Bundles the site into `dist/server/index.js` |
| `scripts/dev.mjs` | Local preview with Node's built-in SQLite standing in for D1 |

No dependencies or frameworks: plain HTML, CSS and JavaScript, plus one Worker.

## Run it locally

Needs Node.js 22.5 or later.

```bash
node scripts/dev.mjs
```

Then open http://localhost:8787. Local scores are saved in `.local/` (git-ignored).

## Deploy

Hosting is on Cloudflare Workers with a D1 database (`wrangler.toml`). Each push to `main` deploys through Cloudflare's GitHub integration.
