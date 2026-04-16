"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, BookOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Source {
    content: string;
    name?: string | null;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
}

interface Props {
    title: string;
    streamUrl: string;
    body: (question: string) => Record<string, string>;
    historyUrl?: string;
    clearUrl?: string;
    emptyText?: string;
    placeholder?: string;
}

export function ChatInterface({ title, streamUrl, body, historyUrl, clearUrl, emptyText, placeholder }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [openSourceIdx, setOpenSourceIdx] = useState<number | null>(null);
    const [clearing, setClearing] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!historyUrl) return;
        const token = localStorage.getItem("token");
        fetch(historyUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((res) => res.ok ? res.json() : [])
            .then((data: Message[]) => setMessages(data))
            .catch(() => {});
    }, [historyUrl]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const clearHistory = async () => {
        if (!clearUrl || clearing) return;
        setClearing(true);
        const token = localStorage.getItem("token");
        await fetch(clearUrl, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setMessages([]);
        setOpenSourceIdx(null);
        setClearing(false);
    };

    const sendMessage = async () => {
        const question = input.trim();
        if (!question || loading) return;

        setMessages((prev) => [...prev, { role: "user", content: question }]);
        setInput("");
        setLoading(true);
        setOpenSourceIdx(null);
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(streamUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(body(question)),
            });

            if (!res.ok || !res.body) {
                setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: "Failed to get a response." },
                ]);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);
                    if (payload === "[ERROR]") break;
                    if (payload === "[DONE]") continue;
                    if (payload.startsWith("[SOURCES]")) {
                        const sources: Source[] = JSON.parse(payload.slice(9));
                        setMessages((prev) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = { ...updated[updated.length - 1], sources };
                            return updated;
                        });
                        continue;
                    }
                    const token = JSON.parse(payload) as string;
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            ...updated[updated.length - 1],
                            content: updated[updated.length - 1].content + token,
                        };
                        return updated;
                    });
                }
            }
        } catch {
            setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: "An error occurred. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-3rem)] flex-col">
            <div className="flex items-center justify-between px-6 py-4">
                <h1 className="text-lg font-semibold">{title}</h1>
                {clearUrl && messages.length > 0 && (
                    <button
                        onClick={clearHistory}
                        disabled={clearing || loading}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear history
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                            {emptyText ?? "Ask a question to get started."}
                        </p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex items-start gap-3",
                            msg.role === "user" && "flex-row-reverse"
                        )}
                    >
                        <div className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                            msg.role === "assistant"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                        )}>
                            {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col gap-2 max-w-[75%]">
                            <div className={cn(
                                "rounded-lg px-4 py-2 text-sm",
                                msg.role === "assistant"
                                    ? "bg-muted prose prose-sm dark:prose-invert max-w-none"
                                    : "bg-primary text-primary-foreground"
                            )}>
                                {msg.role === "assistant"
                                    ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    : msg.content
                                }
                            </div>

                            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => setOpenSourceIdx(openSourceIdx === i ? null : i)}
                                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                                    >
                                        <BookOpen className="h-3 w-3" />
                                        {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""}
                                    </button>
                                    {openSourceIdx === i && (
                                        <div className="flex flex-col gap-2 mt-1">
                                            {msg.sources.map((src, j) => (
                                                <div key={j} className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                                                    {src.name && (
                                                        <p className="font-medium text-foreground mb-1">{src.name}</p>
                                                    )}
                                                    <p className="line-clamp-3">{src.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="border-t px-6 py-4">
                <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                    className="flex gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholder ?? "Ask a question..."}
                        disabled={loading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={loading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
