/**
 * API Route: Generate presigned URL for S3 upload
 *
 * POST /api/media/presign
 * Body: { filename, contentType, folder }
 * Returns: { uploadUrl, fileUrl, key }
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'bizscreen-media';
const CDN_URL = process.env.AWS_CLOUDFRONT_URL; // Optional CloudFront distribution

// Allowed content types
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/mp4': 'audio',
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename, contentType, folder = 'uploads' } = req.body;

    // Validate required fields
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'Missing filename or contentType' });
    }

    // Validate content type
    const mediaType = ALLOWED_TYPES[contentType];
    if (!mediaType) {
      return res.status(400).json({
        error: 'File type not allowed',
        allowedTypes: Object.keys(ALLOWED_TYPES)
      });
    }

    // Generate unique key for the file
    const extension = filename.split('.').pop().toLowerCase();
    const uniqueId = uuidv4();
    const key = `${folder}/${mediaType}/${uniqueId}.${extension}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      // Add metadata
      Metadata: {
        'original-filename': encodeURIComponent(filename),
        'upload-date': new Date().toISOString(),
      },
    });

    // Generate presigned URL (valid for 15 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    // Generate the final file URL
    const fileUrl = CDN_URL
      ? `${CDN_URL}/${key}`
      : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return res.status(200).json({
      uploadUrl,
      fileUrl,
      key,
      mediaType,
      bucket: BUCKET_NAME,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}
