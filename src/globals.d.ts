declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;

declare namespace google.accounts.oauth2 {
	interface TokenResponse {
		access_token: string;
		expires_in: number;
		error?: string;
	}

	interface TokenClientConfig {
		client_id: string;
		scope: string;
		callback: (response: TokenResponse) => void;
	}

	interface TokenClient {
		requestAccessToken(options?: { prompt?: string }): void;
	}

	function initTokenClient(config: TokenClientConfig): TokenClient;
}
