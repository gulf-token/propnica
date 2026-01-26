import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ===========================================
// S3 Client Configuration
// ===========================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// ===========================================
// Bucket Names
// ===========================================

const BUCKETS = {
  renders: process.env.S3_RENDERS_BUCKET || 'propnica-renders',
  assets: process.env.S3_ASSETS_BUCKET || 'propnica-assets',
  thumbnails: process.env.S3_THUMBNAILS_BUCKET || 'propnica-thumbnails',
};

// ===========================================
// Upload Functions
// ===========================================

export async function uploadFile(
  bucket: keyof typeof BUCKETS,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKETS[bucket],
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `s3://${BUCKETS[bucket]}/${key}`;
}

export async function uploadThumbnail(
  projectId: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `thumbnails/${projectId}.jpg`;
  return uploadFile('thumbnails', key, imageBuffer, 'image/jpeg');
}

export async function uploadAsset(
  userId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const key = `${userId}/${Date.now()}-${fileName}`;
  return uploadFile('assets', key, fileBuffer, contentType);
}

// ===========================================
// Download Functions
// ===========================================

export async function getSignedDownloadUrl(
  s3Url: string,
  expiresIn: number = 3600
): Promise<string> {
  // Parse S3 URL
  const match = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    // If it's already a regular URL, return as-is
    if (s3Url.startsWith('http')) {
      return s3Url;
    }
    throw new Error('Invalid S3 URL format');
  }

  const [, bucket, key] = match;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedUploadUrl(
  bucket: keyof typeof BUCKETS,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKETS[bucket],
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// ===========================================
// Delete Functions
// ===========================================

export async function deleteFile(
  bucket: keyof typeof BUCKETS,
  key: string
): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKETS[bucket],
    Key: key,
  });

  await s3Client.send(command);
}

export async function deleteRender(renderId: string): Promise<void> {
  // Delete the main video file
  await deleteFile('renders', `renders/${renderId}.mp4`);
}

// ===========================================
// Check Functions
// ===========================================

export async function fileExists(
  bucket: keyof typeof BUCKETS,
  key: string
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

export async function getFileSize(
  bucket: keyof typeof BUCKETS,
  key: string
): Promise<number | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
    });
    const response = await s3Client.send(command);
    return response.ContentLength ?? null;
  } catch {
    return null;
  }
}

// ===========================================
// URL Utilities
// ===========================================

export function getPublicUrl(bucket: keyof typeof BUCKETS, key: string): string {
  return `https://${BUCKETS[bucket]}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com/${key}`;
}

export function parseS3Url(url: string): { bucket: string; key: string } | null {
  const match = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (match) {
    return { bucket: match[1], key: match[2] };
  }
  return null;
}
