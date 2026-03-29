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
		<span className="part-pill">
			{parts.map((p) => {
				const active = allActive || selected.has(p);
				return onChange ? (
					<button
						key={p}
						type="button"
						className={`part-pill-seg ${p}${active ? " active" : ""}`}
						onClick={() => toggle(p)}
					>
						{abbrev(p)}
					</button>
				) : (
					<span
						key={p}
						className={`part-pill-seg ${p}${active ? " active" : ""}`}
					>
						{abbrev(p)}
					</span>
				);
			})}
		</span>
	);
}
