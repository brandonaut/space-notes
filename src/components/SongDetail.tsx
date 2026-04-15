import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ClipboardCopy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDate, measureStart } from "../../utils.js";
import { getToken } from "../lib/auth";
import { SONG_SHEET_PREFIX } from "../lib/config";
import {
	appendRow,
	deleteNoteRow,
	moveNoteRow,
	updateCell,
	updateRow,
} from "../lib/sheets";
import type { Note, View } from "../types";
import type { NoteFields } from "./AddNote";
import { AddNote } from "./AddNote";
import { FilterChips } from "./FilterChips";
import { Modal } from "./Modal";
import { NoteRow } from "./NoteRow";
import { PartPill } from "./PartPill";
import { SortableNoteRow } from "./SortableNoteRow";

type ModalState =
	| null
	| { mode: "add"; insertAfterNote: Note | null }
	| { mode: "edit"; note: Note };

interface SongDetailProps {
	song: string;
	notes: Note[];
	parts: string[];
	categories: string[];
	accessToken: string | null;
	sheetIds: Record<string, number>;
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
	sheetIds,
	onBack,
	onNotesChange,
	showToast,
}: Readonly<SongDetailProps>) {
	const [view, setView] = useState<View>("custom");
	const [activeFilters, setActiveFilters] = useState(new Set<string>());
	const [activeCategoryFilters, setActiveCategoryFilters] = useState(
		new Set<string>(),
	);
	const [modalState, setModalState] = useState<ModalState>(null);

	// Snapshot of notes before an optimistic drag reorder, used to revert on error.
	const notesSnapshot = useRef<Note[]>(notes);
	useEffect(() => {
		notesSnapshot.current = notes;
	}, [notes]);

	// Reset local state when the song changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: song is the intentional trigger
	useEffect(() => {
		setView("custom");
		setActiveFilters(new Set());
		setActiveCategoryFilters(new Set());
		setModalState(null);
	}, [song]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

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

	const openCount = songNotes.filter((n) => !n.archive).length;

	const handleArchive = useCallback(
		async (id: string, archive: boolean) => {
			const note = notes.find((n) => n.id === id);
			if (!note) return;
			onNotesChange((prev) =>
				prev.map((n) => (n.id === id ? { ...n, archive } : n)),
			);
			try {
				await updateCell(
					`${SONG_SHEET_PREFIX}${song}!H${note._row}`,
					archive ? "true" : "false",
					getToken,
				);
				showToast(archive ? "Archived ✓" : "Unarchived");
			} catch (e) {
				onNotesChange((prev) =>
					prev.map((n) => (n.id === id ? { ...n, archive: !archive } : n)),
				);
				if ((e as Error).message !== "auth")
					showToast("Could not save — try again", "#c96b6b");
			}
		},
		[notes, song, onNotesChange, showToast],
	);

	const handleDelete = useCallback(
		async (id: string): Promise<boolean> => {
			const note = notes.find((n) => n.id === id);
			if (!note) return false;
			if (!confirm("Delete this note permanently?")) return false;
			const sheetId = sheetIds[song];
			if (sheetId === undefined) {
				showToast("Cannot delete — sheet not found", "#c96b6b");
				return false;
			}
			try {
				await deleteNoteRow(note, sheetId, getToken);
				onNotesChange((prev) =>
					prev
						.filter((n) => n.id !== id)
						.map((n) => ({
							...n,
							_row: n.song === song && n._row > note._row ? n._row - 1 : n._row,
						})),
				);
				showToast("Note deleted");
				return true;
			} catch (e) {
				if ((e as Error).message !== "auth")
					showToast("Could not delete — try again", "#c96b6b");
				return false;
			}
		},
		[notes, song, sheetIds, onNotesChange, showToast],
	);

	const handleCreate = useCallback(
		async (fields: NoteFields, insertAfterNote: Note | null) => {
			const id = String(Date.now());
			const currentSongNotes = notes.filter((n) => n.song === song);
			const bottomRow =
				currentSongNotes.length > 0
					? Math.max(...currentSongNotes.map((n) => n._row)) + 1
					: 2;

			await appendRow(
				song,
				[
					id,
					song,
					fields.measure,
					fields.date,
					fields.parts.join(","),
					fields.categories.join(","),
					fields.note,
					"false",
					fields.lyrics,
					fields.subtext,
					fields.verb,
				],
				getToken,
			);

			let finalRow = bottomRow;
			if (insertAfterNote) {
				const targetRow = insertAfterNote._row + 1;
				const sheetId = sheetIds[song];
				if (sheetId !== undefined) {
					await moveNoteRow(sheetId, bottomRow, targetRow, getToken);
					finalRow = targetRow;
				}
			}

			const newNote: Note = {
				id,
				song,
				...fields,
				archive: false,
				_row: finalRow,
			};
			showToast("Note saved ✓");
			onNotesChange((prev) => {
				const shifted = insertAfterNote
					? prev.map((n) =>
							n.song === song && n._row >= finalRow
								? { ...n, _row: n._row + 1 }
								: n,
						)
					: prev;
				return [...shifted, newNote];
			});
			setModalState(null);
		},
		[song, notes, sheetIds, onNotesChange, showToast],
	);

	const handleSaveEdit = useCallback(
		async (id: string, fields: NoteFields) => {
			const note = notes.find((n) => n.id === id);
			if (!note) return;
			const updated = { ...note, ...fields };
			onNotesChange((prev) => prev.map((n) => (n.id === id ? updated : n)));
			try {
				await updateRow(
					song,
					note._row,
					[
						note.id,
						note.song,
						fields.measure,
						fields.date,
						fields.parts.join(","),
						fields.categories.join(","),
						fields.note,
						note.archive ? "true" : "false",
						fields.lyrics,
						fields.subtext,
						fields.verb,
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
		[notes, song, onNotesChange, showToast],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;

			const activeNote = notes.find(
				(n) => n.id === active.id && n.song === song,
			);
			const overNote = notes.find((n) => n.id === over.id && n.song === song);
			if (!activeNote || !overNote) return;

			const sheetId = sheetIds[song];
			if (sheetId === undefined) {
				showToast("Cannot reorder — sheet not found", "#c96b6b");
				return;
			}

			const fromRow = activeNote._row;
			const toRow = overNote._row;
			const snapshot = notesSnapshot.current;

			// Optimistic update: move note and fix _row values for shifted notes.
			// Scope _row changes to this song only — other songs use independent sheets.
			onNotesChange((prev) =>
				prev.map((n) => {
					if (n.id === active.id) return { ...n, _row: toRow };
					if (n.song !== song) return n;
					if (fromRow < toRow && n._row > fromRow && n._row <= toRow)
						return { ...n, _row: n._row - 1 };
					if (fromRow > toRow && n._row >= toRow && n._row < fromRow)
						return { ...n, _row: n._row + 1 };
					return n;
				}),
			);

			try {
				await moveNoteRow(sheetId, fromRow, toRow, getToken);
			} catch (e) {
				onNotesChange(() => snapshot);
				if ((e as Error).message !== "auth")
					showToast("Could not reorder — try again", "#c96b6b");
			}
		},
		[notes, song, sheetIds, onNotesChange, showToast],
	);

	const copyGroup = useCallback(
		(groupKey: string) => {
			let groupNotes = filtered;
			if (groupKey === "active")
				groupNotes = groupNotes.filter((n) => !n.archive);
			else if (groupKey === "archived")
				groupNotes = groupNotes.filter((n) => n.archive);
			else groupNotes = groupNotes.filter((n) => n.date === groupKey);

			if (!groupNotes.length) {
				showToast("No notes to copy", "#7a7585");
				return;
			}

			const fmt = (n: Note) => {
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
				if (n.lyrics || n.verb || n.subtext)
					return `- _${header}_\n  ${noteLine}`;
				return `- ${header ? `${header} ` : ""}${noteLine}`;
			};

			const sorted = [...groupNotes].sort(
				view === "custom"
					? (a, b) => a._row - b._row
					: (a, b) => measureStart(a.measure) - measureStart(b.measure),
			);
			const isDateGroup = groupKey !== "active" && groupKey !== "archived";
			const header = isDateGroup
				? `*${song}* — ${formatDate(groupKey)}`
				: `*${song}*`;
			const text = `${header}\n${sorted.map(fmt).join("\n")}`;
			navigator.clipboard
				.writeText(text.trim())
				.then(() => showToast("Copied ✓"))
				.catch(() => showToast("Could not copy", "#c96b6b"));
		},
		[filtered, song, view, showToast],
	);

	function groupHeader(label: string, key: string) {
		return (
			<div className="flex items-center justify-between text-xs font-semibold tracking-widest uppercase text-muted py-2.5 pb-2 border-b border-border mb-2.5">
				<span>{label}</span>
				<button
					className="bg-transparent border-none text-muted cursor-pointer py-[2px] px-1 rounded-lg flex items-center transition-colors hover:text-text"
					title="Copy"
					type="button"
					onClick={() => copyGroup(key)}
				>
					<ClipboardCopy size={14} />
				</button>
			</div>
		);
	}

	function renderGroups() {
		if (!filtered.length) {
			return (
				<div className="text-center py-10 px-5 text-muted text-sm">
					No notes for this filter.
				</div>
			);
		}
		if (view === "custom") {
			const open = filtered
				.filter((n) => !n.archive)
				.sort((a, b) => a._row - b._row);
			const archived = filtered
				.filter((n) => n.archive)
				.sort((a, b) => a._row - b._row);
			const activeIds = open.map((n) => n.id);
			return (
				<>
					{open.length > 0 && (
						<>
							{groupHeader("Active", "active")}
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								onDragEnd={handleDragEnd}
							>
								<SortableContext
									items={activeIds}
									strategy={verticalListSortingStrategy}
								>
									{open.map((n, i) => (
										<SortableNoteRow
											key={n.id}
											note={n}
											parts={parts}
											accessToken={accessToken}
											onEdit={() => setModalState({ mode: "edit", note: n })}
											showInsert={!!accessToken && i < open.length - 1}
											onInsert={() =>
												setModalState({ mode: "add", insertAfterNote: n })
											}
										/>
									))}
								</SortableContext>
							</DndContext>
							{accessToken && (
								<div className="flex justify-center py-1.5">
									<button
										type="button"
										className="px-4 py-1 rounded-full border border-dashed border-border hover:border-accent text-muted hover:text-accent text-sm font-bold transition-colors bg-transparent cursor-pointer leading-none"
										onClick={() =>
											setModalState({
												mode: "add",
												insertAfterNote: open[open.length - 1] ?? null,
											})
										}
									>
										+
									</button>
								</div>
							)}
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
			.sort((a, b) => b.localeCompare(a))
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
				accessToken={accessToken}
				onEdit={() => setModalState({ mode: "edit", note: n })}
			/>
		);
	}

	return (
		<div id="screen-detail" className="p-5">
			<button
				className="bg-transparent border-none text-accent font-sans text-sm font-medium cursor-pointer flex items-center gap-1.5 p-0 mb-4"
				type="button"
				onClick={onBack}
			>
				← All Songs
			</button>
			<div className="mb-5">
				<h2 className="font-serif text-2xl text-accent mb-1">{song}</h2>
				<div className="text-xs font-semibold tracking-widest uppercase text-muted">
					{songNotes.length} note{songNotes.length === 1 ? "" : "s"} ·{" "}
					{openCount} open
				</div>
			</div>
			<div className="flex items-center gap-2.5 mb-5">
				<div className="flex bg-surface2 rounded-lg p-0.5 flex-1">
					<button
						id="btn-custom"
						type="button"
						className={`flex-1 py-2 px-2 border-none rounded-md text-xs font-medium cursor-pointer transition-all tracking-[0.04em] ${view === "custom" ? "bg-surface text-text shadow-sm" : "bg-transparent text-muted"}`}
						onClick={() => setView("custom")}
					>
						Custom
					</button>
					<button
						id="btn-chron"
						type="button"
						className={`flex-1 py-2 px-2 border-none rounded-md text-xs font-medium cursor-pointer transition-all tracking-[0.04em] ${view === "chron" ? "bg-surface text-text shadow-sm" : "bg-transparent text-muted"}`}
						onClick={() => setView("chron")}
					>
						By Date
					</button>
				</div>
			</div>
			{parts.length >= 2 && (
				<div
					className="no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-4"
					id="filter-chips"
				>
					<PartPill
						parts={parts}
						selected={activeFilters}
						onChange={setActiveFilters}
					/>
				</div>
			)}
			{categories.length >= 2 && (
				<div
					className="no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-4"
					id="category-chips"
				>
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
						{...(modalState.mode === "edit" && {
							isArchived: modalState.note.archive,
							onArchive: () => {
								handleArchive(modalState.note.id, !modalState.note.archive);
								setModalState(null);
							},
							onDelete: async () => {
								const deleted = await handleDelete(modalState.note.id);
								if (deleted) setModalState(null);
							},
						})}
						onCancel={() => setModalState(null)}
						onSubmit={
							modalState.mode === "add"
								? (fields) => handleCreate(fields, modalState.insertAfterNote)
								: (fields) => handleSaveEdit(modalState.note.id, fields)
						}
					/>
				</Modal>
			)}
		</div>
	);
}
