"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";


type Mode = "login" | "register";

function AuthForm({ mode, onSuccess }: { mode: Mode; onSuccess: () => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const url = mode === "login"
                ? "/api/auth/login"
                : "/api/auth/register";
            const body = mode === "login"
                ? { email, password }
                : { name, email, password };

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            console.log("Authentication response:", data);
            if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
            localStorage.setItem("token", data.token);
            if (data.user?.name) localStorage.setItem("user_name", data.user.name);
            if (data.user?.email) localStorage.setItem("user_email", data.user.email);
            onSuccess();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
                <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>
            )}
            <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === "login" ? "Signing in…" : "Creating account…"}</>
                ) : (
                    mode === "login" ? "Sign in" : "Create account"
                )}
            </Button>
        </form>
    );
}

export function AuthModal() {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("login");
    const { user } = useAuth();

    const openLogin = () => { setMode("login"); setOpen(true); };
    const openRegister = () => { setMode("register"); setOpen(true); };

    const handleSuccess = () => {
        setOpen(false);
        window.location.reload();
    };

    if (user) {
        return <span className="text-sm font-medium">{user.name ?? user.email}</span>;
    }

    return (
        <>
            <Button variant="ghost" size="sm" onClick={openLogin}>Login</Button>
            <Button size="sm" onClick={openRegister}>Sign up</Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader className="items-center text-center">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Bot className="h-5 w-5" />
                        </div>
                        <DialogTitle>
                            {mode === "login" ? "Welcome back" : "Create an account"}
                        </DialogTitle>
                        <DialogDescription>
                            {mode === "login"
                                ? "Sign in to your Docupy account"
                                : "Get started with Docupy for free"}
                        </DialogDescription>
                    </DialogHeader>

                    <AuthForm mode={mode} onSuccess={handleSuccess} />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => { window.location.href = "/api/auth/google"; }}
                    >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        {mode === "login" ? (
                            <>Don&apos;t have an account?{" "}
                                <button onClick={() => setMode("register")} className="font-medium underline underline-offset-2 hover:text-foreground">
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>Already have an account?{" "}
                                <button onClick={() => setMode("login")} className="font-medium underline underline-offset-2 hover:text-foreground">
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </DialogContent>
            </Dialog>
        </>
    );
}
