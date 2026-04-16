import type { Note, View } from "../types";
import { formatDate, measureStart } from "./utils";

export function filterNotes(
	notes: Note[],
	activeParts: Set<string>,
	activeCategories: Set<string>,
): Note[] {
	let filtered = notes;
	if (activeParts.size > 0)
		filtered = filtered.filter(
			(n) => n.parts.length === 0 || n.parts.some((p) => activeParts.has(p)),
		);
	if (activeCategories.size > 0)
		filtered = filtered.filter(
			(n) =>
				n.categories.length === 0 ||
				n.categories.some((c) => activeCategories.has(c)),
		);
	return filtered;
}

export function selectCopyGroupNotes(notes: Note[], groupKey: string): Note[] {
	if (groupKey === "active") return notes.filter((n) => !n.archive);
	if (groupKey === "archived") return notes.filter((n) => n.archive);
	return notes.filter((n) => n.date === groupKey);
}

export function formatNoteForCopy(n: Note): string {
	const prefix = n.measure ? `m.${n.measure}` : "";
	const partsMeta = n.parts.join(", ");
	const catsMeta = n.categories.join(", ");
	const suffix = [partsMeta, catsMeta]
		.filter(Boolean)
		.map((s) => `(${s})`)
		.join(" ");
	const header = [
		prefix,
		n.lyrics ? `"${n.lyrics}"` : "",
		n.verb ? n.verb.toUpperCase() : "",
		n.subtext ?? "",
	]
		.filter(Boolean)
		.join(" · ");
	const noteLine = `${n.note}${suffix ? ` ${suffix}` : ""}`;
	if (n.lyrics || n.verb || n.subtext) return `- _${header}_\n  ${noteLine}`;
	return `- ${header ? `${header} ` : ""}${noteLine}`;
}

export function buildCopyText(
	song: string,
	groupKey: string,
	notes: Note[],
	view: View,
): string {
	const sorted = [...notes].sort(
		view === "custom"
			? (a, b) => a._row - b._row
			: (a, b) => measureStart(a.measure) - measureStart(b.measure),
	);
	const isDateGroup = groupKey !== "active" && groupKey !== "archived";
	const header = isDateGroup
		? `*${song}* — ${formatDate(groupKey)}`
		: `*${song}*`;
	return `${header}\n${sorted.map(formatNoteForCopy).join("\n")}`.trim();
}

export function computeBottomRow(songNotes: Note[]): number {
	return songNotes.length > 0
		? Math.max(...songNotes.map((n) => n._row)) + 1
		: 2;
}

export function shiftRowsAfterDelete(
	notes: Note[],
	song: string,
	deletedRow: number,
): Note[] {
	return notes.map((n) => ({
		...n,
		_row: n.song === song && n._row > deletedRow ? n._row - 1 : n._row,
	}));
}

export function shiftRowsForInsert(
	notes: Note[],
	song: string,
	insertRow: number,
): Note[] {
	return notes.map((n) =>
		n.song === song && n._row >= insertRow ? { ...n, _row: n._row + 1 } : n,
	);
}

export function reorderRows(
	notes: Note[],
	song: string,
	activeId: string,
	fromRow: number,
	toRow: number,
): Note[] {
	return notes.map((n) => {
		if (n.id === activeId) return { ...n, _row: toRow };
		if (n.song !== song) return n;
		if (fromRow < toRow && n._row > fromRow && n._row <= toRow)
			return { ...n, _row: n._row - 1 };
		if (fromRow > toRow && n._row >= toRow && n._row < fromRow)
			return { ...n, _row: n._row + 1 };
		return n;
	});
}

export function groupByDate(notes: Note[]): Record<string, Note[]> {
	const groups: Record<string, Note[]> = {};
	for (const n of notes) {
		if (!groups[n.date]) groups[n.date] = [];
		groups[n.date].push(n);
	}
	return groups;
}
