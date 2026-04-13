import { GripVertical } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { Note } from "../types";
import { PartPill } from "./PartPill";

function renderMarkdown(text: string): ReactNode {
	const tokens = text.split(/(~~.+?~~|\*\*.+?\*\*|\*.+?\*|_.+?_)/);
	return tokens.map((token, i) => {
		if (token.startsWith("~~") && token.endsWith("~~"))
			return <del key={`${i}-${token}`}>{token.slice(2, -2)}</del>;
		if (token.startsWith("**") && token.endsWith("**"))
			return <strong key={`${i}-${token}`}>{token.slice(2, -2)}</strong>;
		if (
			(token.startsWith("*") && token.endsWith("*")) ||
			(token.startsWith("_") && token.endsWith("_"))
		)
			return <em key={`${i}-${token}`}>{token.slice(1, -1)}</em>;
		return token;
	});
}

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
	dragHandleProps?: Record<string, unknown>;
}

export function NoteRow({
	note,
	parts,
	accessToken,
	onEdit,
	dragHandleProps,
}: Readonly<NoteRowProps>) {
	const prefix = note.measure ? `m.${note.measure}` : "";

	return (
		<div
			className="py-2 border-b border-border border-l-2 border-l-transparent flex items-start gap-1"
			id={`note-${note.id}`}
			data-note-row="true"
		>
			{dragHandleProps && (
				<button
					type="button"
					className="flex-none mt-2 text-muted hover:text-text cursor-grab active:cursor-grabbing bg-transparent border-none p-0.5 touch-none"
					aria-label="Drag to reorder"
					{...dragHandleProps}
				>
					<GripVertical size={14} />
				</button>
			)}
			<div
				className={`flex-1 pl-1.5 ${accessToken ? "cursor-pointer" : ""}`}
				onClick={accessToken ? onEdit : undefined}
				onKeyDown={
					accessToken
						? (e) => (e.key === "Enter" || e.key === " ") && onEdit()
						: undefined
				}
			>
				<div className="flex flex-col gap-0.5">
					{(prefix || note.lyrics) && (
						<div className="flex items-baseline gap-2">
							<span className="text-xs font-medium text-muted whitespace-nowrap">
								{prefix}
							</span>
							{note.lyrics && (
								<span className="text-xs text-muted italic">
									"{note.lyrics}"
								</span>
							)}
						</div>
					)}
					{(note.verb || note.subtext) && (
						<span className="text-xs text-muted font-medium tracking-wide">
							{note.verb && <span className="uppercase">{note.verb}</span>}
							{note.verb && note.subtext && " · "}
							{note.subtext}
						</span>
					)}
					<span
						className={`text-sm leading-relaxed text-text ${note.archive ? "opacity-40 line-through" : ""}`}
					>
						{note.note.split("\n").map((line, i) => (
							<Fragment key={`${i}-${line}`}>
								{i > 0 && <br />}
								{renderMarkdown(line)}
							</Fragment>
						))}
						<span className="inline-flex flex-wrap gap-1 items-center ml-1.5 align-middle">
							<PartPill parts={parts} selected={new Set(note.parts)} />
							{note.categories.map((c) => (
								<span
									key={c}
									className={`text-[10px] font-semibold py-px px-1.5 rounded-full border border-current bg-transparent ${categoryTagColors[c] ?? "text-muted"}`}
								>
									{c}
								</span>
							))}
						</span>
					</span>
				</div>
			</div>
		</div>
	);
}
