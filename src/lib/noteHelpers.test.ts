import { describe, expect, it } from "vitest";
import type { Note } from "../types";
import {
	buildCopyText,
	computeBottomRow,
	filterNotes,
	formatNoteForCopy,
	groupByDate,
	reorderRows,
	selectCopyGroupNotes,
	shiftRowsAfterDelete,
	shiftRowsForInsert,
} from "./noteHelpers";

function note(overrides: Partial<Note> = {}): Note {
	return {
		id: "1",
		song: "Song A",
		measure: "",
		date: "2025-01-01",
		parts: [],
		categories: [],
		note: "",
		lyrics: "",
		subtext: "",
		verb: "",
		archive: false,
		_row: 2,
		...overrides,
	};
}

describe("filterNotes", () => {
	const notes: Note[] = [
		note({ id: "a", parts: ["Tenor"], categories: ["Singing"] }),
		note({ id: "b", parts: ["Bass"], categories: ["Performance"] }),
		note({ id: "c", parts: [], categories: [] }),
		note({ id: "d", parts: ["Tenor", "Bass"], categories: ["Other"] }),
	];

	it("returns all notes when no filters active", () => {
		expect(filterNotes(notes, new Set(), new Set())).toHaveLength(4);
	});

	it("filters by parts, keeping notes with matching part", () => {
		const result = filterNotes(notes, new Set(["Tenor"]), new Set());
		expect(result.map((n) => n.id)).toEqual(["a", "c", "d"]);
	});

	it("keeps notes with empty parts array when filtering by parts", () => {
		const result = filterNotes(notes, new Set(["Bass"]), new Set());
		expect(result.map((n) => n.id)).toContain("c");
	});

	it("filters by categories independently of parts", () => {
		const result = filterNotes(notes, new Set(), new Set(["Singing"]));
		expect(result.map((n) => n.id)).toEqual(["a", "c"]);
	});

	it("combines part and category filters (AND across dimensions)", () => {
		const result = filterNotes(notes, new Set(["Tenor"]), new Set(["Singing"]));
		expect(result.map((n) => n.id)).toEqual(["a", "c"]);
	});
});

describe("selectCopyGroupNotes", () => {
	const notes: Note[] = [
		note({ id: "a", archive: false, date: "2025-01-01" }),
		note({ id: "b", archive: true, date: "2025-01-01" }),
		note({ id: "c", archive: false, date: "2025-02-02" }),
	];

	it("selects only non-archived notes for the 'active' group", () => {
		const result = selectCopyGroupNotes(notes, "active");
		expect(result.map((n) => n.id)).toEqual(["a", "c"]);
	});

	it("selects only archived notes for the 'archived' group", () => {
		const result = selectCopyGroupNotes(notes, "archived");
		expect(result.map((n) => n.id)).toEqual(["b"]);
	});

	it("selects notes matching a date group key", () => {
		const result = selectCopyGroupNotes(notes, "2025-01-01");
		expect(result.map((n) => n.id)).toEqual(["a", "b"]);
	});

	it("returns empty array for unknown date", () => {
		expect(selectCopyGroupNotes(notes, "2030-01-01")).toEqual([]);
	});
});

describe("formatNoteForCopy", () => {
	it("formats a bare note with just body text", () => {
		expect(formatNoteForCopy(note({ note: "watch pitch" }))).toBe(
			"- watch pitch",
		);
	});

	it("prefixes with measure when present", () => {
		expect(
			formatNoteForCopy(note({ measure: "32", note: "watch pitch" })),
		).toBe("- m.32 watch pitch");
	});

	it("appends parts and categories as parenthesized suffix", () => {
		const result = formatNoteForCopy(
			note({
				measure: "8",
				note: "hold",
				parts: ["Tenor", "Bass"],
				categories: ["Singing"],
			}),
		);
		expect(result).toBe("- m.8 hold (Tenor, Bass) (Singing)");
	});

	it("uses italic multi-line form when lyrics are present", () => {
		const result = formatNoteForCopy(
			note({ measure: "5", lyrics: "love me", note: "crescendo" }),
		);
		expect(result).toBe('- _m.5 · "love me"_\n  crescendo');
	});

	it("uppercases the verb in the italic header", () => {
		const result = formatNoteForCopy(
			note({ verb: "stretch", note: "hold it" }),
		);
		expect(result).toBe("- _STRETCH_\n  hold it");
	});

	it("includes subtext in the italic header", () => {
		const result = formatNoteForCopy(
			note({ subtext: "softly", note: "breathe" }),
		);
		expect(result).toBe("- _softly_\n  breathe");
	});
});

