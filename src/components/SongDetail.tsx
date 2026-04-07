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
}: Readonly<SongDetailProps>) {
	const [view, setView] = useState<View>("measure");
	const [activeFilters, setActiveFilters] = useState(new Set<string>());
	const [activeCategoryFilters, setActiveCategoryFilters] = useState(
		new Set<string>(),
	);
	const [modalState, setModalState] = useState<ModalState>(null);

	// Reset local state when the song changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: song is the intentional trigger
	useEffect(() => {
		setView("measure");
		setActiveFilters(new Set());
		setActiveCategoryFilters(new Set());
		setModalState(null);
	}, [song]);

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
					`${SHEET_NAME}!H${note._row}`,
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
		[notes, onNotesChange, showToast],
	);

	const handleDelete = useCallback(
		async (id: string): Promise<boolean> => {
			const note = notes.find((n) => n.id === id);
			if (!note) return false;
			if (!confirm("Delete this note permanently?")) return false;
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
				return true;
			} catch (e) {
				if ((e as Error).message !== "auth")
					showToast("Could not delete — try again", "#c96b6b");
				return false;
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
				archive: false,
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
					fields.lyrics,
					fields.subtext,
					fields.verb,
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
		[notes, onNotesChange, showToast],
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
				(a, b) => measureStart(a.measure) - measureStart(b.measure),
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
		[filtered, song, showToast],
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

	const byMeasure = (a: Note, b: Note) =>
		(a.measure ? measureStart(a.measure) : -1) -
			(b.measure ? measureStart(b.measure) : -1) || (a.date < b.date ? 1 : -1);

	function renderGroups() {
		if (!filtered.length) {
			return (
				<div className="text-center py-10 px-5 text-muted text-sm">
					No notes for this filter.
				</div>
			);
		}
		if (view === "measure") {
			const open = filtered.filter((n) => !n.archive).sort(byMeasure);
			const archived = filtered.filter((n) => n.archive).sort(byMeasure);
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
						id="btn-measure"
						type="button"
						className={`flex-1 py-2 px-2 border-none rounded-md text-xs font-medium cursor-pointer transition-all tracking-[0.04em] ${view === "measure" ? "bg-surface text-text shadow-sm" : "bg-transparent text-muted"}`}
						onClick={() => setView("measure")}
					>
						By Measure
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
			{accessToken && (
				<button
					className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-accent text-bg border-none text-[30px] font-light leading-none cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center z-50 transition-all active:scale-90"
					type="button"
					onClick={() => setModalState({ mode: "add" })}
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
								? handleCreate
								: (fields) => handleSaveEdit(modalState.note.id, fields)
						}
					/>
				</Modal>
			)}
		</div>
	);
}
