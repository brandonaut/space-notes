import { RotateCw } from "lucide-react";
import { formatDate } from "../../utils.js";
import type { Note } from "../types";

interface SongListProps {
	notes: Note[];
	configSongs: string[];
	loading: boolean;
	error: string | null;
	onOpenSong: (song: string) => void;
	onRefresh: () => void;
}

export function SongList({
	notes,
	configSongs,
	loading,
	error,
	onOpenSong,
	onRefresh,
}: Readonly<SongListProps>) {
	const songs = [...new Set([...configSongs, ...notes.map((n) => n.song)])]
		.filter(Boolean)
		.sort();

	// Only show songs that have notes on the list screen
	const songsWithNotes = songs.filter((song) =>
		notes.some((n) => n.song === song),
	);

	return (
		<div id="screen-songs" className="p-5">
			<div className="flex items-center justify-between mb-4">
				<div className="text-xs font-semibold tracking-widest uppercase text-muted">
					Songs
				</div>
				<button
					className="bg-transparent border-none text-muted cursor-pointer px-2 py-1 transition-colors hover:text-accent"
					type="button"
					title="Refresh"
					onClick={onRefresh}
					disabled={loading}
				>
					<RotateCw size={16} />
				</button>
			</div>
			{error && (
				<div className="bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3.5 py-3 text-sm text-[#e07070] mb-4">
					{error}
				</div>
			)}
			<div id="song-list">
				{songsWithNotes.length === 0 ? (
					<div className="text-center py-16 px-5 text-muted">
						<div className="text-4xl mb-3">🎶</div>
						<p className="text-base leading-relaxed">
							No songs yet.
							<br />
							Tap <strong>+ Add Note</strong> to get started.
						</p>
					</div>
				) : (
					songsWithNotes.map((song) => {
						const sNotes = notes.filter((n) => n.song === song);
						const open = sNotes.filter((n) => !n.archive);
						const lastDate = [...sNotes.map((n) => n.date)].sort((a, b) =>
							b.localeCompare(a),
						)[0];
						return (
							<button
								key={song}
								type="button"
								className="song-card w-full text-left bg-surface border border-border rounded-xl p-4 mb-3 cursor-pointer transition-all relative overflow-hidden hover:border-accent-dim active:scale-[0.985]"
								onClick={() => onOpenSong(song)}
							>
								<div className="font-serif text-lg text-text mb-1.5">
									{song}
								</div>
								<div className="flex gap-2.5 flex-wrap">
									<span className="text-xs text-muted bg-surface2 py-[3px] px-2 rounded-full">
										{open.length} open note{open.length === 1 ? "" : "s"}
									</span>
									<span className="text-xs text-muted bg-surface2 py-[3px] px-2 rounded-full">
										Last: {formatDate(lastDate)}
									</span>
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
