# 🎵 Space Notes

A mobile-first web app for capturing and browsing barbershop chorus rehearsal notes.
Directors and section leaders add notes after rehearsal; chorus members browse them by song, measure, or rehearsal date.

---

## Features

- **Song-first navigation** — pick a song, see all its notes at a glance
- **Two views per song** — toggle between *By Measure* (cumulative song map) and *By Rehearsal* (reverse-chronological log)
- **Section filter chips** — tap Tenor, Lead, Baritone, or Bass to narrow notes to your part
- **Tag categories** — Singing, Performance, Musicality
- **Archive** — track which notes have been fixed
- **Live Google Sheet backend** — all notes are stored in a shared spreadsheet; every device sees the same data in real time
- **Refresh button** — pull new notes mid-session without reloading the page

---

## Deployment

Host the three files (`index.html`, `app.css`, `app.js`) anywhere that serves static files:

### Netlify Drop (recommended — no account needed)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the folder onto the page
3. Copy the generated URL

### GitHub Pages

1. Push to a repository with Pages enabled (**Settings → Pages**, source: `main` branch)
2. Your URL will be `https://<username>.github.io/<repo>`

Once deployed, **pin the URL in your Slack channel** so members always have it one tap away.

---

## Google Sheet Backend

Notes are stored directly in a Google Sheet via the Sheets API v4.
Reading is anonymous (API key); writing requires signing in with a Google account.

The spreadsheet uses two sheets:

### `Sheet1` — Notes

| Column | Description |
|--------|-------------|
| `id` | Timestamp-based unique ID |
| `song` | Song name |
| `measure` | Measure number(s), e.g. `32–36` |
| `date` | Rehearsal date (YYYY-MM-DD) |
| `part` | Voice part(s), comma-separated (e.g. `Tenor,Lead`) |
| `tag` | Note category, comma-separated |
| `note` | Note text |
| `archive` | `true` or `false` |

### `Config` — Available values

A second sheet named `Config` controls the available options for sections, tags, and songs.
Create it with a header row and one value per row in each column:

| `parts` | `tags` | `songs` |
|---------|--------|---------|
| Tenor | Singing | Amazing Grace |
| Lead | Performance | The Old Songs |
| Baritone | Musicality | … |
| Bass | Other | |

If the `Config` sheet is missing or empty, the app falls back to built-in defaults.

---

## Usage

### Adding a note

1. Tap **+ Add Note** in the top-right corner
2. Sign in with your Google account when prompted
3. Fill in the song name (autocompletes from existing songs), measure(s), date, section, priority, tag, and note text
4. Tap **Save Note** — the note is written to the Google Sheet immediately

### Browsing notes

1. Tap a song card on the home screen
2. Use the **By Measure / By Rehearsal** toggle to switch views
3. Tap a part chip (Tenor, Lead, etc.) to filter to your section
4. Tap **Mark resolved** on a note once the chorus has addressed it

### Refreshing

Tap **↻** on the home screen to pull the latest notes from the sheet.

---

## Configuration

The API key, OAuth client ID, and Sheet ID are set at the top of `app.js`:

```javascript
const API_KEY    = '...';
const CLIENT_ID  = '...';
const SHEET_ID   = '...';
const SHEET_NAME = 'Sheet1';
```

## Local Development

```bash
bun install
bun run dev   # serves on http://localhost:3000
```
