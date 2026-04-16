import { MoreVertical, Plus, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDate } from "../lib/utils";
import type { Note } from "../types";
import { SongManager, type SongModalState } from "./SongManager";

interface SongListProps {
	notes: Note[];
	songs: string[];
	archivedSongs: string[];
	loading: boolean;
	error: string | null;
	accessToken: string | null;
	onOpenSong: (song: string) => void;
	onRefresh: () => void;
	onCreateSong: (name: string) => Promise<void>;
	onRenameSong: (oldName: string, newName: string) => Promise<void>;
	onArchiveSong: (song: string) => Promise<void>;
	onUnarchiveSong: (song: string) => Promise<void>;
	onDeleteSong: (song: string) => Promise<void>;
}

type Tab = "active" | "archived";

export function SongList({
	notes,
	songs,
	archivedSongs,
	loading,
	error,
	accessToken,
	onOpenSong,
	onRefresh,
	onCreateSong,
	onRenameSong,
	onArchiveSong,
	onUnarchiveSong,
	onDeleteSong,
}: Readonly<SongListProps>) {
	const [tab, setTab] = useState<Tab>("active");
	const [menuOpenSong, setMenuOpenSong] = useState<string | null>(null);
	const [modalState, setModalState] = useState<SongModalState>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!menuOpenSong) return;
		const handleClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpenSong(null);
			}
		};
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [menuOpenSong]);

	const visibleSongs = tab === "active" ? songs : archivedSongs;

	return (
		<div id="screen-songs" className="p-5">
			{/* Header row */}
			<div className="flex items-center justify-between mb-4">
				<div className="text-xs font-semibold tracking-widest uppercase text-muted">
					Songs
				</div>
				<div className="flex items-center gap-1">
					{accessToken && tab === "active" && (
						<button
							type="button"
							title="New Song"
							className="bg-transparent border-none text-muted cursor-pointer px-2 py-1 transition-colors hover:text-accent"
							onClick={() => setModalState({ mode: "create" })}
						>
							<Plus size={16} />
						</button>
					)}
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
			</div>

			{/* Tab switcher — only show if there are archived songs or user is signed in */}
			{(archivedSongs.length > 0 || tab === "archived") && (
				<div className="flex gap-1 mb-4 bg-surface2 rounded-lg p-1">
					<button
						type="button"
						className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer border-none ${tab === "active" ? "bg-surface text-text" : "bg-transparent text-muted hover:text-text"}`}
						onClick={() => setTab("active")}
					>
						Active
					</button>
					<button
						type="button"
						className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer border-none ${tab === "archived" ? "bg-surface text-text" : "bg-transparent text-muted hover:text-text"}`}
						onClick={() => setTab("archived")}
					>
						Archived {archivedSongs.length > 0 && `(${archivedSongs.length})`}
					</button>
				</div>
			)}

			{error && (
				<div className="bg-[rgba(201,107,107,0.15)] border border-[rgba(201,107,107,0.3)] rounded-lg px-3.5 py-3 text-sm text-[#e07070] mb-4">
					{error}
				</div>
			)}

			<div id="song-list">
				{visibleSongs.length === 0 ? (
					<div className="text-center py-16 px-5 text-muted">
						<div className="text-4xl mb-3">🎶</div>
						<p className="text-base leading-relaxed">
							{tab === "active" ? (
								<>
									No songs yet.
									{accessToken && (
										<>
											<br />
											Tap <strong>+</strong> to add your first song.
										</>
									)}
								</>
							) : (
								"No archived songs."
							)}
						</p>
					</div>
				) : (
					visibleSongs.map((song) => {
						const sNotes = notes.filter((n) => n.song === song);
						const open = sNotes.filter((n) => !n.archive);
						const lastDate = [...sNotes.map((n) => n.date)].sort((a, b) =>
							b.localeCompare(a),
						)[0];
						const isMenuOpen = menuOpenSong === song;

						return (
							<div key={song} className="relative mb-3">
								<button
									type="button"
									className="song-card w-full text-left bg-surface border border-border rounded-xl p-4 cursor-pointer transition-all relative overflow-hidden hover:border-accent-dim active:scale-[0.985]"
									style={{ paddingRight: accessToken ? "2.75rem" : undefined }}
									onClick={() => tab === "active" && onOpenSong(song)}
								>
									<div className="font-serif text-lg text-text mb-1.5">
										{song}
									</div>
									{tab === "active" && (
										<div className="flex gap-2.5 flex-wrap">
											<span className="text-xs text-muted bg-surface2 py-[3px] px-2 rounded-full">
												{open.length} open note{open.length === 1 ? "" : "s"}
											</span>
											{lastDate && (
												<span className="text-xs text-muted bg-surface2 py-[3px] px-2 rounded-full">
													Last: {formatDate(lastDate)}
												</span>
											)}
										</div>
									)}
									{tab === "archived" && (
										<div className="flex gap-2.5 flex-wrap">
											<span className="text-xs text-muted bg-surface2 py-[3px] px-2 rounded-full">
												Archived
											</span>
										</div>
									)}
								</button>

								{accessToken && (
									<div
										ref={isMenuOpen ? menuRef : null}
										className="absolute top-3 right-3"
									>
										<button
											type="button"
											title="Song options"
											className="bg-transparent border-none text-muted cursor-pointer p-1 rounded hover:text-accent leading-none"
											onClick={(e) => {
												e.stopPropagation();
												setMenuOpenSong(isMenuOpen ? null : song);
											}}
										>
											<MoreVertical size={16} />
										</button>
										{isMenuOpen && (
											<div className="absolute right-0 top-7 bg-surface border border-border rounded-lg shadow-lg z-50 min-w-[130px] py-1 overflow-hidden">
												{tab === "active" ? (
													<>
														<button
															type="button"
															className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface2 cursor-pointer bg-transparent border-none"
															onClick={(e) => {
																e.stopPropagation();
																setMenuOpenSong(null);
																setModalState({ mode: "rename", song });
															}}
														>
															Rename
														</button>
														<button
															type="button"
															className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface2 cursor-pointer bg-transparent border-none"
															onClick={(e) => {
																e.stopPropagation();
																setMenuOpenSong(null);
																setModalState({ mode: "archive", song });
															}}
														>
															Archive
														</button>
													</>
												) : (
													<button
														type="button"
														className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface2 cursor-pointer bg-transparent border-none"
														onClick={(e) => {
															e.stopPropagation();
															setMenuOpenSong(null);
															setModalState({ mode: "unarchive", song });
														}}
													>
														Restore
													</button>
												)}
												<button
													type="button"
													className="w-full text-left px-4 py-2 text-sm text-[#e07070] hover:bg-surface2 cursor-pointer bg-transparent border-none"
													onClick={(e) => {
														e.stopPropagation();
														setMenuOpenSong(null);
														setModalState({
															mode: "delete",
															song,
															noteCount: sNotes.length,
														});
													}}
												>
													Delete
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			<SongManager
				modalState={modalState}
				onClose={() => setModalState(null)}
				onCreateSong={onCreateSong}
				onRenameSong={onRenameSong}
				onArchiveSong={onArchiveSong}
				onUnarchiveSong={onUnarchiveSong}
				onDeleteSong={onDeleteSong}
			/>
		</div>
	);
}
