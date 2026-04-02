import { Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signIn, signOut } from "../lib/auth";

interface HeaderProps {
	readonly accessToken: string | null;
}

export function Header({ accessToken }: Readonly<HeaderProps>) {
	const navigate = useNavigate();

	return (
		<header className="bg-surface border-b border-border px-5 py-4 flex items-center justify-between sticky top-0 z-[100]">
			<div>
				<h1 className="font-serif text-xl text-accent tracking-wide">
					🎵 Space Notes
				</h1>
				<div className="text-xs text-muted mt-px tracking-widest uppercase">
					Rehearsal Log
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					className="bg-transparent border-none text-muted cursor-pointer p-2 transition-colors hover:text-accent"
					type="button"
					title="About"
					onClick={() => navigate("/about")}
				>
					<Info size={18} />
				</button>
				{accessToken ? (
					<button
						className="bg-transparent border border-border text-muted rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-all hover:text-text hover:border-muted"
						type="button"
						onClick={signOut}
					>
						Sign Out
					</button>
				) : (
					<button
						className="bg-accent text-bg border-none rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer flex items-center gap-1.5 transition-opacity active:opacity-75"
						type="button"
						onClick={signIn}
					>
						Sign In
					</button>
				)}
			</div>
		</header>
	);
}
