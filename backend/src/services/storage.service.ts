import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { normalizePublicAssetUrl, publicUrl } from '../middleware/upload.middleware';

export type UploadFolder = 'profiles' | 'listings' | 'publications' | 'farm-media' | 'product-media';

let cloudinaryConfigured = false;

export function isCloudStorageEnabled(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
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
  resourceType: 'auto' | 'video' | 'image' = 'auto'
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
  if (isCloudStorageEnabled()) {
    const { url } = await uploadToCloudinary(file.path, folder);
    removeLocalFile(file.path);
    return url;
  }
  return publicUrl(`${folder}/${file.filename}`);
}

/** Persist farmer image/video upload; returns URL and optional video duration from Cloudinary. */
export async function persistFarmerMediaFile(
  file: Express.Multer.File
): Promise<{ url: string; duration?: number }> {
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

/** Fetch an uploaded file as a buffer for authenticated streaming (local disk or remote URL). */
export async function fetchUploadedFileBuffer(storedUrl: string): Promise<Buffer> {
  const normalized = normalizePublicAssetUrl(storedUrl) ?? storedUrl;

  if (normalized.startsWith('/uploads/')) {
    const relative = normalized.slice('/uploads/'.length);
    const filePath = path.join(UPLOADS_ROOT, relative);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.readFileSync(filePath);
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    const res = await fetch(normalized);
    if (!res.ok) {
      throw new Error(`Failed to fetch file (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error('Unsupported file location');
}
