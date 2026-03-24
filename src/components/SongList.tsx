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
}: SongListProps) {
	const songs = [...new Set([...configSongs, ...notes.map((n) => n.song)])]
		.filter(Boolean)
		.sort();

	// Only show songs that have notes on the list screen
	const songsWithNotes = songs.filter((song) =>
		notes.some((n) => n.song === song),
	);

	return (
		<div id="screen-songs" className="screen active screen-pad">
			<div className="songs-header">
				<div className="section-label">Songs</div>
				<button
					className="refresh-btn"
					type="button"
					title="Refresh"
					onClick={onRefresh}
					disabled={loading}
				>
					<RotateCw size={16} />
				</button>
			</div>
			{error && <div className="error-banner show">{error}</div>}
			<div id="song-list">
				{songsWithNotes.length === 0 ? (
					<div className="empty-state">
						<div className="icon">🎶</div>
						<p>
							No songs yet.
							<br />
							Tap <strong>+ Add Note</strong> to get started.
						</p>
					</div>
				) : (
					songsWithNotes.map((song) => {
						const sNotes = notes.filter((n) => n.song === song);
						const open = sNotes.filter((n) => !n.resolved);
						const lastDate = [...sNotes.map((n) => n.date)].sort().reverse()[0];
						return (
							<button
								key={song}
								type="button"
								className="song-card"
								onClick={() => onOpenSong(song)}
							>
								<div className="song-card-name">{song}</div>
								<div className="song-card-meta">
									<span className="meta-pill">
										{open.length} open note
										{open.length !== 1 ? "s" : ""}
									</span>
									<span className="meta-pill">
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
