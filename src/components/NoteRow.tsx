import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Note } from "../types";
import { FilterChips } from "./FilterChips";

interface NoteRowProps {
	note: Note;
	isEditing: boolean;
	isSelected: boolean;
	accessToken: string | null;
	parts: string[];
	categories: string[];
	onSelect: () => void;
	onEdit: () => void;
	onCancelEdit: () => void;
	onSaveEdit: (
		id: string,
		fields: {
			measure: string;
			date: string;
			parts: string[];
			categories: string[];
			note: string;
		},
	) => Promise<void>;
	onResolve: (id: string, resolved: boolean) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
}

function buildPartIndicator(parts: string[]) {
	const all = parts.length === 0;
	const defs = [
		{ key: "Tenor", label: "T" },
		{ key: "Lead", label: "L" },
		{ key: "Baritone", label: "Br" },
		{ key: "Bass", label: "B" },
	];
	return (
		<span className="part-ind">
			{defs.map(({ key, label }) => (
				<span
					key={key}
					className={`pi ${key}${all || parts.includes(key) ? " active" : ""}`}
				>
					{label}
				</span>
			))}
		</span>
	);
}

interface EditFormProps {
	note: Note;
	parts: string[];
	categories: string[];
	onSave: (fields: {
		measure: string;
		date: string;
		parts: string[];
		categories: string[];
		note: string;
	}) => Promise<void>;
	onCancel: () => void;
}

function EditForm({
	note,
	parts,
	categories,
	onSave,
	onCancel,
}: EditFormProps) {
	const [measure, setMeasure] = useState(note.measure);
	const [date, setDate] = useState(note.date);
	const [selParts, setSelParts] = useState(new Set(note.parts));
	const [selCategories, setSelCategories] = useState(new Set(note.categories));
	const [noteText, setNoteText] = useState(note.note);
	const [saving, setSaving] = useState(false);

	async function handleSave() {
		if (!noteText.trim() || !date) return;
		setSaving(true);
		try {
			await onSave({
				measure: measure.trim(),
				date,
				parts: [...selParts],
				categories: [...selCategories],
				note: noteText.trim(),
			});
		} finally {
			setSaving(false);
		}
	}

	const measureId = `edit-measure-${note.id}`;
	const dateId = `edit-date-${note.id}`;
	const noteId = `edit-note-${note.id}`;

	return (
		<div className="edit-form">
			<div className="field-row">
				<div className="field">
					<label htmlFor={measureId}>Measure(s)</label>
					<input
						id={measureId}
						value={measure}
						onChange={(e) => setMeasure(e.target.value)}
						placeholder="e.g. 32–36"
					/>
				</div>
				<div className="field">
					<label htmlFor={dateId}>Date</label>
					<input
						id={dateId}
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
				</div>
			</div>
			<div className="field">
				{/* biome-ignore lint/a11y/noLabelWithoutControl: group label for chip set */}
				<label>Part</label>
				<FilterChips
					options={parts}
					selected={selParts}
					onChange={setSelParts}
					mode="section"
					dataAttr="data-part"
				/>
			</div>
			<div className="field">
				{/* biome-ignore lint/a11y/noLabelWithoutControl: group label for chip set */}
				<label>Category</label>
				<FilterChips
					options={categories}
					selected={selCategories}
					onChange={setSelCategories}
					mode="filter"
					dataAttr="data-category"
				/>
			</div>
			<div className="field">
				<label htmlFor={noteId}>Note</label>
				<textarea
					id={noteId}
					value={noteText}
					onChange={(e) => setNoteText(e.target.value)}
				/>
			</div>
			<div className="edit-actions">
				<button className="cancel-edit-btn" type="button" onClick={onCancel}>
					Cancel
				</button>
				<button
					className="save-edit-btn"
					type="button"
					disabled={saving}
					onClick={handleSave}
				>
					{saving ? "Saving…" : "Save"}
				</button>
			</div>
		</div>
	);
}

export function NoteRow({
	note,
	isEditing,
	isSelected,
	accessToken,
	parts,
	categories,
	onSelect,
	onEdit,
	onCancelEdit,
	onSaveEdit,
	onResolve,
	onDelete,
}: NoteRowProps) {
	if (isEditing) {
		return (
			<div className="note-row editing" id={`note-${note.id}`}>
				<EditForm
					note={note}
					parts={parts}
					categories={categories}
					onSave={(fields) => onSaveEdit(note.id, fields)}
					onCancel={onCancelEdit}
				/>
			</div>
		);
	}

	const prefix = note.measure ? `m.${note.measure}` : "";

	return (
		<div
			className={`note-row${note.resolved ? " note-row-resolved" : ""}${isSelected ? " selected" : ""}`}
			id={`note-${note.id}`}
			onClick={accessToken ? onSelect : undefined}
			onKeyDown={
				accessToken
					? (e) => (e.key === "Enter" || e.key === " ") && onSelect()
					: undefined
			}
		>
			<span className="note-row-prefix">{prefix}</span>
			<span className="note-row-body">
				{note.note}
				{buildPartIndicator(note.parts)}
				{note.categories.map((t) => (
					<span key={t} className={`note-tag ${t}`}>
						{t}
					</span>
				))}
			</span>
			{accessToken && (
				<div className="note-row-actions">
					{note.resolved ? (
						<button
							className="note-action-btn"
							title="Unarchive"
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onResolve(note.id, false);
							}}
						>
							<ArchiveRestore size={16} />
						</button>
					) : (
						<button
							className="note-action-btn"
							title="Archive"
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onResolve(note.id, true);
							}}
						>
							<Archive size={16} />
						</button>
					)}
					<button
						className="note-action-btn"
						title="Edit"
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onEdit();
						}}
					>
						<Pencil size={16} />
					</button>
					<button
						className="note-action-btn danger"
						title="Delete"
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDelete(note.id);
						}}
					>
						<Trash2 size={16} />
					</button>
				</div>
			)}
		</div>
	);
}
