import type { Note } from "../types";
import { PartPill } from "./PartPill";

const categoryTagColors: Record<string, string> = {
	Singing: "text-tag-singing",
	Performance: "text-tag-performance",
	Musicality: "text-tag-musicality",
	Other: "text-tag-other",
};

interface NoteRowProps {
	note: Note;
	parts: string[];
	accessToken: string | null;
	onEdit: () => void;
}

export function NoteRow({ note, parts, accessToken, onEdit }: NoteRowProps) {
	const prefix = note.measure ? `m.${note.measure}` : "";

	return (
		<div
			className={`flex items-start gap-2.5 py-2 pl-2.5 border-b border-border border-l-2 border-l-transparent ${accessToken ? "cursor-pointer" : ""}`}
			id={`note-${note.id}`}
			data-note-row="true"
			onClick={accessToken ? onEdit : undefined}
			onKeyDown={
				accessToken
					? (e) => (e.key === "Enter" || e.key === " ") && onEdit()
					: undefined
			}
		>
			<span className="flex-shrink-0 text-xs font-medium text-muted whitespace-nowrap pt-0.5">
				{prefix}
			</span>
			<span
				className={`text-sm leading-relaxed text-text flex-1 min-w-0 flex flex-col gap-1.5 ${note.archive ? "opacity-40 line-through" : ""}`}
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
		</div>
	);
}
