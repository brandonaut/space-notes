import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../app.css";
import { App } from "./components/App";

// biome-ignore lint/style/noNonNullAssertion: root element always exists
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
