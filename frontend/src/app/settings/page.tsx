"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Profile {
    id: number;
    name: string;
    email: string;
    hasPassword: boolean;
    isGoogleUser: boolean;
    createdAt: string;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border p-6 space-y-4">
            <div>
                <h2 className="text-base font-semibold">{title}</h2>
                {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {children}
        </div>
    );
}

function StatusMessage({ message, isError }: { message: string; isError: boolean }) {
    return (
        <p className={`text-sm ${isError ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
            {message}
        </p>
    );
}

export default function SettingsPage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loadError, setLoadError] = useState("");

    // Profile form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [profileStatus, setProfileStatus] = useState({ message: "", isError: false });
    const [savingProfile, setSavingProfile] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStatus, setPasswordStatus] = useState({ message: "", isError: false });
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch("/api/auth/profile", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((res) => res.ok ? res.json() : Promise.reject())
            .then((data: Profile) => {
                setProfile(data);
                setName(data.name);
                setEmail(data.email);
            })
            .catch(() => setLoadError("Failed to load profile."));
    }, []);

    const saveProfile = async () => {
        setSavingProfile(true);
        setProfileStatus({ message: "", isError: false });
        const token = localStorage.getItem("token");
        const res = await fetch("/api/auth/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ name, email }),
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("user_name", data.user.name);
            localStorage.setItem("user_email", data.user.email);
            if (data.token) localStorage.setItem("token", data.token);
            setProfile((p) => p ? { ...p, name: data.user.name, email: data.user.email } : p);
            setProfileStatus({ message: "Profile updated.", isError: false });
        } else {
            setProfileStatus({ message: data.message ?? "Update failed.", isError: true });
        }
        setSavingProfile(false);
    };

    const savePassword = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordStatus({ message: "Passwords do not match.", isError: true });
            return;
        }
        setSavingPassword(true);
        setPasswordStatus({ message: "", isError: false });
        const token = localStorage.getItem("token");
        const res = await fetch("/api/auth/password", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (res.ok) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordStatus({ message: "Password updated.", isError: false });
        } else {
            setPasswordStatus({ message: data.message ?? "Password change failed.", isError: true });
        }
        setSavingPassword(false);
    };

    if (loadError) {
        return (
            <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
                <p className="text-sm text-destructive">{loadError}</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-xl px-6 py-10 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account preferences.</p>
            </div>

            <Section title="Profile" description="Update your display name and email address.">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div>
                {profileStatus.message && <StatusMessage {...profileStatus} />}
                <Button
                    onClick={saveProfile}
                    disabled={savingProfile || !name.trim() || !email.trim()}
                    size="sm"
                >
                    {savingProfile ? "Saving…" : "Save changes"}
                </Button>
            </Section>

            {profile.hasPassword && (
                <Section title="Password" description="Change your login password.">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="current-password">Current password</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="new-password">New password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="confirm-password">Confirm new password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    {passwordStatus.message && <StatusMessage {...passwordStatus} />}
                    <Button
                        onClick={savePassword}
                        disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                        size="sm"
                    >
                        {savingPassword ? "Updating…" : "Update password"}
                    </Button>
                </Section>
            )}

            <Section title="Account">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Member since</span>
                        <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Login method</span>
                        <span>{profile.isGoogleUser ? "Google" : "Email"}{profile.isGoogleUser && profile.hasPassword ? " + Password" : ""}</span>
                    </div>
                </div>
            </Section>
        </div>
    );
}
