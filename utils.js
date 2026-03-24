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

export function formatDate(d) {
	if (!d) return "";
	const [y, m, day] = d.split("-");
	return `${MONTHS[+m - 1]} ${+day}, ${y}`;
}

export function measureStart(m) {
	const n = Number.parseInt((m || "0").toString().replace(/[^0-9]/, ""));
	return Number.isNaN(n) ? 9999 : n;
}
