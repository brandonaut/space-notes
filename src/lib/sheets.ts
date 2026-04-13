import type { Config, Note } from "../types";
import { clearToken } from "./auth";
import {
	API_KEY,
	BASE,
	CONFIG_SHEET_NAME,
	DEFAULT_CATEGORIES,
	DEFAULT_PARTS,
	SONG_SHEET_PREFIX,
} from "./config";

type SheetRow = (string | number | boolean)[];

async function fetchAuth(
	url: string,
	init: RequestInit,
	getToken: () => Promise<string>,
): Promise<Response> {
	const token = await getToken();
	const res = await fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...(init.headers as Record<string, string> | undefined),
		},
	});
	if (res.status === 401) {
		clearToken();
		throw new Error("auth");
	}
	if (!res.ok) throw new Error("request failed");
	return res;
}

/** Returns a map of song name → numeric sheetId for all Song:* tabs. */
export async function getSheetMeta(): Promise<Record<string, number>> {
	const res = await fetch(
		`${BASE}?fields=sheets(properties(sheetId,title))&key=${API_KEY}`,
	);
	if (!res.ok) throw new Error("metadata failed");
	const data = (await res.json()) as {
		sheets: Array<{ properties: { sheetId: number; title: string } }>;
	};
	const result: Record<string, number> = {};
	for (const {
		properties: { sheetId, title },
	} of data.sheets) {
		if (title.startsWith(SONG_SHEET_PREFIX)) {
			result[title.slice(SONG_SHEET_PREFIX.length)] = sheetId;
		}
	}
	return result;
}

function parseNoteRows(
	rows: string[][],
	headers: string[],
	song: string,
): Note[] {
	return rows.map((r, i) => {
		const obj: Record<string, string> = {};
		for (const [j, h] of headers.entries()) obj[h] = r[j] ?? "";
		return {
			id: obj.id,
			song: obj.song || song,
			measure: obj.measure,
			date: obj.date,
			note: obj.note,
			lyrics: obj.lyrics ?? "",
			subtext: obj.subtext ?? "",
			verb: obj.verb ?? "",
			archive: obj.archive === "true",
			_row: i + 2,
			parts: (obj.part || "")
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
			categories: (obj.tag || "")
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
		};
	});
}

export async function loadNotes(songs: string[]): Promise<Note[]> {
	const results = await Promise.all(
		songs.map(async (song) => {
			const sheetName = encodeURIComponent(`${SONG_SHEET_PREFIX}${song}`);
			const res = await fetch(`${BASE}/values/${sheetName}?key=${API_KEY}`);
			if (!res.ok) return [];
			const { values = [] } = (await res.json()) as { values?: string[][] };
			const [headers, ...rows] = values;
			if (!headers) return [];
			return parseNoteRows(rows, headers, song);
		}),
	);
	return results.flat();
}

export async function loadConfig(): Promise<Config> {
	const config: Config = {
		parts: DEFAULT_PARTS,
		categories: DEFAULT_CATEGORIES,
		songs: [],
	};
	try {
		const res = await fetch(
			`${BASE}/values/${CONFIG_SHEET_NAME}?key=${API_KEY}`,
		);
		if (!res.ok) return config;
		const { values = [] } = (await res.json()) as {
			values?: string[][];
		};
		const [headers, ...rows] = values;
		if (!headers) return config;

		const sIdx = headers.indexOf("parts");
		const tIdx = headers.indexOf("categories");
		const songIdx = headers.indexOf("songs");

		if (sIdx >= 0) {
			const s = rows.map((r) => r[sIdx]).filter(Boolean);
			if (s.length) config.parts = s;
		}
		if (tIdx >= 0) {
			const t = rows.map((r) => r[tIdx]).filter(Boolean);
			if (t.length) config.categories = t;
		}
		if (songIdx >= 0) {
			config.songs = rows.map((r) => r[songIdx]).filter(Boolean);
		}
	} catch (e) {
		console.error("Config load failed — built-in defaults remain active", e);
	}
	return config;
}

export async function appendRow(
	song: string,
	values: SheetRow,
	getToken: () => Promise<string>,
): Promise<void> {
	const sheetName = encodeURIComponent(`${SONG_SHEET_PREFIX}${song}`);
	await fetchAuth(
		`${BASE}/values/${sheetName}:append?valueInputOption=RAW`,
		{ method: "POST", body: JSON.stringify({ values: [values] }) },
		getToken,
	);
}

export async function updateRow(
	song: string,
	row: number,
	values: SheetRow,
	getToken: () => Promise<string>,
): Promise<void> {
	const range = encodeURIComponent(
		`${SONG_SHEET_PREFIX}${song}!A${row}:K${row}`,
	);
	await fetchAuth(
		`${BASE}/values/${range}?valueInputOption=RAW`,
		{ method: "PUT", body: JSON.stringify({ values: [values] }) },
		getToken,
	);
}

export async function updateCell(
	a1: string,
	value: string,
	getToken: () => Promise<string>,
): Promise<void> {
	await fetchAuth(
		`${BASE}/values/${encodeURIComponent(a1)}?valueInputOption=RAW`,
		{ method: "PUT", body: JSON.stringify({ values: [[value]] }) },
		getToken,
	);
}

export async function deleteNoteRow(
	note: Note,
	sheetId: number,
	getToken: () => Promise<string>,
): Promise<void> {
	await fetchAuth(
		`${BASE}:batchUpdate`,
		{
			method: "POST",
			body: JSON.stringify({
				requests: [
					{
						deleteDimension: {
							range: {
								sheetId,
								dimension: "ROWS",
								startIndex: note._row - 1,
								endIndex: note._row,
							},
						},
					},
				],
			}),
		},
		getToken,
	);
}

/**
 * Physically reorders a sheet row using the Sheets API moveDimension request.
 * fromRow and toRow are 1-indexed sheet row numbers (where row 1 is the header).
 * The moved row ends up at toRow's current position.
 */
export async function moveNoteRow(
	sheetId: number,
	fromRow: number,
	toRow: number,
	getToken: () => Promise<string>,
): Promise<void> {
	const sourceIndex = fromRow - 1;
	// destinationIndex is 0-indexed and refers to position after source removal.
	// Setting it to toRow - 1 places the moved row at the over-item's position.
	const destinationIndex = toRow - 1;
	await fetchAuth(
		`${BASE}:batchUpdate`,
		{
			method: "POST",
			body: JSON.stringify({
				requests: [
					{
						moveDimension: {
							source: {
								sheetId,
								dimension: "ROWS",
								startIndex: sourceIndex,
								endIndex: sourceIndex + 1,
							},
							destinationIndex,
						},
					},
				],
			}),
		},
		getToken,
	);
}
