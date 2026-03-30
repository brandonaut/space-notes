# Space Notes — Architecture

## Design Goals

The app grew out of a specific problem: barbershop chorus rehearsals generate a lot of notes — from directors and section leaders — that tend to get lost in chat threads or forgotten by the next rehearsal.
The goals in rough priority order were:

1. **Mobile-first reading experience.** Most chorus members will look at notes on their phones, not at a desk.
The interface needs to work well at arm's length with a thumb.
2. **Two views of the same data.** Notes need to be browsable in measure order (cumulative song map — useful for systematic practice) and in reverse-chronological rehearsal order (useful for "what did we just work on?").
Rather than maintaining two separate documents, both views are derived from a single data set.
3. **Song-first navigation.** Choruses work on multiple songs simultaneously.
Members mostly want to look up notes for a specific song, not scroll through a flat log of everything.
4. **Low friction for note entry.** A small group of people (director, section leaders) enter notes, often on a phone shortly after rehearsal.
The form must be fast and use dropdowns rather than free-text fields wherever possible.
5. **Real shared state.** Notes entered by one person must be immediately visible to everyone else, with no manual distribution step (no emailing files, no re-uploading).
6. **No infrastructure to maintain.** The system should have no server, no database, no login system, and no recurring cost.
It should keep working without maintenance.

---

## Architecture Overview

```
┌─────────────────────────────────┐
│        index.html        │
│  (static file, hosted anywhere) │
│                                 │
│  • Renders song list            │
│  • Renders note detail views    │
│  • Handles add/resolve form     │
│  • Holds notes[] in memory      │
└────────────┬────────────────────┘
             │ fetch() over HTTPS
             │ (query params: action, note, id)
             ▼
┌─────────────────────────────────┐
│   Google Apps Script Web App    │
│   (deployed as public endpoint) │
│                                 │
│  doGet(e) / doPost(e)           │
│  Reads & writes Sheet via       │
│  SpreadsheetApp service         │
└────────────┬────────────────────┘
             │ Sheets API (internal)
             ▼
┌─────────────────────────────────┐
│         Google Sheet            │
│   (one row per note, 9 cols)    │
│                                 │
│   Also human-readable directly  │
│   — sortable, filterable,       │
│   exportable as CSV             │
└─────────────────────────────────┘
```

---

## Component Breakdown

### `index.html` — the client

A single self-contained HTML file with no build step, no dependencies, and no external JS frameworks.
Everything is vanilla HTML, CSS, and JavaScript.

**State** is held in a single in-memory array (`notes[]`) loaded from the Sheet on startup.
There is no local persistence (no `localStorage`).
This was a deliberate choice: local storage would create divergence between devices, and the Sheet is fast enough to be the sole source of truth.

**Screens** are three `<div>` elements toggled with a CSS `display` class (`active`). Navigation is handled by `showScreen()`. There is no router.

**Rendering** is string-based DOM replacement (`innerHTML`). Given the scale (dozens to low hundreds of notes), this is simpler and faster than maintaining a virtual DOM.

**The two views** (by measure, by rehearsal) are computed on the fly from `notes[]` by grouping and sorting the same array differently. No data duplication.

**Section filter chips** are generated dynamically from the parts actually present in a song's notes, so the chip row never shows parts that have no notes.

**Optimistic updates** are used for the archive action: the note is marked archived in memory and re-rendered immediately, then the Sheet write happens in the background.
If it fails, the note is rolled back and a toast error is shown.

### Google Apps Script Web App — the API layer

A single Apps Script file acts as a thin HTTP-to-Sheets bridge. It exposes three operations:

| Action | Method | What it does |
|--------|--------|--------------|
| `get` | Read | Reads all rows, converts to JSON array, returns to client |
| `add` | Append | Appends one new row from the JSON payload in `params.note` |
| `resolve` | Update | Scans rows for matching `id`, sets column 9 (`archive`) to `"true"` |

