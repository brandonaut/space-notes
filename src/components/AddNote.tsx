import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FilterChips } from "./FilterChips";
import { PartPill } from "./PartPill";

export interface NoteFields {
	measure: string;
	date: string;
	parts: string[];
	categories: string[];
	note: string;
}

interface AddNoteProps {
	initialValues?: Partial<NoteFields>;
	parts: string[];
	categories: string[];
	isArchived?: boolean;
	onArchive?: () => void;
	onDelete?: () => Promise<void>;
	onCancel: () => void;
	onSubmit: (fields: NoteFields) => Promise<void>;
}

export function AddNote({
	initialValues,
	parts,
	categories,
	isArchived,
	onArchive,
	onDelete,
	onCancel,
	onSubmit,
}: AddNoteProps) {
	const [measure, setMeasure] = useState(initialValues?.measure ?? "");
	const [date, setDate] = useState(
		initialValues?.date ?? new Date().toISOString().slice(0, 10),
	);
	const [selParts, setSelParts] = useState(new Set(initialValues?.parts ?? []));
	const [selCategories, setSelCategories] = useState(
		new Set(initialValues?.categories ?? []),
	);
	const [noteText, setNoteText] = useState(initialValues?.note ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	async function handleSubmit() {
		if (!noteText.trim() || !date) {
			setError("Please fill in Note and Date.");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			await onSubmit({
				measure: measure.trim(),
				date,
				parts: [...selParts],
				categories: [...selCategories],
				note: noteText.trim(),
			});
		} catch (e) {
			if ((e as Error).message !== "auth")
				setError("Could not save. Check your connection and try again.");
		} finally {
			setSaving(false);
		}
	}

	const fieldLabel =
		"block text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-1.5";
	const fieldInput =
		"w-full bg-surface border border-border rounded-lg text-text font-sans text-base px-3.5 py-3 outline-none transition-colors focus:border-accent [-webkit-appearance:none]";

	return (
		<div className="flex flex-col">
			{error && (
				<div className="bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3.5 py-3 text-sm text-[#e07070] mb-4">
					{error}
				</div>
			)}
			<div className="mb-4">
				<label className={fieldLabel} htmlFor="note-form-note">
					Note
				</label>
				<textarea
					id="note-form-note"
					ref={textareaRef}
					className={`${fieldInput} min-h-[90px] resize-y leading-relaxed`}
					value={noteText}
					onChange={(e) => setNoteText(e.target.value)}
					placeholder="What's this note about? Can use *bold* and _italic_."
				/>
			</div>
			<div className="flex gap-3 mb-4">
				<div className="flex-1 min-w-0">
					<label className={fieldLabel} htmlFor="note-form-measure">
						Measure(s)
					</label>
					<input
						id="note-form-measure"
						className={fieldInput}
						inputMode="numeric"
						value={measure}
						onChange={(e) => setMeasure(e.target.value)}
						placeholder="e.g. 32–36"
					/>
				</div>
				<div className="flex-1 min-w-0">
					<label className={fieldLabel} htmlFor="note-form-date">
						Date
					</label>
					<input
						id="note-form-date"
						type="date"
						className={fieldInput}
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
				</div>
			</div>
			<div className="mb-4">
				{/* biome-ignore lint/a11y/noLabelWithoutControl: group label for chip set */}
				<label className={fieldLabel}>Part</label>
				<PartPill parts={parts} selected={selParts} onChange={setSelParts} />
			</div>
			<div className="mb-4">
				{/* biome-ignore lint/a11y/noLabelWithoutControl: group label for chip set */}
				<label className={fieldLabel}>Category</label>
				<FilterChips
					options={categories}
					selected={selCategories}
					onChange={setSelCategories}
					mode="filter"
					dataAttr="data-category"
				/>
			</div>
			<div className="border-t border-border mt-2 pt-4 flex items-center justify-between gap-2">
				<div className="flex gap-2">
					{onDelete && (
						<button
							className="text-[#c96b6b] bg-transparent border border-[#c96b6b] rounded-lg p-2 cursor-pointer transition-all hover:bg-[rgba(201,107,107,0.08)]"
							type="button"
							title="Delete"
							onClick={onDelete}
						>
							<Trash2 size={18} />
						</button>
					)}
					{onArchive && (
						<button
							className="text-muted bg-transparent border border-border rounded-lg p-2 cursor-pointer transition-all hover:text-text hover:border-muted"
							type="button"
							title={isArchived ? "Unarchive" : "Archive"}
							onClick={onArchive}
						>
							{isArchived ? (
								<ArchiveRestore size={18} />
							) : (
								<Archive size={18} />
							)}
						</button>
					)}
				</div>
				<div className="flex gap-2">
					<button
						className="text-sm font-semibold text-muted bg-transparent border border-border rounded-lg px-4 py-2 cursor-pointer transition-all hover:text-text hover:border-muted"
						type="button"
						onClick={onCancel}
					>
						Cancel
					</button>
					<button
						className="text-sm font-semibold text-bg bg-accent border-none rounded-lg px-4 py-2 cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
						type="button"
						disabled={saving}
						onClick={handleSubmit}
					>
						{saving ? "Saving…" : "Save Note"}
					</button>
				</div>
			</div>
		</div>
	);
}
