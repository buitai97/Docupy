export interface GuestChunk {
    content: string;
    embedding: number[];
}

interface GuestSession {
    chunks: GuestChunk[];
    name: string;
    createdAt: number;
}

const sessions = new Map<string, GuestSession>();

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Purge expired sessions every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
        if (now - session.createdAt > TTL_MS) sessions.delete(id);
    }
}, 30 * 60 * 1000);

export function createGuestSession(chunks: GuestChunk[], name: string): string {
    const id = crypto.randomUUID();
    sessions.set(id, { chunks, name, createdAt: Date.now() });
    return id;
}

export function getGuestSession(id: string): GuestSession | undefined {
    return sessions.get(id);
}
