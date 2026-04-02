import { CLIENT_ID } from "./config";

const PREVIOUSLY_SIGNED_IN_KEY = "sn_signed_in";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;
let pendingResolve: ((token: string) => void) | null = null;
let onTokenChange: ((token: string | null) => void) | null = null;

export function initAuth(onChange: (token: string | null) => void): void {
	onTokenChange = onChange;

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
			localStorage.setItem(PREVIOUSLY_SIGNED_IN_KEY, "1");
			onTokenChange?.(accessToken);
			const resolve = pendingResolve;
			pendingResolve = null;
			if (resolve && accessToken) resolve(accessToken);
		},
	});

	if (localStorage.getItem(PREVIOUSLY_SIGNED_IN_KEY)) {
		tokenClient.requestAccessToken({ prompt: "" });
	}
}

export function signIn(): void {
	tokenClient?.requestAccessToken({ prompt: "select_account" });
}

export function signOut(): void {
	accessToken = null;
	localStorage.removeItem(PREVIOUSLY_SIGNED_IN_KEY);
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
}
