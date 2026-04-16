import fs from "fs";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const ACCEPTED_MIMETYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
];

export async function extractText(filePath: string, mimetype: string): Promise<string> {
    if (mimetype === "application/pdf") {
        const buffer = await fs.promises.readFile(filePath);
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        return data.text;
    }

    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const { value } = await mammoth.extractRawText({ path: filePath });
        return value;
    }

    // text/plain
    return fs.promises.readFile(filePath, "utf-8");
}
