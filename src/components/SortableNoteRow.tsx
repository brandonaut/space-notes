import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Note } from "../types";
import { NoteRow } from "./NoteRow";

interface SortableNoteRowProps {
	note: Note;
	parts: string[];
	accessToken: string | null;
	onEdit: () => void;
}

export function SortableNoteRow({
	note,
	parts,
	accessToken,
	onEdit,
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
		</div>
	);
}
