import { signIn, signOut } from "../lib/auth";

interface HeaderProps {
	accessToken: string | null;
}

export function Header({ accessToken }: HeaderProps) {
	return (
		<header className="app-header">
			<div>
				<h1>🎵 Space Notes</h1>
				<div className="subtitle">Rehearsal Log</div>
			</div>
			<div className="header-actions">
				{accessToken ? (
					<button className="header-btn-muted" type="button" onClick={signOut}>
						Sign Out
					</button>
				) : (
					<button className="header-btn" type="button" onClick={signIn}>
						Sign In
					</button>
				)}
			</div>
		</header>
	);
}
