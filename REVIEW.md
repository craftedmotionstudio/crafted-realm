# Review Surface — "the build Brenner is looking at"

The single source of truth for reviewing Crafted Realm. If you can't load what was
being worked on, **fixing this comes before any gameplay work.**

## How to load the build

1. Double-click **`serve.bat`** (or run `./serve.ps1` in PowerShell) in the project root.
2. Open **http://127.0.0.1:8777** in your browser.
3. **Hard-refresh** with **Ctrl+Shift+R** after any edit — the dev server caches JS and
   will otherwise serve stale files.

That's it. The launcher guarantees exactly one server on the port.

## What `serve.bat` does (why it's reliable)

- **Kills any stale/orphaned server** already on port 8777 before starting — no more
  duplicate or dying servers fighting over the port.
- **Serves one** clean `python -m http.server 8777 --bind 127.0.0.1` in the foreground.
  Closing the window (or Ctrl+C) stops that one server. No background ghosts.
- **Stamps the build**: writes `BUILD_INFO.json` (branch, commit, dirty flag, timestamp).

## The on-screen build stamp

Bottom-right of the game shows e.g. **`crafted-realm-sprint @ 2553ccd ✎ · 2026-06-30 07:12`**.
- That is *exactly* the build on screen — no guessing.
- `✎` = there are uncommitted local changes (working tree is ahead of the last commit).
- Click the stamp to collapse it to a dot (e.g. for clean screenshots); click again to expand.

## One-time gotcha: an elevated server holding the port

If `serve.bat` aborts with *"port still held by PID … started elevated"*, an old server
was launched from an **admin** terminal and a normal launcher can't kill it. Fix once:
- Task Manager → Details → end those `python.exe` processes, **or** close the admin
  terminal window that started them.
Then re-run `serve.bat`. Always launching via `serve.bat` (non-admin) prevents recurrence.

## Where the freshest build lives

- **Local working tree on this machine** is always the freshest (that's where edits land).
- **GitHub** (`origin/crafted-realm-sprint`) is the **backup** — pushed after meaningful
  progress so work is never trapped on one machine. It is *not* the live review surface.
- Remote review (GitHub Pages) is a deliberate future toggle, not the daily driver.
