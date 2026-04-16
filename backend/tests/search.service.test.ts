import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "../services/search.service.js";

describe("cosineSimilarity", () => {
    it("returns 1 for identical non-zero vectors", () => {
        const a = [1, 2, 3];
        expect(cosineSimilarity(a, a)).toBeCloseTo(1);
    });

    it("returns 1 for parallel vectors (positive scalar multiple)", () => {
        const a = [1, 0, 0];
        const b = [5, 0, 0];
        expect(cosineSimilarity(a, b)).toBeCloseTo(1);
    });

    it("returns 0 for orthogonal vectors", () => {
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it("returns -1 for exactly opposite vectors", () => {
        expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    });

    it("returns the correct value for arbitrary vectors", () => {
        const a = [1, 2, 3];
        const b = [4, 5, 6];
        const dot = 1 * 4 + 2 * 5 + 3 * 6; // 32
        const magA = Math.sqrt(1 + 4 + 9); // sqrt(14)
        const magB = Math.sqrt(16 + 25 + 36); // sqrt(77)
        expect(cosineSimilarity(a, b)).toBeCloseTo(dot / (magA * magB));
    });

    it("returns NaN when a vector is all zeros", () => {
        expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBeNaN();
    });

    it("is symmetric: similarity(a, b) === similarity(b, a)", () => {
        const a = [0.2, 0.8, 0.5];
        const b = [0.9, 0.1, 0.3];
        expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
    });

    it("works with single-element vectors", () => {
        expect(cosineSimilarity([3], [5])).toBeCloseTo(1);
        expect(cosineSimilarity([3], [-5])).toBeCloseTo(-1);
    });

    it("handles vectors with negative components", () => {
        const a = [-1, 2, -3];
        const b = [1, -2, 3];
        // These are opposite, so similarity should be -1
        expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
    });

    it("works with high-dimensional unit vectors", () => {
        const dim = 1536;
        const val = 1 / Math.sqrt(dim);
        const a = Array(dim).fill(val);
        const b = Array(dim).fill(val);
        expect(cosineSimilarity(a, b)).toBeCloseTo(1);
    });
});
