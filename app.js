const API_KEY = "AIzaSyADfoNjABwUYbIk6nkgjaWCD1iuOI3qH4w";
const CLIENT_ID =
	"582732782667-7nkuge3mspe5p1q0p7t52omjndiuir3s.apps.googleusercontent.com";
const SHEET_ID = "1V2SNY3C8Pd5Jw5ozg6fQAAp_ndPuw8X7IH5V7RQYvC0";
const SHEET_NAME = "Sheet1";
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

let notes = [];
let currentSong = null;
let currentView = "measure";
let activeFilter = "All";
let activeTagFilter = "All";
let accessToken = null;
let tokenClient;
let pendingAuth = null;

// ── Auth ──────────────────────────────────────────────────────────────────
function initAuth() {
	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: "https://www.googleapis.com/auth/spreadsheets",
		callback: (resp) => {
			if (resp.error) {
				showToast("Sign-in cancelled", "#c96b6b");
				pendingAuth = null;
				return;
			}
			accessToken = resp.access_token;
			const cb = pendingAuth;
			pendingAuth = null;
			if (cb) cb();
		},
	});
}

function getToken() {
	return new Promise((resolve) => {
		if (accessToken) {
			resolve(accessToken);
			return;
		}
		pendingAuth = () => resolve(accessToken);
		tokenClient.requestAccessToken({ prompt: "select_account" });
	});
}

// ── Sheets read (anonymous) ───────────────────────────────────────────────
async function loadNotes() {
	document.getElementById("loading-overlay").classList.remove("hidden");
	hideError("list-error");
	try {
		const res = await fetch(`${BASE}/values/${SHEET_NAME}?key=${API_KEY}`);
		if (!res.ok) throw new Error();
		const { values = [] } = await res.json();
		const [headers, ...rows] = values;
		if (!headers) {
			notes = [];
			renderSongList();
			return;
		}
		notes = rows.map((r, i) => {
			const obj = {};
			headers.forEach((h, j) => {
				obj[h] = r[j] ?? "";
			});
			obj._row = i + 2;
			obj.resolved = obj.resolved === "true" || obj.resolved === true;
			return obj;
		});
		renderSongList();
	} catch (_e) {
		showError(
			"list-error",
			"Could not load notes. Check your connection and try refreshing.",
		);
	} finally {
		document.getElementById("loading-overlay").classList.add("hidden");
	}
}

// ── Sheets write (authenticated) ──────────────────────────────────────────
async function appendRow(values) {
	const token = await getToken();
	const res = await fetch(
		`${BASE}/values/${SHEET_NAME}:append?valueInputOption=RAW`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ values: [values] }),
		},
	);
	if (res.status === 401) {
		accessToken = null;
		throw new Error("auth");
	}
	if (!res.ok) throw new Error("append failed");
}

