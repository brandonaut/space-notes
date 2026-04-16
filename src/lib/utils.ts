const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function formatDate(d: string | null | undefined): string {
	if (!d) return "";
	const [y, m, day] = d.split("-");
	return `${MONTHS[+m - 1]} ${+day}, ${y}`;
}

export function measureStart(m: string | null | undefined): number {
	const n = Number.parseInt((m || "0").toString().replace(/\D/, ""));
	return Number.isNaN(n) ? 9999 : n;
}
