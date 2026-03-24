import { CLIENT_ID } from "./config";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;
let pendingResolve: ((token: string) => void) | null = null;
let onTokenChange: ((token: string | null) => void) | null = null;

export function initAuth(onChange: (token: string | null) => void): void {
	onTokenChange = onChange;

	try {
		const stored = JSON.parse(sessionStorage.getItem("sn_token") ?? "null");
		if (stored?.expiresAt > Date.now()) {
			accessToken = stored.token as string;
			onChange(accessToken);
		}
	} catch (_) {}

	if (typeof google === "undefined") return;

	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: "https://www.googleapis.com/auth/spreadsheets",
		callback: (resp) => {
			if (resp.error) {
				onTokenChange?.(null);
				pendingResolve = null;
				return;
			}
			accessToken = resp.access_token;
			sessionStorage.setItem(
				"sn_token",
				JSON.stringify({
					token: resp.access_token,
					expiresAt: Date.now() + (resp.expires_in - 60) * 1000,
				}),
			);
			onTokenChange?.(accessToken);
			const resolve = pendingResolve;
			pendingResolve = null;
			if (resolve && accessToken) resolve(accessToken);
		},
	});
}

export function signIn(): void {
	tokenClient?.requestAccessToken({ prompt: "select_account" });
}

export function signOut(): void {
	accessToken = null;
	sessionStorage.removeItem("sn_token");
	onTokenChange?.(null);
}

export function getToken(): Promise<string> {
	return new Promise((resolve) => {
		if (accessToken) {
			resolve(accessToken);
			return;
		}
		pendingResolve = resolve;
		tokenClient?.requestAccessToken({ prompt: "select_account" });
	});
}

export function clearToken(): void {
	accessToken = null;
	sessionStorage.removeItem("sn_token");
}
