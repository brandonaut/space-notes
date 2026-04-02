interface FilterChipsProps {
	options: string[];
	selected: Set<string>;
	onChange: (next: Set<string>) => void;
	/** "section" enables an exclusive All chip; "filter" is plain multi-toggle */
	mode: "section" | "filter";
	dataAttr: "data-part" | "data-category";
}

const partActiveColors: Record<string, string> = {
	All: "text-text bg-text/10 border-text",
	Tenor: "text-tenor bg-tenor/12 border-tenor",
	Lead: "text-lead bg-lead/12 border-lead",
	Baritone: "text-bari bg-bari/12 border-bari",
	Bass: "text-bass bg-bass/12 border-bass",
};

const categoryActiveColors: Record<string, string> = {
	Singing: "text-tag-singing bg-tag-singing/12 border-tag-singing",
	Performance:
		"text-tag-performance bg-tag-performance/12 border-tag-performance",
	Musicality: "text-tag-musicality bg-tag-musicality/12 border-tag-musicality",
	Other: "text-tag-other bg-tag-other/12 border-tag-other",
};

function chipActiveClass(
	dataAttr: "data-part" | "data-category",
	opt: string,
): string {
	if (dataAttr === "data-part")
		return partActiveColors[opt] ?? "text-text bg-text/10 border-text";
	return categoryActiveColors[opt] ?? "text-muted bg-surface2 border-border";
}

const BASE_CHIP =
	"flex-shrink-0 px-3 py-1 rounded-full border border-border bg-surface2 text-xs font-medium text-muted cursor-pointer transition-all whitespace-nowrap";

export function FilterChips({
	options,
	selected,
	onChange,
	mode,
	dataAttr,
}: Readonly<FilterChipsProps>) {
	function toggle(opt: string) {
		const next = new Set(selected);
		if (next.has(opt)) next.delete(opt);
		else next.add(opt);
		onChange(next);
	}

	function selectAll() {
		onChange(new Set());
	}

	function selectSection(opt: string) {
		const next = new Set(selected);
		if (next.has(opt)) {
			next.delete(opt);
			// If nothing left selected, revert to All
			if (next.size === 0) {
				onChange(new Set());
				return;
			}
		} else {
			next.add(opt);
		}
		onChange(next);
	}

	if (mode === "section") {
		const allActive = selected.size === 0;
		return (
			<div className="flex flex-wrap gap-1.5">
				<button
					type="button"
					className={`${BASE_CHIP} ${allActive ? chipActiveClass(dataAttr, "All") : ""}`}
					data-part="All"
					onClick={selectAll}
				>
					All
				</button>
				{options.map((opt) => (
					<button
						key={opt}
						type="button"
						className={`${BASE_CHIP} ${selected.has(opt) ? chipActiveClass(dataAttr, opt) : ""}`}
						{...(dataAttr === "data-part"
							? { "data-part": opt }
							: { "data-category": opt })}
						onClick={() => selectSection(opt)}
					>
						{opt}
					</button>
				))}
			</div>
		);
	}

	const allActive = selected.size === 0;
	return (
		<div className="flex flex-wrap gap-1.5">
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					className={`${BASE_CHIP} ${allActive || selected.has(opt) ? chipActiveClass(dataAttr, opt) : ""}`}
					{...(dataAttr === "data-part"
						? { "data-part": opt }
						: { "data-category": opt })}
					onClick={() => toggle(opt)}
				>
					{opt}
				</button>
			))}
		</div>
	);
}
