"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface AuthUser {
    id: number;
    email: string;
    name: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue>({ user: null, setUser: () => {} });

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        async function init() {
            const token = localStorage.getItem("token");
            if (!token) { setReady(true); return; }

            try {
                const res = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user_name");
                } else {
                    const data = await res.json();
                    localStorage.setItem("user_name", data.name ?? data.email ?? "Account");
                    setUser(data);
                }
            } catch {}

            setReady(true);
        }

        init();
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {!ready && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
            {children}
        </AuthContext.Provider>
    );
}
