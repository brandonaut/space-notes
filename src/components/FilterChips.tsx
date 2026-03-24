interface FilterChipsProps {
	options: string[];
	selected: Set<string>;
	onChange: (next: Set<string>) => void;
	/** "section" enables an exclusive All chip; "filter" is plain multi-toggle */
	mode: "section" | "filter";
	dataAttr: "data-part" | "data-category";
}

export function FilterChips({
	options,
	selected,
	onChange,
	mode,
	dataAttr,
}: FilterChipsProps) {
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
			<div className="chip-group">
				<button
					type="button"
					className={`chip${allActive ? " active" : ""}`}
					data-part="All"
					onClick={selectAll}
				>
					All
				</button>
				{options.map((opt) => (
					<button
						key={opt}
						type="button"
						className={`chip${selected.has(opt) ? " active" : ""}`}
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

	return (
		<div className="chip-group">
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					className={`chip${selected.has(opt) ? " active" : ""}`}
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
