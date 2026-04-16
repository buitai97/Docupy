"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIZE_MB = 20;

export default function Home() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");

    const handleFile = useCallback((f: File | null) => {
        const ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
        if (!f) return;
        if (!ACCEPTED_TYPES.includes(f.type)) {
            setError("Only PDF, DOCX, and TXT files are supported.");
            return;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
            return;
        }
        setError("");
        setFile(f);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0] ?? null);
    }, [handleFile]);

    const handleUpload = () => {
        if (!file) return;
        const token = localStorage.getItem("token");
        const isGuest = !token;

        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", isGuest ? "/api/upload/guest" : "/api/upload");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
            const body = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
                if (isGuest) {
                    router.push(`/guest/${body.sessionId}?name=${encodeURIComponent(body.name)}`);
                } else {
                    router.push(`/documents/${body.documentId}`);
                }
            } else {
                setError(body.message ?? "Upload failed. Please try again.");
                setIsUploading(false);
                setProgress(0);
            }
        };

        xhr.onerror = () => {
            setError("Upload failed. Please try again.");
            setIsUploading(false);
            setProgress(0);
        };

        setIsUploading(true);
        setError("");
        setProgress(0);
        xhr.send(formData);
    };

    return (
        <div className="flex h-[calc(100vh-3rem)] flex-col items-center justify-center px-6">
            <div className="w-full max-w-lg space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Upload a document</h1>
                    <p className="text-sm text-muted-foreground">
                        Upload a PDF and start asking questions about its content. Sign in to save your documents.
                    </p>
                </div>

                {/* Drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => document.getElementById("file-input")?.click()}
                    className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors",
                        isDragging
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                    )}
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium">
                            Drag & drop or{" "}
                            <span className="text-primary underline underline-offset-2">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT — up to 20 MB</p>
                    </div>
                    <input
                        id="file-input"
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    />
                </div>

                {/* Selected file */}
                {file && (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                        <FileText className="h-5 w-5 shrink-0 text-primary" />
                        <span className="flex-1 truncate text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button
                            onClick={() => setFile(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                {isUploading && (
                    <div className="space-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full bg-primary transition-all duration-200"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-right text-xs text-muted-foreground">{progress}%</p>
                    </div>
                )}

                <Button
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className="w-full"
                >
                    {isUploading ? "Uploading…" : "Upload & Start Chatting"}
                </Button>
            </div>
        </div>
    );
}
