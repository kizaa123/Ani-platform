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

/** Render and similar hosts wipe local disk on redeploy - require Cloudinary in production. */
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
    folder: `concordiaorbis/${folder}`,
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

type ParsedCloudinaryUrl = {
  resourceType: 'image' | 'video' | 'raw';
  deliveryType: 'upload' | 'private' | 'authenticated';
  publicId: string;
};

/** Parse a Cloudinary delivery URL into resource type + public_id. */
function parseCloudinaryDeliveryUrl(url: string): ParsedCloudinaryUrl | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('res.cloudinary.com')) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    // /{cloud}/{resourceType}/{deliveryType}/[s--sig--/][transforms/][v123/]{publicId}
    if (parts.length < 4) return null;

    const resourceType = parts[1];
    const deliveryType = parts[2];
    if (!['image', 'video', 'raw'].includes(resourceType)) return null;
    if (!['upload', 'private', 'authenticated'].includes(deliveryType)) return null;

    let rest = parts.slice(3);
    if (rest[0]?.startsWith('s--')) rest = rest.slice(1);
    // Skip common transformation segments until we hit version or public id
    while (
      rest.length > 1 &&
      !/^v\d+$/.test(rest[0]) &&
      /[_=,:]/.test(rest[0])
    ) {
      rest = rest.slice(1);
    }
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);

    const publicId = decodeURIComponent(rest.join('/'));
    if (!publicId) return null;

    return {
      resourceType: resourceType as ParsedCloudinaryUrl['resourceType'],
      deliveryType: deliveryType as ParsedCloudinaryUrl['deliveryType'],
      publicId,
    };
  } catch {
    return null;
  }
}

function splitPublicIdFormat(publicId: string): { id: string; format?: string } {
  const slash = publicId.lastIndexOf('/');
  const dot = publicId.lastIndexOf('.');
  if (dot > slash && dot < publicId.length - 1) {
    return { id: publicId.slice(0, dot), format: publicId.slice(dot + 1) };
  }
  return { id: publicId };
}

/**
 * Download via Cloudinary's signed API download URL.
 * Needed when public CDN delivery of PDF/raw is blocked (common on free plans / restricted media).
 */
async function fetchCloudinaryViaSignedDownload(parsed: ParsedCloudinaryUrl): Promise<Buffer | null> {
  if (!isCloudStorageEnabled()) return null;
  ensureCloudinaryConfig();

  const { id, format } = splitPublicIdFormat(parsed.publicId);
  const attempts: Array<{ publicId: string; format: string | undefined }> = [
    { publicId: parsed.publicId, format: format || undefined },
    { publicId: id, format: format || undefined },
    { publicId: parsed.publicId, format: undefined },
    { publicId: id, format: undefined },
  ];

  const seen = new Set<string>();
  for (const attempt of attempts) {
    const key = `${attempt.publicId}|${attempt.format ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const downloadUrl = cloudinary.utils.private_download_url(
        attempt.publicId,
        attempt.format ?? '',
        {
          resource_type: parsed.resourceType,
          type: parsed.deliveryType,
          attachment: false,
        }
      );
      const res = await fetch(downloadUrl);
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      /* try next candidate */
    }
  }

  return null;
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
    let directStatus: number | null = null;
    try {
      const res = await fetch(normalized);
      directStatus = res.status;
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      directStatus = null;
    }

    const parsedCloud = parseCloudinaryDeliveryUrl(normalized);
    if (parsedCloud) {
      const viaApi = await fetchCloudinaryViaSignedDownload(parsedCloud);
      if (viaApi) return viaApi;
    }

    if (directStatus === 404) {
      throw new AppError(404, 'Publication file not found in storage', 'NOT_FOUND');
    }
    throw new AppError(
      502,
      'Could not retrieve publication file from storage',
      'STORAGE_FETCH_FAILED'
    );
  }

  throw new AppError(404, 'Publication file URL is invalid or unsupported', 'NOT_FOUND');
}

export type PublicationDocumentResult = {
  kind: 'buffer';
  buffer: Buffer;
  filename: string;
};

/**
 * Resolve a stored publication file for authenticated in-app reading.
 * Always proxy as a buffer — never 302 to Cloudinary/remote URLs. Browser
 * fetch follows redirects and can see a remote 401, which the frontend
 * mistakenly treats as session expiry and kicks the user to /login.
 */
export async function resolvePublicationDocument(
  storedUrl: string,
  filename: string
): Promise<PublicationDocumentResult> {
  const buffer = await fetchUploadedFileBuffer(storedUrl);
  return { kind: 'buffer', buffer, filename };
}
