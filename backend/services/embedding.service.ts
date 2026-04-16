import { openai } from "../config/openai.js";

export const getEmbedding = async (text: string): Promise<number[]> => {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    return response.data[0].embedding;
};
