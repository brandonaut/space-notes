# 🎵 Chorus Notes

A mobile-first web app for capturing and browsing barbershop chorus rehearsal notes.
Directors and section leaders add notes after rehearsal; chorus members browse them by song, measure, or rehearsal date.

---

## Features

- **Song-first navigation** — pick a song, see all its notes at a glance
- **Two views per song** — toggle between *By Measure* (cumulative song map) and *By Rehearsal* (reverse-chronological log)
- **Section filter chips** — tap Tenor, Lead, Baritone, Bass, or Everyone to narrow notes to your part
- **Color-coded by voice part** — left-edge accent colors make notes scannable at a glance
- **Priority indicators** — High / Medium / Low dots on each note
- **Tag categories** — Pitch, Diction, Dynamics, Rhythm, Expression, Blend, General
- **Mark as resolved** — track which notes have been fixed
- **Live Google Sheet backend** — all notes are stored in a shared spreadsheet; every device sees the same data in real time
- **Refresh button** — pull new notes mid-session without reloading the page

---

## Deployment

The entire app is a single HTML file (`chorus-notes.html`). Host it anywhere that serves static files:

### Netlify Drop (recommended — no account needed)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag `chorus-notes.html` onto the page
3. Copy the generated URL

### GitHub Pages

1. Create a repository and add `chorus-notes.html` renamed to `index.html`
2. Go to **Settings → Pages** and enable Pages from the `main` branch
3. Your URL will be `https://<username>.github.io/<repo>`

Once deployed, **pin the URL in your Slack channel** so members always have it one tap away.

---

## Google Sheet Backend

Notes are stored in a Google Sheet via a Google Apps Script Web App.
The sheet has these columns:

| Column | Description |
|--------|-------------|
| `id` | Timestamp-based unique ID |
| `song` | Song name |
| `measure` | Measure number(s), e.g. `32–36` |
| `date` | Rehearsal date (YYYY-MM-DD) |
| `part` | Voice part: Tenor / Lead / Baritone / Bass / Everyone / Multiple |
| `priority` | High / Medium / Low |
| `tag` | Note category (Pitch, Diction, etc.) |
| `note` | Note text |
| `resolved` | `true` or `false` |

The Apps Script Web App accepts three actions via query parameters:

- `?action=get` — returns all rows as JSON
- `?action=add&note=<json>` — appends a new row
- `?action=resolve&id=<id>` — marks a row resolved

---

## Usage

### Adding a note

1. Tap **+ Add Note** in the top-right corner
2. Fill in the song name (autocompletes from existing songs), measure(s), date, section, priority, tag, and note text
3. Tap **Save Note** — the note is written to the Google Sheet immediately

### Browsing notes

1. Tap a song card on the home screen
2. Use the **By Measure / By Rehearsal** toggle to switch views
3. Tap a part chip (Tenor, Lead, etc.) to filter to your section
4. Tap **Mark resolved** on a note once the chorus has addressed it

### Refreshing

Tap **↻** on the home screen to pull the latest notes from the sheet.

---

## Editing the App

The API endpoint and Sheet ID are set near the top of the `<script>` block in `chorus-notes.html`:

```javascript
cont API = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```

To change the script (e.g. after re-deploying the Apps Script), update this constant and re-upload the HTML file to your host.
