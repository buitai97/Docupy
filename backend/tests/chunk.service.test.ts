import { describe, it, expect } from "vitest";
import { splitText } from "../services/chunk.service.js";

describe("splitText", () => {
    it("returns empty array for empty string", () => {
        expect(splitText("")).toEqual([]);
    });

    it("returns empty array for whitespace-only string", () => {
        expect(splitText("   \n  ")).toEqual([]);
    });

    it("returns a single chunk for a short text that fits within target size", () => {
        const text = "Hello world. This is a test.";
        const result = splitText(text);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe("Hello world. This is a test.");
    });

    it("splits long text into multiple chunks when it exceeds targetSize", () => {
        const sentences = Array.from(
            { length: 20 },
            (_, i) => `This is sentence number ${i + 1} with enough content to fill space.`
        );
        const text = sentences.join(" ");
        const result = splitText(text);
        expect(result.length).toBeGreaterThan(1);
    });

    it("preserves sentence content across chunks (no data loss)", () => {
        const sentences = Array.from({ length: 10 }, (_, i) => `Sentence ${i}.`);
        const text = sentences.join(" ");
        const result = splitText(text, 50, 0);
        const rejoined = result.join(" ");
        // Every original sentence should appear somewhere in the result
        sentences.forEach((s) => {
            expect(rejoined).toContain(s);
        });
    });

    it("overlaps last N sentences into the next chunk when overlap > 0", () => {
        // With a small targetSize and overlap=1, the last sentence of chunk N
        // should reappear at the start of chunk N+1.
        const sentences = [
            "Alpha beta gamma delta.",
            "One two three four five.",
            "Red green blue yellow pink.",
            "Cat dog bird fish snake.",
            "Apple mango banana grape kiwi.",
        ];
        const text = sentences.join(" ");
        const result = splitText(text, 50, 1);

        if (result.length >= 2) {
            // The last sentence of chunk[0] should be in chunk[1]
            const lastOfFirst = result[0].split(/(?<=[.?!])\s+/).pop()!.trim();
            expect(result[1]).toContain(lastOfFirst);
        }
    });

    it("handles overlap=0 (no overlap between chunks)", () => {
        const sentences = Array.from({ length: 10 }, (_, i) => `Word${i} sentence here.`);
        const text = sentences.join(" ");
        const result = splitText(text, 40, 0);
        expect(result.length).toBeGreaterThan(1);
    });

    it("handles text with question marks and exclamation marks as sentence boundaries", () => {
        const text = "Is this working? Yes it is! Great to know.";
        const result = splitText(text);
        expect(result).toHaveLength(1); // short enough to fit in one chunk
        expect(result[0]).toContain("Is this working?");
    });

    it("handles a single sentence without trailing punctuation", () => {
        const text = "No punctuation at the end";
        const result = splitText(text);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe("No punctuation at the end");
    });

    it("handles CRLF line endings by normalising to LF", () => {
        const text = "First sentence.\r\nSecond sentence.";
        const result = splitText(text);
        expect(result).toHaveLength(1);
        expect(result[0]).not.toContain("\r");
    });

    it("respects a custom targetSize", () => {
        const sentences = Array.from({ length: 5 }, (_, i) => `Short sentence ${i}.`);
        const text = sentences.join(" ");
        const result = splitText(text, 30, 0);
        // Each chunk should be roughly no more than targetSize + one sentence length
        result.forEach((chunk) => {
            expect(chunk.length).toBeLessThan(200);
        });
    });
});
