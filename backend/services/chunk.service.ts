// Matches sentence-ending punctuation followed by whitespace or end of string.
// Handles: periods (incl. abbreviations heuristic), ?, !, and quoted versions.
const SENTENCE_END = /(?<=[.?!]["']?)\s+/;

export const splitText = (text: string, targetSize = 500, overlap = 1): string[] => {
    const sentences = text
        .replace(/\r\n/g, "\n")
        .split(SENTENCE_END)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const chunks: string[] = [];
    let current: string[] = [];
    let currentLen = 0;

    for (const sentence of sentences) {
        if (currentLen + sentence.length > targetSize && current.length > 0) {
            chunks.push(current.join(" "));
            // Keep the last `overlap` sentences in the next chunk for continuity
            current = current.slice(-overlap);
            currentLen = current.reduce((sum, s) => sum + s.length + 1, 0);
        }
        current.push(sentence);
        currentLen += sentence.length + 1;
    }

    if (current.length > 0) chunks.push(current.join(" "));

    return chunks;
};
