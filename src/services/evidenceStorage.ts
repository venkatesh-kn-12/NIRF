import path from "path";
import crypto from "crypto";
import { mkdir, writeFile, readFile, unlink, stat } from "fs/promises";

// Storage directory outside the public folder
export const STORAGE_DIR = path.resolve(process.cwd(), "storage", "evidences");

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/csv": [".csv"],
  "application/csv": [".csv"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".csv", ".png", ".jpg", ".jpeg"];

export interface StoredFileInfo {
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
}

export function sanitizeFileName(fileName: string): string {
  // Strip path information (prevent path traversal)
  const base = path.basename(fileName);
  // Remove non-alphanumeric characters except basic safe punctuation
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized.slice(0, 200); // Reasonable length limit
}

export async function storeEvidenceFile(
  buffer: Buffer,
  originalFileName: string,
  declaredMimeType?: string
): Promise<StoredFileInfo> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit of 50 MB`);
  }

  const safeOriginalName = sanitizeFileName(originalFileName);
  const ext = path.extname(safeOriginalName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `File extension '${ext}' is not permitted. Allowed formats: PDF, DOCX, XLSX, CSV, PNG, JPG`
    );
  }

  const mimeType = declaredMimeType || "application/octet-stream";

  // Compute cryptographic SHA-256 checksum
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  // Generate unique, collision-resistant stored filename
  const uniquePrefix = `${Date.now()}_${crypto.randomUUID().slice(0, 12)}`;
  const storedFileName = `${uniquePrefix}${ext}`;

  // Ensure storage directory exists outside of public/
  await mkdir(STORAGE_DIR, { recursive: true });

  const storagePath = path.resolve(STORAGE_DIR, storedFileName);

  // Security barrier against path traversal
  if (!storagePath.startsWith(STORAGE_DIR)) {
    throw new Error("Security violation: Path traversal detected");
  }

  // Atomic write
  await writeFile(storagePath, buffer);

  return {
    originalFileName: safeOriginalName,
    storedFileName,
    storagePath,
    mimeType,
    fileSize: buffer.length,
    checksum,
  };
}

export async function readEvidenceFile(storedFileName: string): Promise<Buffer> {
  const safeName = path.basename(storedFileName);
  const filePath = path.resolve(STORAGE_DIR, safeName);

  if (!filePath.startsWith(STORAGE_DIR)) {
    throw new Error("Security violation: Path traversal detected");
  }

  return await readFile(filePath);
}

export async function deleteEvidenceFile(storedFileName: string): Promise<boolean> {
  try {
    const safeName = path.basename(storedFileName);
    const filePath = path.resolve(STORAGE_DIR, safeName);
    if (!filePath.startsWith(STORAGE_DIR)) return false;
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

