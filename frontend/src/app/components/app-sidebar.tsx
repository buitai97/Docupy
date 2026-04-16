"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Collapsible } from "radix-ui";
import {
    Bot,
    ChevronRight,
    FileText,
    Loader2,
    LogOut,
    MessageSquare,
    Pencil,
    Settings,
    Trash2,
    Upload,
    User,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";

const navItems = [
    { label: "Upload Document", href: "/", icon: Upload },
];

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [documents, setDocuments] = useState<{ document_id: string; name: string | null }[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        setUserName(localStorage.getItem("user_name"));
        setUserEmail(localStorage.getItem("user_email"));
    }, []);

    useEffect(() => {
        setLoading(true);
        const token = localStorage.getItem("token");
        fetch("/api/documents", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setDocuments(data))
            .catch(() => setDocuments([]))
            .finally(() => setLoading(false));
    }, [pathname]);

    const startEditing = (doc: { document_id: string; name: string | null }) => {
        setEditingId(doc.document_id);
        setEditingName(doc.name ?? "");
        setTimeout(() => editInputRef.current?.select(), 0);
    };

    const commitRename = async (documentId: string) => {
        const name = editingName.trim();
        setEditingId(null);
        if (!name) return;
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ name }),
        });
        if (res.ok) {
            setDocuments((prev) =>
                prev.map((d) => d.document_id === documentId ? { ...d, name } : d)
            );
        }
    };

    const deleteDocument = async (documentId: string) => {
        const token = localStorage.getItem("token");
        setDeletingId(documentId);
        try {
            await fetch(`/api/documents/${documentId}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            setDocuments((prev) => prev.filter((d) => d.document_id !== documentId));
            if (pathname === `/documents/${documentId}`) router.push("/");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Sidebar>
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="font-semibold text-sm">Docupy</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton asChild isActive={pathname === item.href}>
                                            <Link href={item.href}>
                                                <Icon className="h-4 w-4" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}

                            {/* Logged-in only items */}
                            {userName && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/chat"}>
                                        <Link href="/chat">
                                            <MessageSquare className="h-4 w-4" />
                                            <span>Chat All Documents</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}

                            {/* My Documents collapsible */}
                            {userName && <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
                                <SidebarMenuItem>
                                    <Collapsible.Trigger asChild>
                                        <SidebarMenuButton>
                                            <FileText className="h-4 w-4" />
                                            <span>My Documents</span>
                                            <ChevronRight
                                                className="ml-auto h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90"
                                                data-state={open ? "open" : "closed"}
                                            />
                                        </SidebarMenuButton>
                                    </Collapsible.Trigger>

                                    <Collapsible.Content>
                                        <SidebarMenuSub>
                                            {loading ? (
                                                <SidebarMenuSubItem>
                                                    <SidebarMenuSubButton>
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        <span>Loading...</span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ) : documents.length === 0 ? (
                                                <SidebarMenuSubItem>
                                                    <SidebarMenuSubButton>
                                                        <span className="text-muted-foreground">No documents yet</span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ) : (
                                                documents.map((doc) => (
                                                    <SidebarMenuSubItem key={doc.document_id}>
                                                        <div className="group flex items-center w-full">
                                                            {editingId === doc.document_id ? (
                                                                <input
                                                                    ref={editInputRef}
                                                                    value={editingName}
                                                                    onChange={(e) => setEditingName(e.target.value)}
                                                                    onBlur={() => commitRename(doc.document_id)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") commitRename(doc.document_id);
                                                                        if (e.key === "Escape") setEditingId(null);
                                                                    }}
                                                                    className="flex-1 min-w-0 bg-background border rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                                                                />
                                                            ) : (
                                                                <SidebarMenuSubButton asChild className="flex-1 min-w-0">
                                                                    <Link href={`/documents/${doc.document_id}`}>
                                                                        <span className="truncate text-xs">
                                                                            {doc.name ?? doc.document_id.slice(0, 8) + "…"}
                                                                        </span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            )}
                                                            {editingId !== doc.document_id && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.preventDefault(); startEditing(doc); }}
                                                                        className="ml-1 shrink-0 p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteDocument(doc.document_id)}
                                                                        disabled={deletingId === doc.document_id}
                                                                        className="ml-1 shrink-0 p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                                                    >
                                                                        {deletingId === doc.document_id
                                                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                            : <Trash2 className="h-3 w-3" />
                                                                        }
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </SidebarMenuSubItem>
                                                ))
                                            )}
                                        </SidebarMenuSub>
                                    </Collapsible.Content>
                                </SidebarMenuItem>
                            </Collapsible.Root>}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-2">
                <SidebarMenu>
                    {userName && (
                        <SidebarMenuItem>
                            <SidebarMenuButton className="cursor-default hover:bg-transparent">
                                <User className="h-4 w-4 shrink-0" />
                                <div className="flex flex-col leading-none overflow-hidden">
                                    <span className="truncate text-sm font-medium">{userName}</span>
                                    {userEmail && (
                                        <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                                    )}
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/settings">
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {userName && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("user_name");
                                    localStorage.removeItem("user_email");
                                    window.location.reload();
                                }}
                                className="text-destructive hover:text-destructive"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Log out</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
