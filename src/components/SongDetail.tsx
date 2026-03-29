import { ClipboardCopy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatDate, measureStart } from "../../utils.js";
import { getToken } from "../lib/auth";
import { SHEET_NAME } from "../lib/config";
import { appendRow, deleteNoteRow, updateCell, updateRow } from "../lib/sheets";
import type { Note, View } from "../types";
import type { NoteFields } from "./AddNote";
import { AddNote } from "./AddNote";
import { FilterChips } from "./FilterChips";
import { Modal } from "./Modal";
import { NoteRow } from "./NoteRow";
import { PartPill } from "./PartPill";

type ModalState = null | { mode: "add" } | { mode: "edit"; note: Note };

interface SongDetailProps {
	song: string;
	notes: Note[];
	parts: string[];
	categories: string[];
	accessToken: string | null;
	onBack: () => void;
	onNotesChange: (updater: (prev: Note[]) => Note[]) => void;
	showToast: (msg: string, color?: string) => void;
}

export function SongDetail({
	song,
	notes,
	parts,
	categories,
	accessToken,
	onBack,
	onNotesChange,
	showToast,
}: SongDetailProps) {
	const [view, setView] = useState<View>("measure");
	const [activeFilters, setActiveFilters] = useState(new Set<string>());
	const [activeCategoryFilters, setActiveCategoryFilters] = useState(
		new Set<string>(),
	);
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
	const [modalState, setModalState] = useState<ModalState>(null);

	// Reset local state when the song changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: song is the intentional trigger
	useEffect(() => {
		setView("measure");
		setActiveFilters(new Set());
		setActiveCategoryFilters(new Set());
		setSelectedNoteId(null);
		setModalState(null);
	}, [song]);

	// Click-outside clears selection
	useEffect(() => {
		function handler(e: MouseEvent) {
			if (!(e.target as Element).closest(".note-row")) {
				setSelectedNoteId(null);
			}
		}
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	}, []);

	const songNotes = notes.filter((n) => n.song === song);
	let filtered = songNotes;
	if (activeFilters.size > 0)
		filtered = filtered.filter(
			(n) => n.parts.length === 0 || n.parts.some((p) => activeFilters.has(p)),
		);
	if (activeCategoryFilters.size > 0)
		filtered = filtered.filter(
			(n) =>
				n.categories.length === 0 ||
				n.categories.some((c) => activeCategoryFilters.has(c)),
		);

	const openCount = songNotes.filter((n) => !n.resolved).length;

	const handleResolve = useCallback(
		async (id: string, resolved: boolean) => {
			const note = notes.find((n) => n.id === id);
			if (!note) return;
			onNotesChange((prev) =>
				prev.map((n) => (n.id === id ? { ...n, resolved } : n)),
			);
			try {
				await updateCell(
					`${SHEET_NAME}!H${note._row}`,
					resolved ? "true" : "false",
					getToken,
				);
				showToast(resolved ? "Archived ✓" : "Unarchived");
			} catch (e) {
				onNotesChange((prev) =>
					prev.map((n) => (n.id === id ? { ...n, resolved: !resolved } : n)),
				);
				if ((e as Error).message !== "auth")
					showToast("Could not save — try again", "#c96b6b");
			}
		},
		[notes, onNotesChange, showToast],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			const note = notes.find((n) => n.id === id);
			if (!note) return;
			if (!confirm("Delete this note permanently?")) return;
			try {
				await deleteNoteRow(note, getToken);
				onNotesChange((prev) =>
					prev
						.filter((n) => n.id !== id)
						.map((n) => ({
							...n,
							_row: n._row > note._row ? n._row - 1 : n._row,
						})),
				);
				showToast("Note deleted");
			} catch (e) {
				if ((e as Error).message !== "auth")
					showToast("Could not delete — try again", "#c96b6b");
			}
		},
		[notes, onNotesChange, showToast],
	);

	const handleCreate = useCallback(
		async (fields: NoteFields) => {
			const id = String(Date.now());
			const newNote = {
				id,
				song,
				...fields,
				resolved: false,
				_row: notes.length + 2,
			};
			await appendRow(
				[
					id,
					song,
					fields.measure,
					fields.date,
					fields.parts.join(","),
					fields.categories.join(","),
					fields.note,
					"false",
				],
				getToken,
			);
			showToast("Note saved ✓");
			onNotesChange((prev) => [...prev, newNote]);
			setModalState(null);
		},
		[song, notes, onNotesChange, showToast],
	);

	const handleSaveEdit = useCallback(
		async (id: string, fields: NoteFields) => {
			const note = notes.find((n) => n.id === id);
			if (!note) return;
			const updated = { ...note, ...fields };
			onNotesChange((prev) => prev.map((n) => (n.id === id ? updated : n)));
			try {
				await updateRow(
					note._row,
					[
						note.id,
						note.song,
						fields.measure,
						fields.date,
						fields.parts.join(","),
						fields.categories.join(","),
						fields.note,
						note.resolved ? "true" : "false",
					],
					getToken,
				);
				setModalState(null);
				showToast("Note updated ✓");
			} catch (e) {
				onNotesChange((prev) => prev.map((n) => (n.id === id ? note : n)));
				throw e;
			}
		},
		[notes, onNotesChange, showToast],
	);

	const copyGroup = useCallback(
		(groupKey: string) => {
			let groupNotes = filtered;
			if (groupKey === "active")
				groupNotes = groupNotes.filter((n) => !n.resolved);
			else if (groupKey === "archived")
				groupNotes = groupNotes.filter((n) => n.resolved);
			else groupNotes = groupNotes.filter((n) => n.date === groupKey);

			if (!groupNotes.length) {
				showToast("No notes to copy", "#7a7585");
				return;
			}

			const fmt = (n: Note) => {
				const prefix = n.measure ? `m.${n.measure} ` : "";
				const partsMeta = n.parts.join(", ");
				const catsMeta = n.categories.join(", ");
				const suffix = [partsMeta, catsMeta]
					.filter(Boolean)
					.map((s) => `(${s})`)
					.join(" ");
				return `- ${prefix}${n.note}${suffix ? ` ${suffix}` : ""}`;
			};

			const sorted = [...groupNotes].sort(
				(a, b) => measureStart(a.measure) - measureStart(b.measure),
			);
			const text = `*${song}*\n${sorted.map(fmt).join("\n")}`;
			navigator.clipboard
				.writeText(text.trim())
				.then(() => showToast("Copied ✓"))
				.catch(() => showToast("Could not copy", "#c96b6b"));
		},
		[filtered, song, showToast],
	);

	function groupHeader(label: string, key: string) {
		return (
			<div className="group-header">
				<span>{label}</span>
				<button
					className="group-copy-btn"
					title="Copy"
					type="button"
					onClick={() => copyGroup(key)}
				>
					<ClipboardCopy size={14} />
				</button>
			</div>
		);
	}

	const byMeasure = (a: Note, b: Note) =>
		(a.measure ? measureStart(a.measure) : -1) -
			(b.measure ? measureStart(b.measure) : -1) || (a.date < b.date ? 1 : -1);

	function renderGroups() {
		if (!filtered.length) {
			return <div className="no-notes">No notes for this filter.</div>;
		}
		if (view === "measure") {
			const open = filtered.filter((n) => !n.resolved).sort(byMeasure);
			const archived = filtered.filter((n) => n.resolved).sort(byMeasure);
			return (
				<>
					{open.length > 0 && (
						<>
							{groupHeader("Active", "active")}
							{open.map((n) => renderNoteRow(n))}
						</>
					)}
					{archived.length > 0 && (
						<>
							{groupHeader("Archived", "archived")}
							{archived.map((n) => renderNoteRow(n))}
						</>
					)}
				</>
			);
		}
		// Chronological view
		const groups: Record<string, Note[]> = {};
		for (const n of filtered) {
			if (!groups[n.date]) groups[n.date] = [];
			groups[n.date].push(n);
		}
		return Object.keys(groups)
			.sort()
			.reverse()
			.map((d) => (
				<div key={d}>
					{groupHeader(formatDate(d), d)}
					{groups[d]
						.sort((a, b) => measureStart(a.measure) - measureStart(b.measure))
						.map((n) => renderNoteRow(n))}
				</div>
			));
	}

	function renderNoteRow(n: Note) {
		return (
			<NoteRow
				key={n.id}
				note={n}
				parts={parts}
				isSelected={selectedNoteId === n.id}
				accessToken={accessToken}
				onSelect={() =>
					setSelectedNoteId(selectedNoteId === n.id ? null : n.id)
				}
				onEdit={() => setModalState({ mode: "edit", note: n })}
				onResolve={handleResolve}
				onDelete={handleDelete}
			/>
		);
	}

	return (
		<div id="screen-detail" className="screen active screen-pad">
			<button className="back-btn" type="button" onClick={onBack}>
				← All Songs
			</button>
			<div className="song-title-block">
				<h2>{song}</h2>
				<div className="detail-note-count section-label">
					{songNotes.length} note{songNotes.length !== 1 ? "s" : ""} ·{" "}
					{openCount} open
				</div>
			</div>
			<div className="detail-toolbar">
				<div className="view-toggle">
					<button
						id="btn-measure"
						type="button"
						className={view === "measure" ? "active" : ""}
						onClick={() => setView("measure")}
					>
						By Measure
					</button>
					<button
						id="btn-chron"
						type="button"
						className={view === "chron" ? "active" : ""}
						onClick={() => setView("chron")}
					>
						By Date
					</button>
				</div>
			</div>
			{parts.length >= 2 && (
				<div className="filter-row" id="filter-chips">
					<PartPill
						parts={parts}
						selected={activeFilters}
						onChange={setActiveFilters}
					/>
				</div>
			)}
			{categories.length >= 2 && (
				<div className="filter-row" id="category-chips">
					<FilterChips
						options={categories}
						selected={activeCategoryFilters}
						onChange={setActiveCategoryFilters}
						mode="filter"
						dataAttr="data-category"
					/>
				</div>
			)}
			<div id="detail-notes">{renderGroups()}</div>
			{accessToken && (
				<button
					className="fab"
					type="button"
					onClick={() => setModalState({ mode: "add" })}
					style={{ display: "block" }}
				>
					+
				</button>
			)}
			{modalState !== null && (
				<Modal
					title={modalState.mode === "add" ? "Add a Note" : "Edit Note"}
					onClose={() => setModalState(null)}
				>
					<AddNote
						initialValues={
							modalState.mode === "edit" ? modalState.note : undefined
						}
						parts={parts}
						categories={categories}
						onCancel={() => setModalState(null)}
						onSubmit={
							modalState.mode === "add"
								? handleCreate
								: (fields) => handleSaveEdit(modalState.note.id, fields)
						}
					/>
				</Modal>
			)}
		</div>
	);
}
