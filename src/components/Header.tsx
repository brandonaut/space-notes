import { signIn, signOut } from "../lib/auth";

interface HeaderProps {
	accessToken: string | null;
}

export function Header({ accessToken }: HeaderProps) {
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
