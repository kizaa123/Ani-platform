import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { publicUrl } from '../middleware/upload.middleware';

export type UploadFolder = 'profiles' | 'listings' | 'publications';

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

async function uploadToCloudinary(filePath: string, folder: UploadFolder): Promise<string> {
  ensureCloudinaryConfig();
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `ani-platform/${folder}`,
    resource_type: 'auto',
  });
  return result.secure_url;
}

/** Persist a multer disk upload and return the public URL stored in the database. */
export async function persistUploadedFile(
  file: Express.Multer.File,
  folder: UploadFolder
): Promise<string> {
  if (isCloudStorageEnabled()) {
    const url = await uploadToCloudinary(file.path, folder);
    removeLocalFile(file.path);
    return url;
  }
  return publicUrl(`${folder}/${file.filename}`);
}