describe("buildCopyText", () => {
	it("uses song name alone as header for 'active' group", () => {
		const n = note({ note: "hi", _row: 2 });
		expect(buildCopyText("Song A", "active", [n], "custom")).toBe(
			"*Song A*\n- hi",
		);
	});

	it("appends formatted date to header for date groups", () => {
		const n = note({ note: "hi", date: "2025-03-24" });
		const text = buildCopyText("Song A", "2025-03-24", [n], "chron");
		expect(text.split("\n")[0]).toBe("*Song A* — Mar 24, 2025");
	});

	it("sorts by _row in custom view", () => {
		const notes = [
			note({ id: "a", note: "second", _row: 5 }),
			note({ id: "b", note: "first", _row: 2 }),
		];
		const text = buildCopyText("Song A", "active", notes, "custom");
		expect(text).toBe("*Song A*\n- first\n- second");
	});

	it("sorts by measure in chron view", () => {
		const notes = [
			note({ id: "a", measure: "16", note: "later", _row: 2 }),
			note({ id: "b", measure: "4", note: "earlier", _row: 3 }),
		];
		const text = buildCopyText("Song A", "2025-01-01", notes, "chron");
		expect(text).toBe("*Song A* — Jan 1, 2025\n- m.4 earlier\n- m.16 later");
	});

	it("trims trailing whitespace", () => {
		const n = note({ note: "hi" });
		const text = buildCopyText("Song A", "active", [n], "custom");
		expect(text).toBe(text.trim());
	});
});

describe("computeBottomRow", () => {
	it("returns 2 for an empty song (header is row 1)", () => {
		expect(computeBottomRow([])).toBe(2);
	});

	it("returns max _row + 1", () => {
		const notes = [note({ _row: 2 }), note({ _row: 5 }), note({ _row: 3 })];
		expect(computeBottomRow(notes)).toBe(6);
	});
});

describe("shiftRowsAfterDelete", () => {
	it("decrements _row for notes after the deleted row in the same song", () => {
		const notes = [
			note({ id: "a", song: "Song A", _row: 2 }),
			note({ id: "b", song: "Song A", _row: 3 }),
			note({ id: "c", song: "Song A", _row: 5 }),
		];
		const result = shiftRowsAfterDelete(notes, "Song A", 3);
		expect(result.map((n) => n._row)).toEqual([2, 3, 4]);
	});

	it("leaves rows in other songs untouched", () => {
		const notes = [
			note({ id: "a", song: "Song A", _row: 5 }),
			note({ id: "b", song: "Song B", _row: 5 }),
		];
		const result = shiftRowsAfterDelete(notes, "Song A", 2);
		expect(result.find((n) => n.id === "a")?._row).toBe(4);
		expect(result.find((n) => n.id === "b")?._row).toBe(5);
	});

	it("does not shift rows at or before the deleted row", () => {
		const notes = [note({ song: "Song A", _row: 2 })];
		expect(shiftRowsAfterDelete(notes, "Song A", 5)[0]._row).toBe(2);
	});
});

describe("shiftRowsForInsert", () => {
	it("increments _row for rows at or after the insert row in the same song", () => {
		const notes = [
			note({ id: "a", song: "Song A", _row: 2 }),
			note({ id: "b", song: "Song A", _row: 3 }),
			note({ id: "c", song: "Song A", _row: 5 }),
		];
		const result = shiftRowsForInsert(notes, "Song A", 3);
		expect(result.map((n) => n._row)).toEqual([2, 4, 6]);
	});

	it("does not shift rows in other songs", () => {
		const notes = [
			note({ song: "Song A", _row: 3 }),
			note({ song: "Song B", _row: 3 }),
		];
		const result = shiftRowsForInsert(notes, "Song A", 3);
		expect(result[0]._row).toBe(4);
		expect(result[1]._row).toBe(3);
	});
});

describe("reorderRows", () => {
	const initial: Note[] = [
		note({ id: "a", song: "Song A", _row: 2 }),
		note({ id: "b", song: "Song A", _row: 3 }),
		note({ id: "c", song: "Song A", _row: 4 }),
		note({ id: "d", song: "Song A", _row: 5 }),
	];

	it("moves a row down and shifts intermediates up", () => {
		const result = reorderRows(initial, "Song A", "a", 2, 4);
		const byId = Object.fromEntries(result.map((n) => [n.id, n._row]));
		expect(byId).toEqual({ a: 4, b: 2, c: 3, d: 5 });
	});

	it("moves a row up and shifts intermediates down", () => {
		const result = reorderRows(initial, "Song A", "d", 5, 3);
		const byId = Object.fromEntries(result.map((n) => [n.id, n._row]));
		expect(byId).toEqual({ a: 2, b: 4, c: 5, d: 3 });
	});

	it("does not touch notes in other songs", () => {
		const notes = [...initial, note({ id: "x", song: "Song B", _row: 3 })];
		const result = reorderRows(notes, "Song A", "a", 2, 4);
		expect(result.find((n) => n.id === "x")?._row).toBe(3);
	});
});

describe("groupByDate", () => {
	it("groups notes by their date field", () => {
		const notes = [
			note({ id: "a", date: "2025-01-01" }),
			note({ id: "b", date: "2025-02-02" }),
			note({ id: "c", date: "2025-01-01" }),
		];
		const result = groupByDate(notes);
		expect(Object.keys(result).sort()).toEqual(["2025-01-01", "2025-02-02"]);
		expect(result["2025-01-01"].map((n) => n.id)).toEqual(["a", "c"]);
		expect(result["2025-02-02"].map((n) => n.id)).toEqual(["b"]);
	});

	it("returns empty object for empty input", () => {
		expect(groupByDate([])).toEqual({});
	});
});
