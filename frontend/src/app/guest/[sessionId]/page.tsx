"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChatInterface } from "@/app/components/chat-interface";

function GuestChat() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const searchParams = useSearchParams();
    const name = searchParams.get("name") ?? "Document";

    return (
        <ChatInterface
            title={name}
            streamUrl="/api/chat/guest/stream"
            body={(question) => ({ question, sessionId })}
            emptyText="Ask anything about this document. Your session is temporary and won't be saved."
            placeholder="Ask a question about this document..."
        />
    );
}

export default function GuestChatPage() {
    return (
        <Suspense>
            <GuestChat />
        </Suspense>
    );
}
