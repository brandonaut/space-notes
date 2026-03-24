export interface Note {
	id: string;
	song: string;
	measure: string;
	date: string;
	parts: string[];
	categories: string[];
	note: string;
	resolved: boolean;
	_row: number;
}

export interface Config {
	parts: string[];
	categories: string[];
	songs: string[];
}

export type Screen = "songs" | "detail" | "add";

export type View = "measure" | "chron";
