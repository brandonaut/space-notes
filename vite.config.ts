import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
	base: "/space-notes/",
	define: {
		__APP_VERSION__: JSON.stringify(version),
		__BUILD_DATE__: JSON.stringify(new Date().toISOString()),
	},
	plugins: [
		tailwindcss(),
		react(),
		VitePWA({
			registerType: "autoUpdate",
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg}"],
			},
			manifest: {
				name: "Space Notes",
				short_name: "Space Notes",
				description: "Barbershop rehearsal log",
				theme_color: "#0f0f13",
				background_color: "#0f0f13",
				display: "standalone",
				scope: "/space-notes/",
				start_url: "/space-notes/",
				icons: [
					{
						src: "icon.svg",
						sizes: "any",
						type: "image/svg+xml",
						purpose: "any",
					},
				],
			},
		}),
	],
});
