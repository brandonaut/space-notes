import { useNavigate, useParams } from "react-router-dom";
import type { Note } from "../types";
import { SongDetail } from "./SongDetail";

interface SongDetailRouteProps {
	readonly notes: Note[];
	readonly parts: string[];
	readonly categories: string[];
	readonly accessToken: string | null;
	readonly onNotesChange: (notes: Note[]) => void;
	readonly showToast: (msg: string, color?: string) => void;
}

export function SongDetailRoute({
	notes,
	parts,
	categories,
	accessToken,
	onNotesChange,
	showToast,
}: Readonly<SongDetailRouteProps>) {
	const { song } = useParams<{ song: string }>();
	const navigate = useNavigate();

	if (!song) return null;

	return (
		<SongDetail
			song={decodeURIComponent(song)}
			notes={notes}
			parts={parts}
			categories={categories}
			accessToken={accessToken}
			onBack={() => navigate("/")}
			onNotesChange={onNotesChange}
			showToast={showToast}
		/>
	);
}
