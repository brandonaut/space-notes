import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Note } from "../types";
import { NoteRow } from "./NoteRow";

interface SortableNoteRowProps {
	note: Note;
	parts: string[];
	accessToken: string | null;
	onEdit: () => void;
	showInsert?: boolean;
	onInsert?: () => void;
}

export function SortableNoteRow({
	note,
	parts,
	accessToken,
	onEdit,
	showInsert,
	onInsert,
}: Readonly<SortableNoteRowProps>) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: note.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : undefined,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<NoteRow
				note={note}
				parts={parts}
				accessToken={accessToken}
				onEdit={onEdit}
				dragHandleProps={{ ...attributes, ...listeners }}
			/>
			{showInsert && (
				<div className="flex justify-center py-1.5">
					<button
						type="button"
						className="px-4 py-1 rounded-full border border-dashed border-border hover:border-accent text-muted hover:text-accent text-sm font-bold transition-colors bg-transparent cursor-pointer leading-none"
						onClick={onInsert}
					>
						+
					</button>
				</div>
			)}
		</div>
	);
}
