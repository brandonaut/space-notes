import type { Config, Note } from "../types";
import { clearToken } from "./auth";
import {
	API_KEY,
	BASE,
	CONFIG_SHEET_NAME,
	DEFAULT_CATEGORIES,
	DEFAULT_PARTS,
	SHEET_GID,
	SHEET_NAME,
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
			...(init.headers ?? {}),
		},
	});
	if (res.status === 401) {
		clearToken();
		throw new Error("auth");
	}
	if (!res.ok) throw new Error("request failed");
	return res;
}

export async function loadNotes(): Promise<Note[]> {
	const res = await fetch(`${BASE}/values/${SHEET_NAME}?key=${API_KEY}`);
	if (!res.ok) throw new Error("load failed");
	const { values = [] } = (await res.json()) as {
		values?: string[][];
	};
	const [headers, ...rows] = values;
	if (!headers) return [];
	return rows.map((r, i) => {
		const obj: Record<string, string> = {};
		for (const [j, h] of headers.entries()) obj[h] = r[j] ?? "";
		return {
			id: obj.id,
			song: obj.song,
			measure: obj.measure,
			date: obj.date,
			note: obj.note,
			lyrics: obj.lyrics ?? "",
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
	} catch (_) {}
	return config;
}

export async function appendRow(
	values: SheetRow,
	getToken: () => Promise<string>,
): Promise<void> {
	await fetchAuth(
		`${BASE}/values/${SHEET_NAME}:append?valueInputOption=RAW`,
		{ method: "POST", body: JSON.stringify({ values: [values] }) },
		getToken,
	);
}

export async function updateRow(
	row: number,
	values: SheetRow,
	getToken: () => Promise<string>,
): Promise<void> {
	const range = encodeURIComponent(`${SHEET_NAME}!A${row}:I${row}`);
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
								sheetId: SHEET_GID,
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
