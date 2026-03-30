import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import type { Note } from "../types";
import { PartPill } from "./PartPill";

const categoryTagColors: Record<string, string> = {
	Singing: "text-tag-singing",
	Performance: "text-tag-performance",
	Musicality: "text-tag-musicality",
	Other: "text-tag-other",
};

const ACTION_BTN =
	"text-xs font-semibold text-muted bg-surface2 border border-border py-0.5 px-2 rounded-full cursor-pointer transition-all whitespace-nowrap flex items-center hover:text-text hover:border-muted";

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
			className={`group/row flex items-start gap-2.5 py-2 pl-2.5 border-b border-border border-l-2 relative overflow-hidden ${accessToken ? "cursor-pointer" : ""} ${isSelected ? "border-l-accent-dim bg-accent/[0.04]" : "border-l-transparent"}`}
			id={`note-${note.id}`}
			data-note-row="true"
			onClick={accessToken ? onSelect : undefined}
			onKeyDown={
				accessToken
					? (e) => (e.key === "Enter" || e.key === " ") && onSelect()
					: undefined
			}
		>
			<span className="flex-shrink-0 text-xs font-medium text-muted whitespace-nowrap pt-0.5">
				{prefix}
			</span>
			<span
				className={`text-sm leading-relaxed text-text flex-1 min-w-0 flex flex-col gap-1.5 ${note.resolved ? "opacity-40 line-through" : ""}`}
			>
				<span>{note.note}</span>
				<span className="flex flex-wrap gap-1 items-center">
					<PartPill parts={parts} selected={new Set(note.parts)} />
					{note.categories.map((c) => (
						<span
							key={c}
							className={`text-[10px] font-semibold py-px px-1.5 rounded-full border border-current bg-transparent ml-1 align-middle ${categoryTagColors[c] ?? "text-muted"}`}
						>
							{c}
						</span>
					))}
				</span>
			</span>
			{accessToken && (
				<div
					className={`note-row-actions-bg absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2 pl-6 transition-opacity duration-150 ${isSelected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"}`}
				>
					{note.resolved ? (
						<button
							className={ACTION_BTN}
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
							className={ACTION_BTN}
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
						className={ACTION_BTN}
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
						className={`${ACTION_BTN} hover:text-[#c96b6b] hover:border-[#c96b6b]`}
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
