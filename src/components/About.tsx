import { ArrowLeft, Github } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function About() {
	const navigate = useNavigate();
	const buildDate = new Date(__BUILD_DATE__).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="p-5 max-w-lg mx-auto">
			<button
				type="button"
				className="flex items-center gap-1.5 text-sm text-muted mb-6 hover:text-text transition-colors cursor-pointer bg-transparent border-none p-0"
				onClick={() => navigate(-1)}
			>
				<ArrowLeft size={15} />
				Back
			</button>

			<h2 className="font-serif text-2xl text-accent mb-1">Space Notes</h2>
			<p className="text-sm text-muted mb-8">Barbershop rehearsal log</p>

			<div className="flex flex-col gap-3 text-sm border-t border-border pt-5">
				<div className="flex justify-between">
					<span className="text-muted">Version</span>
					<span className="text-text font-mono">{__APP_VERSION__}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted">Last updated</span>
					<span className="text-text">{buildDate}</span>
				</div>
			</div>

			<div className="mt-8">
				<a
					href="https://github.com/brandonaut/space-notes"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors"
				>
					<Github size={16} />
					brandonaut/space-notes
				</a>
			</div>
		</div>
	);
}