async function updateRow(row, values) {
	const token = await getToken();
	const range = `${SHEET_NAME}!A${row}:I${row}`;
	const res = await fetch(
		`${BASE}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ values: [values] }),
		},
	);
	if (res.status === 401) {
		accessToken = null;
		throw new Error("auth");
	}
	if (!res.ok) throw new Error("update failed");
}

async function updateCell(a1, value) {
	const token = await getToken();
	const res = await fetch(
		`${BASE}/values/${encodeURIComponent(a1)}?valueInputOption=RAW`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ values: [[value]] }),
		},
	);
	if (res.status === 401) {
		accessToken = null;
		throw new Error("auth");
	}
	if (!res.ok) throw new Error("update failed");
}

// ── Navigation ────────────────────────────────────────────────────────────
function showScreen(name) {
	for (const s of document.querySelectorAll(".screen")) {
		s.classList.remove("active");
	}
	document
		.getElementById(
			{ songs: "screen-songs", detail: "screen-detail", add: "screen-add" }[
				name
			],
		)
		.classList.add("active");
	if (name === "songs") renderSongList();
	if (name === "add") {
		populateSongDatalist();
		document.getElementById("f-date").value = new Date()
			.toISOString()
			.slice(0, 10);
		if (currentSong) document.getElementById("f-song").value = currentSong;
		hideError("form-error");
	}
	window.scrollTo(0, 0);
}

// ── Song List ─────────────────────────────────────────────────────────────
function renderSongList() {
	const container = document.getElementById("song-list");
	const songs = [...new Set(notes.map((n) => n.song))].filter(Boolean).sort();
	if (!songs.length) {
		container.innerHTML =
			'<div class="empty-state"><div class="icon">🎶</div><p>No songs yet.<br>Tap <strong>+ Add Note</strong> to get started.</p></div>';
		return;
	}
	container.innerHTML = songs
		.map((song) => {
			const sNotes = notes.filter((n) => n.song === song);
			const open = sNotes.filter((n) => !n.resolved);
			const lastDate = sNotes
				.map((n) => n.date)
				.sort()
				.reverse()[0];
			return `<div class="song-card" onclick='openSong(${JSON.stringify(song)})'>
      <div class="song-card-name">${song}</div>
      <div class="song-card-meta">
        <span class="meta-pill">${open.length} open note${open.length !== 1 ? "s" : ""}</span>
        <span class="meta-pill">Last: ${formatDate(lastDate)}</span>
      </div>
    </div>`;
		})
		.join("");
}

function openSong(song) {
	currentSong = song;
	activeFilter = "All";
	activeTagFilter = "All";
	currentView = "measure";
	document.getElementById("detail-song-name").textContent = song;
	document.getElementById("btn-measure").classList.add("active");
	document.getElementById("btn-chron").classList.remove("active");
	renderFilterChips();
	renderTagChips();
	renderNotes();
	document.getElementById("screen-songs").classList.remove("active");
	document.getElementById("screen-detail").classList.add("active");
	window.scrollTo(0, 0);
}

// ── Chips ─────────────────────────────────────────────────────────────────
function renderFilterChips() {
	const present = new Set(
		notes.filter((n) => n.song === currentSong).map((n) => n.part),
	);
	const all = ["All", "Tenor", "Lead", "Baritone", "Bass", "Multiple"];
	const chips = all.filter((p) => p === "All" || present.has(p));
	document.getElementById("filter-chips").innerHTML = chips
		.map(
			(p) =>
				`<div class="chip ${activeFilter === p ? "active" : ""}" data-part="${p}" onclick="setFilter('${p}')">${p}</div>`,
		)
		.join("");
}

function setFilter(part) {
	activeFilter = part;
	renderFilterChips();
	renderNotes();
}

function renderTagChips() {
	const present = new Set(
		notes.filter((n) => n.song === currentSong).map((n) => n.tag),
	);
	const order = [
		"Pitch",
		"Diction",
		"Dynamics",
		"Rhythm",
		"Expression",
		"Blend",
		"General",
	];
	const tags = order.filter((t) => present.has(t));
	const container = document.getElementById("tag-chips");
	if (tags.length < 2) {
		container.innerHTML = "";
		return;
	}
	container.innerHTML = ["All", ...tags]
		.map(
			(t) =>
				`<div class="chip ${activeTagFilter === t ? "active tag-active" : ""}" data-tag="${t}" onclick="setTagFilter('${t}')">${t}</div>`,
		)
		.join("");
}

function setTagFilter(tag) {
	activeTagFilter = tag;
	renderTagChips();
	renderNotes();
}

// ── Notes view ────────────────────────────────────────────────────────────
function setView(v) {
	currentView = v;
	document
		.getElementById("btn-measure")
		.classList.toggle("active", v === "measure");
	document
		.getElementById("btn-chron")
		.classList.toggle("active", v === "chron");
	renderNotes();
}

function measureStart(m) {
	const n = Number.parseInt((m || "0").toString().replace(/[^0-9]/, ""));
	return Number.isNaN(n) ? 9999 : n;
}

function renderNotes() {
	let songNotes = notes.filter((n) => n.song === currentSong);
	const open = songNotes.filter((n) => !n.resolved).length;
	document.getElementById("detail-note-count").textContent =
		`${songNotes.length} note${songNotes.length !== 1 ? "s" : ""} · ${open} open`;

	if (activeFilter !== "All")
		songNotes = songNotes.filter((n) => n.part === activeFilter);
	if (activeTagFilter !== "All")
		songNotes = songNotes.filter((n) => n.tag === activeTagFilter);

	const container = document.getElementById("detail-notes");
	if (!songNotes.length) {
		container.innerHTML =
			'<div class="no-notes">No notes for this filter.</div>';
		return;
	}

	let html = "";
	if (currentView === "measure") {
		const groups = {};
		for (const n of songNotes) {
			const k = n.measure || "General";
			if (!groups[k]) groups[k] = [];
			groups[k].push(n);
		}
		for (const m of Object.keys(groups).sort(
			(a, b) => measureStart(a) - measureStart(b),
		)) {
			html += `<div class="group-header">Measure ${m}</div>`;
			for (const n of groups[m].sort((a, b) => (a.date < b.date ? 1 : -1))) {
				html += noteRow(n);
			}
		}
	} else {
		const groups = {};
		for (const n of songNotes) {
			if (!groups[n.date]) groups[n.date] = [];
			groups[n.date].push(n);
		}
		for (const d of Object.keys(groups).sort().reverse()) {
			html += `<div class="group-header">${formatDate(d)}</div>`;
			for (const n of groups[d].sort(
				(a, b) => measureStart(a.measure) - measureStart(b.measure),
			)) {
				html += noteRow(n);
			}
		}
	}
	container.innerHTML = html;
}

function noteRow(n) {
	const prefix = n.measure ? `m.${n.measure}` : "";
	const resolvedClass = n.resolved ? " note-row-resolved" : "";
	const action = n.resolved
		? `<button class="note-action-btn" onclick="resolveNote('${n.id}', false)">Reopen</button>`
		: `<button class="note-action-btn" onclick="resolveNote('${n.id}', true)">Resolve</button>`;
	return `<div class="note-row${resolvedClass}" data-part="${n.part}" id="note-${n.id}">
    <span class="note-row-prefix">${prefix}</span>
    <span class="note-row-body">${n.note}<span class="part-badge ${n.part}">${n.part}</span><span class="note-tag">${n.tag}</span></span>
    <div class="note-row-actions">
      ${action}
      <button class="note-action-btn" onclick="editNote('${n.id}')">Edit</button>
    </div>
  </div>`;
}

// ── Resolve ───────────────────────────────────────────────────────────────
async function resolveNote(id, resolved) {
	const note = notes.find((n) => String(n.id) === String(id));
	if (!note) return;
	note.resolved = resolved;
	renderNotes();
	try {
		await updateCell(
			`${SHEET_NAME}!H${note._row}`,
			resolved ? "true" : "false",
		);
		showToast(resolved ? "Marked as resolved ✓" : "Reopened");
	} catch (e) {
		note.resolved = !resolved;
		renderNotes();
		if (e.message !== "auth")
			showToast("Could not save — try again", "#c96b6b");
	}
}

// ── Copy to clipboard ─────────────────────────────────────────────────────
function copyNotes() {
	let open = notes.filter((n) => n.song === currentSong && !n.resolved);
	if (activeFilter !== "All")
		open = open.filter((n) => n.part === activeFilter);
	if (activeTagFilter !== "All")
		open = open.filter((n) => n.tag === activeTagFilter);
	if (!open.length) {
		showToast("No open notes to copy", "#7a7585");
		return;
	}

	const fmt = (n) => {
		const prefix = n.measure ? `m.${n.measure} ` : "";
		const meta = [n.part, n.tag].filter(Boolean).join(", ");
		return `- ${prefix}(${meta}) ${n.note}`;
	};

	let text = `*${currentSong}*\n`;

	if (currentView === "measure") {
		const groups = {};
		for (const n of open) {
			const k = n.measure || "";
			if (!groups[k]) groups[k] = [];
			groups[k].push(n);
		}
		for (const m of Object.keys(groups).sort(
			(a, b) => measureStart(a) - measureStart(b),
		)) {
			for (const n of groups[m].sort((a, b) => (a.date < b.date ? 1 : -1))) {
				text += `${fmt(n)}\n`;
			}
		}
	} else {
		const groups = {};
		for (const n of open) {
			if (!groups[n.date]) groups[n.date] = [];
			groups[n.date].push(n);
		}
		for (const d of Object.keys(groups).sort().reverse()) {
			text += `\n_${formatDate(d)}_\n`;
			for (const n of groups[d].sort(
				(a, b) => measureStart(a.measure) - measureStart(b.measure),
			)) {
				text += `${fmt(n)}\n`;
			}
		}
	}

	navigator.clipboard
		.writeText(text.trim())
		.then(() => showToast("Copied to clipboard ✓"))
		.catch(() => showToast("Could not copy", "#c96b6b"));
}

// ── Edit Note ─────────────────────────────────────────────────────────────
function editNote(id) {
	const note = notes.find((n) => String(n.id) === String(id));
	if (!note) return;
	const card = document.getElementById(`note-${id}`);
	if (!card) return;
	card.classList.add("editing");
	const parts = ["Tenor", "Lead", "Baritone", "Bass", "Multiple"];
	const tags = [
		"Pitch",
		"Diction",
		"Dynamics",
		"Rhythm",
		"Expression",
		"Blend",
		"General",
	];
	card.innerHTML = `
    <div class="edit-form">
      <div class="field-row">
        <div class="field">
          <label>Measure(s)</label>
          <input id="ef-measure-${id}" value="${note.measure}" placeholder="e.g. 32–36" />
        </div>
        <div class="field">
          <label>Date</label>
          <input id="ef-date-${id}" type="date" value="${note.date}" />
        </div>
      </div>
      <div class="field">
        <label>Section</label>
        <select id="ef-part-${id}">
          ${parts.map((p) => `<option ${note.part === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Tag</label>
        <select id="ef-tag-${id}">
          ${tags.map((t) => `<option ${note.tag === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Note</label>
        <textarea id="ef-note-${id}">${note.note}</textarea>
      </div>
      <div class="edit-actions">
        <button class="cancel-edit-btn" onclick="renderNotes()">Cancel</button>
        <button class="save-edit-btn" id="ef-save-${id}" onclick="saveEdit('${id}')">Save</button>
      </div>
    </div>`;
}

async function saveEdit(id) {
	const note = notes.find((n) => String(n.id) === String(id));
	if (!note) return;

	const measure = document.getElementById(`ef-measure-${id}`).value.trim();
	const date = document.getElementById(`ef-date-${id}`).value;
	const part = document.getElementById(`ef-part-${id}`).value;
	const tag = document.getElementById(`ef-tag-${id}`).value;
	const noteText = document.getElementById(`ef-note-${id}`).value.trim();

	if (!noteText || !date) {
		showToast("Date and Note are required", "#c96b6b");
		return;
	}

	const btn = document.getElementById(`ef-save-${id}`);
	btn.disabled = true;
	btn.textContent = "Saving…";

	const prev = { ...note };
	note.measure = measure;
	note.date = date;
	note.part = part;
	note.tag = tag;
	note.note = noteText;

	try {
		await updateRow(note._row, [
			note.id,
			note.song,
			measure,
			date,
			part,
			tag,
			noteText,
			note.resolved ? "true" : "false",
		]);
		renderFilterChips();
		renderNotes();
		showToast("Note updated ✓");
	} catch (e) {
		Object.assign(note, prev);
		renderNotes();
		if (e.message !== "auth")
			showToast("Could not save — try again", "#c96b6b");
	}
}

// ── Add Note ──────────────────────────────────────────────────────────────
function populateSongDatalist() {
	document.getElementById("song-datalist").innerHTML = [
		...new Set(notes.map((n) => n.song)),
	]
		.sort()
		.map((s) => `<option value="${s}">`)
		.join("");
}

async function submitNote() {
	const song = document.getElementById("f-song").value.trim();
	const measure = document.getElementById("f-measure").value.trim();
	const date = document.getElementById("f-date").value;
	const part = document.getElementById("f-part").value;
	const tag = document.getElementById("f-tag").value;
	const noteText = document.getElementById("f-note").value.trim();

	if (!song || !noteText || !date) {
		showError("form-error", "Please fill in Song, Date, and Note.");
		return;
	}

	const id = Date.now();
	const newNote = {
		id,
		song,
		measure,
		date,
		part,
		tag,
		note: noteText,
		resolved: false,
		_row: notes.length + 2,
	};
	const btn = document.getElementById("submit-btn");
	btn.classList.add("loading");
	btn.disabled = true;

	try {
		await appendRow([id, song, measure, date, part, tag, noteText, "false"]);
		notes.push(newNote);
		document.getElementById("f-song").value = "";
		document.getElementById("f-measure").value = "";
		document.getElementById("f-note").value = "";
		showToast("Note saved ✓");
		currentSong = song;
		openSong(song);
	} catch (e) {
		if (e.message !== "auth")
			showError(
				"form-error",
				"Could not save. Check your connection and try again.",
			);
	} finally {
		btn.classList.remove("loading");
		btn.disabled = false;
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(d) {
	if (!d) return "";
	const [y, m, day] = d.split("-");
	return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} ${+day}, ${y}`;
}

function showToast(msg, color) {
	const t = document.getElementById("toast");
	t.textContent = msg;
	t.style.background = color || "var(--lead)";
	t.classList.add("show");
	setTimeout(() => t.classList.remove("show"), 2400);
}

function showError(id, msg) {
	const el = document.getElementById(id);
	el.textContent = msg;
	el.classList.add("show");
}

function hideError(id) {
	document.getElementById(id).classList.remove("show");
}

initAuth();
loadNotes();
