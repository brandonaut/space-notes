import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import type { Note } from "../types";
import { AddNote } from "./AddNote";

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
				<AddNote
					initialValues={note}
					parts={parts}
					categories={categories}
					onCancel={onCancelEdit}
					onSubmit={(fields) => onSaveEdit(note.id, fields)}
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
