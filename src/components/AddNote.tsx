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
	onCancel: () => void;
	onSubmit: (fields: NoteFields) => Promise<void>;
}

export function AddNote({
	initialValues,
	parts,
	categories,
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

	return (
		<div className="edit-form">
			{error && <div className="error-banner show">{error}</div>}
			<div className="field">
				<label htmlFor="note-form-note">Note</label>
				<textarea
					id="note-form-note"
					ref={textareaRef}
					value={noteText}
					onChange={(e) => setNoteText(e.target.value)}
					placeholder="What's this note about?"
				/>
			</div>
			<div className="field-row">
				<div className="field">
					<label htmlFor="note-form-measure">Measure(s)</label>
					<input
						id="note-form-measure"
						value={measure}
						onChange={(e) => setMeasure(e.target.value)}
						placeholder="e.g. 32–36"
					/>
				</div>
				<div className="field">
					<label htmlFor="note-form-date">Date</label>
					<input
						id="note-form-date"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
				</div>
			</div>
			<div className="field">
				{/* biome-ignore lint/a11y/noLabelWithoutControl: group label for chip set */}
				<label>Part</label>
				<PartPill parts={parts} selected={selParts} onChange={setSelParts} />
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
			<div className="edit-actions">
				<button className="cancel-edit-btn" type="button" onClick={onCancel}>
					Cancel
				</button>
				<button
					className="save-edit-btn"
					type="button"
					disabled={saving}
					onClick={handleSubmit}
				>
					{saving ? "Saving…" : "Save Note"}
				</button>
			</div>
		</div>
	);
}
