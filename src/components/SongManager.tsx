import { useState } from "react";
import { Modal } from "./Modal";

export type SongModalState =
	| null
	| { mode: "create" }
	| { mode: "rename"; song: string }
	| { mode: "archive"; song: string }
	| { mode: "unarchive"; song: string }
	| { mode: "delete"; song: string; noteCount: number };

interface SongManagerProps {
	modalState: SongModalState;
	onClose: () => void;
	onCreateSong: (name: string) => Promise<void>;
	onRenameSong: (oldName: string, newName: string) => Promise<void>;
	onArchiveSong: (song: string) => Promise<void>;
	onUnarchiveSong: (song: string) => Promise<void>;
	onDeleteSong: (song: string) => Promise<void>;
}

const inputClass =
	"w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent";
const btnBase =
	"px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-colors disabled:opacity-50";
const btnPrimary = `${btnBase} bg-accent text-bg hover:bg-accent-dim`;
const btnDanger = `${btnBase} bg-[#c96b6b] text-white hover:bg-[#b05555]`;
const btnCancel = `${btnBase} bg-surface2 text-muted hover:text-text`;

export function SongManager({
	modalState,
	onClose,
	onCreateSong,
	onRenameSong,
	onArchiveSong,
	onUnarchiveSong,
	onDeleteSong,
}: Readonly<SongManagerProps>) {
	const [inputValue, setInputValue] = useState("");
	const [isBusy, setIsBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!modalState) return null;

	const handleClose = () => {
		if (isBusy) return;
		setInputValue("");
		setError(null);
		onClose();
	};

	const run = async (action: () => Promise<void>) => {
		setError(null);
		setIsBusy(true);
		try {
			await action();
			setInputValue("");
			onClose();
		} catch {
			setError("Something went wrong — please try again.");
		} finally {
			setIsBusy(false);
		}
	};

	if (modalState.mode === "create") {
		const trimmed = inputValue.trim();
		return (
			<Modal title="New Song" onClose={handleClose}>
				<div className="flex flex-col gap-4">
					<input
						// biome-ignore lint/a11y/noAutofocus: modal input should receive focus on open
						autoFocus
						type="text"
						className={inputClass}
						placeholder="Song name"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && trimmed)
								run(() => onCreateSong(trimmed));
						}}
						disabled={isBusy}
					/>
					{error && (
						<div className="text-sm text-[#e07070] bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3 py-2">
							{error}
						</div>
					)}
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							className={btnCancel}
							onClick={handleClose}
							disabled={isBusy}
						>
							Cancel
						</button>
						<button
							type="button"
							className={btnPrimary}
							disabled={!trimmed || isBusy}
							onClick={() => run(() => onCreateSong(trimmed))}
						>
							{isBusy ? "Creating…" : "Create"}
						</button>
					</div>
				</div>
			</Modal>
		);
	}

	if (modalState.mode === "rename") {
		const { song } = modalState;
		const trimmed = inputValue.trim();
		return (
			<Modal title="Rename Song" onClose={handleClose}>
				<div className="flex flex-col gap-4">
					<input
						// biome-ignore lint/a11y/noAutofocus: modal input should receive focus on open
						autoFocus
						type="text"
						className={inputClass}
						placeholder={song}
						value={inputValue || song}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && trimmed && trimmed !== song)
								run(() => onRenameSong(song, trimmed));
						}}
						disabled={isBusy}
					/>
					{error && (
						<div className="text-sm text-[#e07070] bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3 py-2">
							{error}
						</div>
					)}
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							className={btnCancel}
							onClick={handleClose}
							disabled={isBusy}
						>
							Cancel
						</button>
						<button
							type="button"
							className={btnPrimary}
							disabled={!trimmed || trimmed === song || isBusy}
							onClick={() => run(() => onRenameSong(song, trimmed))}
						>
							{isBusy ? "Saving…" : "Save"}
						</button>
					</div>
				</div>
			</Modal>
		);
	}

	if (modalState.mode === "archive") {
		const { song } = modalState;
		return (
			<Modal title="Archive Song" onClose={handleClose}>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-muted leading-relaxed">
						Archive <span className="text-text font-medium">"{song}"</span>? It
						will be hidden from the active list but not deleted.
					</p>
					{error && (
						<div className="text-sm text-[#e07070] bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3 py-2">
							{error}
						</div>
					)}
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							className={btnCancel}
							onClick={handleClose}
							disabled={isBusy}
						>
							Cancel
						</button>
						<button
							type="button"
							className={btnPrimary}
							disabled={isBusy}
							onClick={() => run(() => onArchiveSong(song))}
						>
							{isBusy ? "Archiving…" : "Archive"}
						</button>
					</div>
				</div>
			</Modal>
		);
	}

	if (modalState.mode === "unarchive") {
		const { song } = modalState;
		return (
			<Modal title="Restore Song" onClose={handleClose}>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-muted leading-relaxed">
						Restore <span className="text-text font-medium">"{song}"</span> to
						the active list?
					</p>
					{error && (
						<div className="text-sm text-[#e07070] bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3 py-2">
							{error}
						</div>
					)}
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							className={btnCancel}
							onClick={handleClose}
							disabled={isBusy}
						>
							Cancel
						</button>
						<button
							type="button"
							className={btnPrimary}
							disabled={isBusy}
							onClick={() => run(() => onUnarchiveSong(song))}
						>
							{isBusy ? "Restoring…" : "Restore"}
						</button>
					</div>
				</div>
			</Modal>
		);
	}

	if (modalState.mode === "delete") {
		const { song, noteCount } = modalState;
		return (
			<Modal title="Delete Song" onClose={handleClose}>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-muted leading-relaxed">
						Permanently delete{" "}
						<span className="text-text font-medium">"{song}"</span> and its{" "}
						{noteCount} note{noteCount === 1 ? "" : "s"}? This cannot be undone.
					</p>
					{error && (
						<div className="text-sm text-[#e07070] bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3 py-2">
							{error}
						</div>
					)}
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							className={btnCancel}
							onClick={handleClose}
							disabled={isBusy}
						>
							Cancel
						</button>
						<button
							type="button"
							className={btnDanger}
							disabled={isBusy}
							onClick={() => run(() => onDeleteSong(song))}
						>
							{isBusy ? "Deleting…" : "Delete"}
						</button>
					</div>
				</div>
			</Modal>
		);
	}

	return null;
}
