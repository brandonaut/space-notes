import { useState } from "react";
import { getToken } from "../lib/auth";
import { appendRow } from "../lib/sheets";
import type { Note } from "../types";
import { FilterChips } from "./FilterChips";

interface AddNoteProps {
	parts: string[];
	categories: string[];
	notes: Note[];
	configSongs: string[];
	initialSong: string;
	onCancel: () => void;
	onSaved: (note: Note) => void;
	showToast: (msg: string, color?: string) => void;
}

export function AddNote({
	parts,
	categories,
	notes,
	configSongs,
	initialSong,
	onCancel,
	onSaved,
	showToast,
}: AddNoteProps) {
	const [song, setSong] = useState(initialSong);
	const [measure, setMeasure] = useState("");
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [selParts, setSelParts] = useState(new Set<string>());
	const [selCategories, setSelCategories] = useState(new Set<string>());
	const [noteText, setNoteText] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const allSongs = [...new Set([...configSongs, ...notes.map((n) => n.song)])]
		.filter(Boolean)
		.sort();

	async function handleSubmit() {
		if (!song.trim() || !noteText.trim() || !date) {
			setError("Please fill in Song, Date, and Note.");
			return;
		}
		setError(null);
		setSaving(true);
		const id = String(Date.now());
		const newNote: Note = {
			id,
			song: song.trim(),
			measure: measure.trim(),
			date,
			parts: [...selParts],
			categories: [...selCategories],
			note: noteText.trim(),
			resolved: false,
			_row: notes.length + 2,
		};
		try {
			await appendRow(
				[
					id,
					newNote.song,
					newNote.measure,
					date,
					newNote.parts.join(","),
					newNote.categories.join(","),
					newNote.note,
					"false",
				],
				getToken,
			);
			showToast("Note saved ✓");
			onSaved(newNote);
		} catch (e) {
			if ((e as Error).message !== "auth")
				setError("Could not save. Check your connection and try again.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div id="screen-add" className="screen active screen-pad">
			<button className="back-btn" type="button" onClick={onCancel}>
				← Cancel
			</button>
			<div className="form-title">Add a Note</div>
			{error && <div className="error-banner show">{error}</div>}

			<div className="field">
				<label htmlFor="f-song">Song</label>
				<input
					id="f-song"
					list="song-datalist"
					value={song}
					onChange={(e) => setSong(e.target.value)}
					placeholder="Song name…"
					autoComplete="off"
				/>
				<datalist id="song-datalist">
					{allSongs.map((s) => (
						<option key={s} value={s} />
					))}
				</datalist>
			</div>
			<div className="field-row">
				<div className="field">
					<label htmlFor="f-measure">Measure(s)</label>
					<input
						id="f-measure"
						value={measure}
						onChange={(e) => setMeasure(e.target.value)}
						placeholder="e.g. 32–36"
					/>
				</div>
				<div className="field">
					<label htmlFor="f-date">Date</label>
					<input
						id="f-date"
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
				<label htmlFor="f-note">Note</label>
				<textarea
					id="f-note"
					value={noteText}
					onChange={(e) => setNoteText(e.target.value)}
					placeholder="Describe the note from the director or section leader…"
				/>
			</div>
			<button
				className={`submit-btn${saving ? " loading" : ""}`}
				id="submit-btn"
				type="button"
				disabled={saving}
				onClick={handleSubmit}
			>
				<div className="btn-spinner" />
				<span className="btn-text">{saving ? "Saving…" : "Save Note"}</span>
			</button>
		</div>
	);
}
