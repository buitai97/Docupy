"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChatInterface } from "@/app/components/chat-interface";

export default function DocumentPage() {
    const { id } = useParams<{ id: string }>();
    const [docName, setDocName] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`/api/documents/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => { if (data?.name) setDocName(data.name); })
            .catch(() => { });
    }, [id]);

    return (
        <ChatInterface
            title={docName ?? "Document"}
            streamUrl="/api/chat/stream"
            body={(question) => ({ question, documentId: id })}
            historyUrl={`/api/chat/${id}/history`}
            clearUrl={`/api/chat/${id}/history`}
            emptyText="Ask anything about this document."
            placeholder="Ask a question about this document..."
        />
    );
}