The script is deployed with **Execute as: Me** and **Access: Anyone**.
This means the Sheet doesn't need to be shared publicly — only the script endpoint is public, and it proxies access to the sheet through the script owner's credentials.
This is standard practice for Apps Script public APIs.

All three operations are handled via `doGet()` (GET requests) rather than `doPost()`, because `fetch()` from a static HTML file to a cross-origin Apps Script endpoint has the most reliable CORS behavior with GET.
Apps Script automatically adds the necessary CORS headers for GET requests from browser clients.

### Google Sheet — the data store

The Sheet is a flat table with one row per note.
It was chosen over a proper database for several reasons:

- **Zero setup and zero cost** — the chorus already has a Google account
- **Human-readable fallback** — the Sheet is a perfectly usable spreadsheet on its own; it can be sorted, filtered, and exported independently of the app
- **Durable** — Google handles backups, availability, and access control
- **Auditable** — anyone with Sheet access can see the full history

The `id` column uses a JavaScript `Date.now()` timestamp, which is unique enough for this use case (concurrent writes from multiple devices within the same millisecond are not realistically possible).

---

## Data Flow

### Loading notes on startup

```
App opens
  → fetch(API + '?action=get')
  → Apps Script reads all Sheet rows
  → Returns JSON array
  → App stores in notes[]
  → renderSongList()
```

### Adding a note

```
User fills form, taps Save
  → Validate (song, date, note required)
  → Build newNote object with id = Date.now()
  → fetch(API + '?action=add&note=<json>')
  → Apps Script appends row to Sheet
  → On success: push to notes[], navigate to song detail
  → On failure: show error banner, do not update notes[]
```

### Archiving a note

```
User taps "Archive"
  → Optimistically set note.archive = true in notes[]
  → Re-render (note shows archived style immediately)
  → Writes archive = "true" to the sheet via the Sheets API
  → On failure: roll back notes[], re-render, show toast error
```

---

## Constraints and Trade-offs

### No real-time sync

The app does not poll for changes or use WebSockets. If two people have the app open simultaneously and one adds a note, the other won't see it until they tap ↻ or reload. For a chorus context (one session open at a time, notes added after rehearsal rather than during), this is acceptable. Adding polling would be straightforward (`setInterval(() => loadNotes(), 30000)`) if it ever became necessary.

### No authentication

Anyone with the URL can read and add notes.
This is intentional — chorus members shouldn't need accounts or passwords for something this low-stakes.
The URL itself is the access control.
If the URL were posted publicly and abused, the Apps Script could be updated to check a shared secret token in the request.

### Sequential resolve writes

The `resolve` action scans rows linearly by `id`. For a sheet with hundreds of notes this is fast enough, but it would not scale to thousands.
A proper database with indexed lookups would be needed at that scale.

### Apps Script cold starts

Google Apps Script has a cold start time of 1–4 seconds if the script hasn't been invoked recently.
The first load of the day may feel slow.
Subsequent requests within the same session are fast. This is a platform constraint with no workaround short of moving to a different backend.

### Single flat sheet

All songs share one sheet.
This keeps the `get` action simple (one read, return everything) but means the client receives all notes for all songs on every load.
For a chorus with a dozen active songs and years of history, this could eventually become large.
If it ever became a problem, the `get` action could accept a `?song=` filter parameter and the App Script could filter rows before returning them.

---

## Potential Extensions

- **Per-song rehearsal summaries** — after loading, derive a "last rehearsal date" and "top 3 open high-priority notes" per song for a richer home screen card
- **Slack integration** — a simple webhook post from the "Save Note" flow could announce new notes to the chorus Slack channel automatically
- **Export to PDF** — a print stylesheet or PDF generation step could produce a clean song-by-song note sheet for members who want a physical copy
- **Director-only note entry** — adding a simple shared passphrase check before the Add Note form would restrict write access without requiring accounts
