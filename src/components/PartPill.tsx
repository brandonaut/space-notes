const ABBREVS: Record<string, string> = {
	Tenor: "T",
	Lead: "L",
	Baritone: "Br",
	Bass: "B",
};

function abbrev(part: string): string {
	return ABBREVS[part] ?? part.slice(0, 2);
}

interface PartPillProps {
	parts: string[];
	selected: Set<string>;
	onChange?: (next: Set<string>) => void;
}

const partColors: Record<string, string> = {
	Tenor: "text-tenor",
	Lead: "text-lead",
	Baritone: "text-bari",
	Bass: "text-bass",
};

export function PartPill({ parts, selected, onChange }: PartPillProps) {
	const allActive = selected.size === 0;

	function toggle(part: string) {
		if (!onChange) return;
		const next = new Set(selected);
		if (next.has(part)) {
			next.delete(part);
			if (next.size === 0) {
				onChange(new Set());
				return;
			}
		} else {
			next.add(part);
		}
		onChange(next);
	}

	return (
		<span className="inline-flex items-stretch bg-surface2 border border-border rounded-md overflow-hidden">
			{parts.map((p) => {
				const active = allActive || selected.has(p);
				const colorClass = active
					? (partColors[p] ?? "text-muted")
					: "text-muted";
				const segClass = `text-xs font-bold py-1 px-2 border-r border-border last:border-r-0 bg-transparent leading-none ${colorClass} ${active ? "opacity-100" : "opacity-30"}`;
				return onChange ? (
					<button
						key={p}
						type="button"
						className={`${segClass} cursor-pointer transition-opacity ${active ? "hover:opacity-75" : "hover:opacity-60"}`}
						onClick={() => toggle(p)}
					>
						{abbrev(p)}
					</button>
				) : (
					<span key={p} className={segClass}>
						{abbrev(p)}
					</span>
				);
			})}
		</span>
	);
}
