import { useCallback, useEffect, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { initAuth } from "../lib/auth";
import { DEFAULT_CATEGORIES, DEFAULT_PARTS } from "../lib/config";
import { loadConfig, loadNotes } from "../lib/sheets";
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
		songs: [],
	});
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [listError, setListError] = useState<string | null>(null);
	const [toast, setToast] = useState<ToastState | null>(null);
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const navigate = useNavigate();

	const showToast = useCallback((msg: string, color?: string) => {
		setToast({ msg, color });
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToast(null), 2400);
	}, []);

	const fetchNotes = useCallback(async () => {
		setIsLoading(true);
		setListError(null);
		try {
			const loaded = await loadNotes();
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
		loadConfig()
			.then(setConfig)
			.catch(() => {
				// Config load failed — built-in defaults remain active
			});
		fetchNotes();
	}, [fetchNotes]);

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
							configSongs={config.songs}
							loading={isLoading}
							error={listError}
							onOpenSong={(song) =>
								navigate(`/songs/${encodeURIComponent(song)}`)
							}
							onRefresh={fetchNotes}
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
