import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/** Max upload size per image file (profile + listing photos). */
export const MAX_IMAGE_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/** Max product images per upload request. */
export const MAX_LISTING_IMAGES_PER_UPLOAD = 10;

/** Max upload size per document file (PDF, EPUB, etc.). */
export const MAX_DOCUMENT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function ensureUploadDirs() {
  for (const dir of ['profiles', 'listings', 'products', 'publications']) {
    const full = path.join(UPLOADS_ROOT, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
}

function diskStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDirs();
      cb(null, path.join(UPLOADS_ROOT, subdir));
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
    },
  });
}

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

export const profileUpload = multer({
  storage: diskStorage('profiles'),
  limits: { fileSize: MAX_IMAGE_FILE_SIZE },
  fileFilter: imageFilter,
}).single('image');

export const listingImagesUpload = multer({
  storage: diskStorage('listings'),
  limits: { fileSize: MAX_IMAGE_FILE_SIZE },
  fileFilter: imageFilter,
}).array('images', MAX_LISTING_IMAGES_PER_UPLOAD);

const documentFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/epub+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, EPUB, Word, text, or image files are allowed'));
  }
};

export const publicationFileUpload = multer({
  storage: diskStorage('publications'),
  limits: { fileSize: MAX_DOCUMENT_FILE_SIZE },
  fileFilter: documentFilter,
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export const publicationCoverUpload = multer({
  storage: diskStorage('publications'),
  limits: { fileSize: MAX_IMAGE_FILE_SIZE },
  fileFilter: imageFilter,
}).single('cover');

export function publicUrl(relativePath: string): string {
  return `/uploads/${relativePath.replace(/\\/g, '/')}`;
}

/** Ensure profile/listing paths work from the frontend via /uploads rewrite. */
export function normalizePublicAssetUrl(path?: string | null): string | null {
  if (!path?.trim()) return null;
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      if (u.pathname.startsWith('/uploads/')) return u.pathname;
    } catch {
      return trimmed;
    }
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('profiles/') || trimmed.startsWith('listings/') || trimmed.startsWith('publications/')) {
    return publicUrl(trimmed);
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function normalizeImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((i): i is string => typeof i === 'string');
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.filter((i): i is string => typeof i === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}
