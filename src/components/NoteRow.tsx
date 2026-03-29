import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import type { Note } from "../types";
import { PartPill } from "./PartPill";

interface NoteRowProps {
	note: Note;
	parts: string[];
	isSelected: boolean;
	accessToken: string | null;
	onSelect: () => void;
	onEdit: () => void;
	onResolve: (id: string, resolved: boolean) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
}

export function NoteRow({
	note,
	parts,
	isSelected,
	accessToken,
	onSelect,
	onEdit,
	onResolve,
	onDelete,
}: NoteRowProps) {
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
				<span>{note.note}</span>
				<span className="note-row-chips">
					<PartPill parts={parts} selected={new Set(note.parts)} />
					{note.categories.map((c) => (
						<span key={c} className={`note-tag ${c}`}>
							{c}
						</span>
					))}
				</span>
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
