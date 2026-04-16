"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";

const spinner = (
    <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
);

function AuthCallback() {
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");
        if (token) {
            localStorage.setItem("token", token);
            try {
                const payload = jwtDecode<{ name?: string; email?: string }>(token);
                if (payload.name) localStorage.setItem("user_name", payload.name);
                if (payload.email) localStorage.setItem("user_email", payload.email);
            } catch { }
        }
        window.location.href = "/";
    }, [params]);

    return spinner;
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={spinner}>
            <AuthCallback />
        </Suspense>
    );
}
