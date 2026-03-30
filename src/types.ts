export interface Note {
	id: string;
	song: string;
	measure: string;
	date: string;
	parts: string[];
	categories: string[];
	note: string;
	archive: boolean;
	_row: number;
}

export interface Config {
	parts: string[];
	categories: string[];
	songs: string[];
}

export type Screen = "songs" | "detail";

export type View = "measure" | "chron";
