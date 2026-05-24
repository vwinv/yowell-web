import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { diskStorage } from "multer";

export const UPLOADS_DIR = join(process.cwd(), "data", "uploads", "products");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const productPhotosStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

export function photoFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error("Format image non supporté (JPEG, PNG, WebP, GIF)"), false);
    return;
  }
  cb(null, true);
}

export function toPublicPhotoPath(filename: string): string {
  return `/uploads/products/${filename}`;
}

export function deletePhotoFiles(photoUrls: string[]): void {
  for (const url of photoUrls) {
    const filename = url.split("/").pop();
    if (!filename) continue;
    const path = join(UPLOADS_DIR, filename);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
