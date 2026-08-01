import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { normalizePublicAssetUrl, publicUrl } from '../middleware/upload.middleware';
import { AppError } from '../utils/errors';

export type UploadFolder = 'profiles' | 'listings' | 'publications' | 'farm-media' | 'product-media' | 'ads';

let cloudinaryConfigured = false;

const STORAGE_NOT_CONFIGURED_MESSAGE =
  'File uploads are temporarily unavailable. Please try again later.';

const EPHEMERAL_FILE_MISSING_MESSAGE =
  'This file is no longer available. Please contact support if you need assistance.';

export function isCloudStorageEnabled(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export function isRemoteStorageUrl(url: string): boolean {
  const normalized = url.trim();
  return normalized.startsWith('http://') || normalized.startsWith('https://');
}

/** Render and similar hosts wipe local disk on redeploy — require Cloudinary in production. */
export function assertPersistentStorageAvailable(): void {
  if (process.env.NODE_ENV === 'production' && !isCloudStorageEnabled()) {
    throw new AppError(503, STORAGE_NOT_CONFIGURED_MESSAGE, 'STORAGE_NOT_CONFIGURED');
  }
}

function ensureCloudinaryConfig() {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  cloudinaryConfigured = true;
}

function removeLocalFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* best-effort cleanup */
  }
}

async function uploadToCloudinary(
  filePath: string,
  folder: UploadFolder,
  resourceType: 'auto' | 'video' | 'image' | 'raw' = 'auto'
): Promise<{ url: string; duration?: number }> {
  ensureCloudinaryConfig();
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `ani-platform/${folder}`,
    resource_type: resourceType,
  });
  return {
    url: result.secure_url,
    duration: typeof result.duration === 'number' ? result.duration : undefined,
  };
}

/** Persist a multer disk upload and return the public URL stored in the database. */
export async function persistUploadedFile(
  file: Express.Multer.File,
  folder: UploadFolder
): Promise<string> {
  assertPersistentStorageAvailable();
  if (isCloudStorageEnabled()) {
    const { url } = await uploadToCloudinary(file.path, folder);
    removeLocalFile(file.path);
    return url;
  }
  return publicUrl(`${folder}/${file.filename}`);
}

/** Persist a publication PDF or cover image; PDFs use Cloudinary raw storage for reliable delivery. */
export async function persistPublicationFile(
  file: Express.Multer.File,
  kind: 'document' | 'cover'
): Promise<string> {
  assertPersistentStorageAvailable();
  if (isCloudStorageEnabled()) {
    const resourceType = kind === 'document' ? 'raw' : 'image';
    const { url } = await uploadToCloudinary(file.path, 'publications', resourceType);
    removeLocalFile(file.path);
    return url;
  }
  return publicUrl(`publications/${file.filename}`);
}

/** Persist farmer image/video upload; returns URL and optional video duration from Cloudinary. */
export async function persistFarmerMediaFile(
  file: Express.Multer.File
): Promise<{ url: string; duration?: number }> {
  assertPersistentStorageAvailable();
  const isVideo = file.mimetype.startsWith('video/');
  if (isCloudStorageEnabled()) {
    const result = await uploadToCloudinary(
      file.path,
      'farm-media',
      isVideo ? 'video' : 'image'
    );
    removeLocalFile(file.path);
    return result;
  }
  return { url: publicUrl(`farm-media/${file.filename}`) };
}

/** Persist product image/video upload; returns URL and optional video duration from Cloudinary. */
export async function persistProductMediaFile(
  file: Express.Multer.File
): Promise<{ url: string; duration?: number }> {
  assertPersistentStorageAvailable();
  const isVideo = file.mimetype.startsWith('video/');
  if (isCloudStorageEnabled()) {
    const result = await uploadToCloudinary(
      file.path,
      'product-media',
      isVideo ? 'video' : 'image'
    );
    removeLocalFile(file.path);
    return result;
  }
  return { url: publicUrl(`product-media/${file.filename}`) };
}

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

function localFileMissingMessage(): string {
  if (process.env.NODE_ENV === 'production') {
    return EPHEMERAL_FILE_MISSING_MESSAGE;
  }
  return 'Publication file is not available.';
}

/** Fetch an uploaded file as a buffer for authenticated streaming (local disk or remote URL). */
export async function fetchUploadedFileBuffer(storedUrl: string): Promise<Buffer> {
  const normalized = normalizePublicAssetUrl(storedUrl) ?? storedUrl;

  if (normalized.startsWith('/uploads/')) {
    const relative = normalized.slice('/uploads/'.length);
    const filePath = path.join(UPLOADS_ROOT, relative);
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, localFileMissingMessage(), 'NOT_FOUND');
    }
    return fs.readFileSync(filePath);
  }

  if (isRemoteStorageUrl(normalized)) {
    let res: Response;
    try {
      res = await fetch(normalized);
    } catch {
      throw new AppError(502, 'Could not retrieve publication file from storage', 'STORAGE_FETCH_FAILED');
    }
    if (!res.ok) {
      throw new AppError(
        404,
        res.status === 404 ? 'Publication file not found in storage' : 'Could not retrieve publication file from storage',
        'NOT_FOUND'
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }

  throw new AppError(404, 'Publication file URL is invalid or unsupported', 'NOT_FOUND');
}

export type PublicationDocumentResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'buffer'; buffer: Buffer; filename: string };

/** Resolve a stored publication file for authenticated download (redirect to Cloudinary when possible). */
export async function resolvePublicationDocument(
  storedUrl: string,
  filename: string
): Promise<PublicationDocumentResult> {
  const normalized = normalizePublicAssetUrl(storedUrl) ?? storedUrl;

  if (isRemoteStorageUrl(normalized)) {
    return { kind: 'redirect', url: normalized };
  }

  const buffer = await fetchUploadedFileBuffer(normalized);
  return { kind: 'buffer', buffer, filename };
}
