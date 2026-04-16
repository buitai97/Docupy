import { openai } from "../config/openai.js";

const MESSAGES = (context: string, question: string) => [
    {
        role: "system" as const,
        content: "You are an assistant that answers questions based on the provided document context.",
    },
    {
        role: "user" as const,
        content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
];

export const askAI = async (context: string, question: string): Promise<string> => {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: MESSAGES(context, question),
    });

    return response.choices[0].message.content ?? "Sorry, I couldn't generate a response.";
};

export const streamAI = (context: string, question: string) =>
    openai.chat.completions.stream({
        model: "gpt-4o-mini",
        messages: MESSAGES(context, question),
    });
