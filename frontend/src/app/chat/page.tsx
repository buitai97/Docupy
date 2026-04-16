"use client";

import { ChatInterface } from "@/app/components/chat-interface";

export default function AllDocsChatPage() {
    return (
        <ChatInterface
            title="Chat with all documents"
            streamUrl="/api/chat/all/stream"
            body={(question) => ({ question })}
            historyUrl="/api/chat/__all__/history"
            clearUrl="/api/chat/__all__/history"
            emptyText="Ask anything across all your documents."
            placeholder="Ask a question across all your documents..."
        />
    );
}
