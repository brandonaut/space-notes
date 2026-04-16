import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { getToken, initAuth } from "../lib/auth";
import { DEFAULT_CATEGORIES, DEFAULT_PARTS } from "../lib/config";
import {
	archiveSongSheet,
	createSongSheet,
	deleteSongSheet,
	getSheetMeta,
	loadConfig,
	loadNotes,
	renameSongSheet,
	unarchiveSongSheet,
} from "../lib/sheets";
import type { Config, Note } from "../types";
import { About } from "./About";
import { Header } from "./Header";
import { SongDetailRoute } from "./SongDetailRoute";
import { SongList } from "./SongList";
import { Toast } from "./Toast";

interface ToastState {
	msg: string;
	color?: string;
}

export function App() {
	const [notes, setNotes] = useState<Note[]>([]);
	const [config, setConfig] = useState<Config>({
		parts: DEFAULT_PARTS,
		categories: DEFAULT_CATEGORIES,
	});
	const [sheetIds, setSheetIds] = useState<Record<string, number>>({});
	const [archivedSheetIds, setArchivedSheetIds] = useState<
		Record<string, number>
	>({});
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [listError, setListError] = useState<string | null>(null);
	const [toast, setToast] = useState<ToastState | null>(null);
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const navigate = useNavigate();

	const songs = useMemo(
		() => Object.keys(sheetIds).sort((a, b) => a.localeCompare(b)),
		[sheetIds],
	);

	const archivedSongs = useMemo(
		() => Object.keys(archivedSheetIds).sort((a, b) => a.localeCompare(b)),
		[archivedSheetIds],
	);

	const showToast = useCallback((msg: string, color?: string) => {
		setToast({ msg, color });
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToast(null), 2400);
	}, []);

	const fetchNotes = useCallback(async (songList: string[]) => {
		if (!songList.length) return;
		setIsLoading(true);
		setListError(null);
		try {
			const loaded = await loadNotes(songList);
			setNotes(loaded);
		} catch {
			setListError(
				"Could not load notes. Check your connection and try refreshing.",
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		initAuth(setAccessToken);

		Promise.all([loadConfig(), getSheetMeta()])
			.then(([cfg, { songs: songIds, archived: archivedIds }]) => {
				setConfig(cfg);
				setSheetIds(songIds);
				setArchivedSheetIds(archivedIds);
				fetchNotes(Object.keys(songIds));
			})
			.catch((e) => {
				console.error("Startup load failed", e);
				setIsLoading(false);
				setListError(
					"Could not load notes. Check your connection and try refreshing.",
				);
			});
	}, [fetchNotes]);

	const handleCreateSong = useCallback(
		async (name: string) => {
			// Optimistic: show in list immediately
			setSheetIds((prev) => ({ ...prev, [name]: -1 }));
			try {
				const newSheetId = await createSongSheet(name, getToken);
				setSheetIds((prev) => ({ ...prev, [name]: newSheetId }));
				showToast("Song created");
			} catch {
				setSheetIds((prev) => {
					const next = { ...prev };
					delete next[name];
					return next;
				});
				showToast("Could not create song — try again", "#c96b6b");
				throw new Error("create failed");
			}
		},
		[showToast],
	);

	const handleRenameSong = useCallback(
		async (oldName: string, newName: string) => {
			const sheetId = sheetIds[oldName];
			if (sheetId === undefined) {
				showToast("Cannot find sheet — try refreshing", "#c96b6b");
				return;
			}
			// Optimistic
			setSheetIds((prev) => {
				const next = { ...prev, [newName]: prev[oldName] };
				delete next[oldName];
				return next;
			});
			setNotes((prev) =>
				prev.map((n) => (n.song === oldName ? { ...n, song: newName } : n)),
			);
			try {
				await renameSongSheet(`Song:${newName}`, sheetId, getToken);
				showToast("Song renamed");
			} catch {
				// Revert
				setSheetIds((prev) => {
					const next = { ...prev, [oldName]: prev[newName] };
					delete next[newName];
					return next;
				});
				setNotes((prev) =>
					prev.map((n) => (n.song === newName ? { ...n, song: oldName } : n)),
				);
				showToast("Could not rename song — try again", "#c96b6b");
				throw new Error("rename failed");
			}
		},
		[sheetIds, showToast],
	);

	const handleArchiveSong = useCallback(
		async (name: string) => {
			const sheetId = sheetIds[name];
			if (sheetId === undefined) {
				showToast("Cannot find sheet — try refreshing", "#c96b6b");
				return;
			}
			try {
				await archiveSongSheet(name, sheetId, getToken);
				setSheetIds((prev) => {
					const next = { ...prev };
					delete next[name];
					return next;
				});
				setArchivedSheetIds((prev) => ({ ...prev, [name]: sheetId }));
				setNotes((prev) => prev.filter((n) => n.song !== name));
				showToast("Song archived");
			} catch {
				showToast("Could not archive song — try again", "#c96b6b");
				throw new Error("archive failed");
			}
		},
		[sheetIds, showToast],
	);

	const handleUnarchiveSong = useCallback(
		async (name: string) => {
			const sheetId = archivedSheetIds[name];
			if (sheetId === undefined) {
				showToast("Cannot find sheet — try refreshing", "#c96b6b");
				return;
			}
			try {
				await unarchiveSongSheet(name, sheetId, getToken);
				setArchivedSheetIds((prev) => {
					const next = { ...prev };
					delete next[name];
					return next;
				});
				setSheetIds((prev) => ({ ...prev, [name]: sheetId }));
				// Load notes for the restored song
				const restored = await loadNotes([name]);
				setNotes((prev) => [...prev, ...restored]);
				showToast("Song restored");
			} catch {
				showToast("Could not restore song — try again", "#c96b6b");
				throw new Error("unarchive failed");
			}
		},
		[archivedSheetIds, showToast],
	);

	const handleDeleteSong = useCallback(
		async (name: string) => {
			const isArchived = archivedSheetIds[name] !== undefined;
			const sheetId = isArchived ? archivedSheetIds[name] : sheetIds[name];
			if (sheetId === undefined) {
				showToast("Cannot find sheet — try refreshing", "#c96b6b");
				return;
			}
			try {
				await deleteSongSheet(sheetId, getToken);
				if (isArchived) {
					setArchivedSheetIds((prev) => {
						const next = { ...prev };
						delete next[name];
						return next;
					});
				} else {
					setSheetIds((prev) => {
						const next = { ...prev };
						delete next[name];
						return next;
					});
					setNotes((prev) => prev.filter((n) => n.song !== name));
				}
				showToast("Song deleted");
			} catch {
				showToast("Could not delete song — try again", "#c96b6b");
				throw new Error("delete failed");
			}
		},
		[archivedSheetIds, sheetIds, showToast],
	);

	return (
		<>
			{isLoading && (
				<div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-[200] gap-4">
					<div className="w-8 h-8 rounded-full border-2 border-border border-t-accent spin" />
					<p className="text-sm text-muted">Loading notes…</p>
				</div>
			)}
			<Header accessToken={accessToken} />

			<Routes>
				<Route
					path="/"
					element={
						<SongList
							notes={notes}
							songs={songs}
							archivedSongs={archivedSongs}
							loading={isLoading}
							error={listError}
							accessToken={accessToken}
							onOpenSong={(song) =>
								navigate(`/songs/${encodeURIComponent(song)}`)
							}
							onRefresh={() => fetchNotes(songs)}
							onCreateSong={handleCreateSong}
							onRenameSong={handleRenameSong}
							onArchiveSong={handleArchiveSong}
							onUnarchiveSong={handleUnarchiveSong}
							onDeleteSong={handleDeleteSong}
						/>
					}
				/>
				<Route
					path="/songs/:song"
					element={
						<SongDetailRoute
							notes={notes}
							parts={config.parts}
							categories={config.categories}
							accessToken={accessToken}
							sheetIds={sheetIds}
							onNotesChange={setNotes}
							showToast={showToast}
						/>
					}
				/>
				<Route path="/about" element={<About />} />
			</Routes>

			<Toast message={toast?.msg ?? null} color={toast?.color} />
		</>
	);
}
