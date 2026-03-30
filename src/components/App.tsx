import { useCallback, useEffect, useRef, useState } from "react";
import { initAuth } from "../lib/auth";
import { DEFAULT_CATEGORIES, DEFAULT_PARTS } from "../lib/config";
import { loadConfig, loadNotes } from "../lib/sheets";
import type { Config, Note, Screen } from "../types";
import { Header } from "./Header";
import { SongDetail } from "./SongDetail";
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
	const [screen, setScreen] = useState<Screen>("songs");
	const [currentSong, setCurrentSong] = useState<string | null>(null);
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [listError, setListError] = useState<string | null>(null);
	const [toast, setToast] = useState<ToastState | null>(null);
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
		} catch (_) {
			setListError(
				"Could not load notes. Check your connection and try refreshing.",
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		initAuth(setAccessToken);
		loadConfig().then(setConfig);
		fetchNotes();
	}, [fetchNotes]);

	const openSong = useCallback((song: string) => {
		setCurrentSong(song);
		setScreen("detail");
		window.scrollTo(0, 0);
	}, []);

	return (
		<>
			{isLoading && (
				<div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-[200] gap-4">
					<div className="w-8 h-8 rounded-full border-2 border-border border-t-accent spin" />
					<p className="text-sm text-muted">Loading notes…</p>
				</div>
			)}
			<Header accessToken={accessToken} />

			{screen === "songs" && (
				<SongList
					notes={notes}
					configSongs={config.songs}
					loading={isLoading}
					error={listError}
					onOpenSong={openSong}
					onRefresh={fetchNotes}
				/>
			)}

			{screen === "detail" && currentSong && (
				<SongDetail
					song={currentSong}
					notes={notes}
					parts={config.parts}
					categories={config.categories}
					accessToken={accessToken}
					onBack={() => setScreen("songs")}
					onNotesChange={setNotes}
					showToast={showToast}
				/>
			)}

			<Toast message={toast?.msg ?? null} color={toast?.color} />
		</>
	);
}
