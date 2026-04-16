import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const token = req.headers.get("authorization");

    const upstream = await fetch("http://localhost:5000/api/chat/stream", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
