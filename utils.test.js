import { describe, expect, it } from "vitest";
import { formatDate, measureStart } from "./utils.js";

describe("formatDate", () => {
	it("formats a standard date", () => {
		expect(formatDate("2025-03-24")).toBe("Mar 24, 2025");
	});

	it("formats January correctly (month index 0)", () => {
		expect(formatDate("2025-01-01")).toBe("Jan 1, 2025");
	});

	it("formats December correctly (month index 11)", () => {
		expect(formatDate("2025-12-31")).toBe("Dec 31, 2025");
	});

	it("strips leading zero from day", () => {
		expect(formatDate("2025-06-05")).toBe("Jun 5, 2025");
	});

	it("returns empty string for empty input", () => {
		expect(formatDate("")).toBe("");
	});

	it("returns empty string for null", () => {
		expect(formatDate(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatDate(undefined)).toBe("");
	});
});

describe("measureStart", () => {
	it("parses a plain measure number", () => {
		expect(measureStart("32")).toBe(32);
	});

	it("parses measure 1", () => {
		expect(measureStart("1")).toBe(1);
	});

	it("returns 0 for empty string (falls back to '0')", () => {
		expect(measureStart("")).toBe(0);
	});

	it("returns 0 for null", () => {
		expect(measureStart(null)).toBe(0);
	});

	it("returns 9999 for non-numeric string", () => {
		expect(measureStart("abc")).toBe(9999);
	});

	it("returns 9999 for undefined", () => {
		expect(measureStart(undefined)).toBe(0);
	});
});
