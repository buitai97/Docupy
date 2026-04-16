import { describe, it, expect, beforeEach } from "vitest";
import { createGuestSession, getGuestSession } from "../services/guest-session.service.js";

describe("guest-session.service", () => {
    describe("createGuestSession", () => {
        it("returns a non-empty string ID", () => {
            const id = createGuestSession([], "doc");
            expect(typeof id).toBe("string");
            expect(id.length).toBeGreaterThan(0);
        });

        it("returns a UUID-formatted string", () => {
            const uuidPattern =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const id = createGuestSession([], "doc");
            expect(id).toMatch(uuidPattern);
        });

        it("returns distinct IDs on successive calls", () => {
            const ids = Array.from({ length: 5 }, () => createGuestSession([], "doc"));
            const unique = new Set(ids);
            expect(unique.size).toBe(5);
        });

        it("stores the provided chunks", () => {
            const chunks = [
                { content: "hello", embedding: [0.1, 0.2] },
                { content: "world", embedding: [0.3, 0.4] },
            ];
            const id = createGuestSession(chunks, "my-doc");
            const session = getGuestSession(id)!;
            expect(session.chunks).toHaveLength(2);
            expect(session.chunks[0].content).toBe("hello");
            expect(session.chunks[1].content).toBe("world");
        });

        it("stores the provided name", () => {
            const id = createGuestSession([], "test-document");
            const session = getGuestSession(id)!;
            expect(session.name).toBe("test-document");
        });

        it("records createdAt within the current time window", () => {
            const before = Date.now();
            const id = createGuestSession([], "ts-test");
            const after = Date.now();
            const session = getGuestSession(id)!;
            expect(session.createdAt).toBeGreaterThanOrEqual(before);
            expect(session.createdAt).toBeLessThanOrEqual(after);
        });

        it("stores an empty chunks array without error", () => {
            const id = createGuestSession([], "empty");
            const session = getGuestSession(id)!;
            expect(session.chunks).toHaveLength(0);
        });
    });

    describe("getGuestSession", () => {
        it("returns the correct session for a valid ID", () => {
            const chunks = [{ content: "foo", embedding: [1, 0] }];
            const id = createGuestSession(chunks, "lookup-test");
            const session = getGuestSession(id);
            expect(session).toBeDefined();
            expect(session!.name).toBe("lookup-test");
        });

        it("returns undefined for an unknown ID", () => {
            expect(getGuestSession("00000000-0000-0000-0000-000000000000")).toBeUndefined();
        });

        it("returns undefined for an empty string", () => {
            expect(getGuestSession("")).toBeUndefined();
        });

        it("does not mix up sessions with different IDs", () => {
            const id1 = createGuestSession([{ content: "a", embedding: [1] }], "doc-a");
            const id2 = createGuestSession([{ content: "b", embedding: [2] }], "doc-b");
            expect(getGuestSession(id1)!.name).toBe("doc-a");
            expect(getGuestSession(id2)!.name).toBe("doc-b");
        });

        it("returns the same object on repeated lookups", () => {
            const id = createGuestSession([], "repeat");
            expect(getGuestSession(id)).toBe(getGuestSession(id));
        });
    });
});
