/**
 * S3 File Deletion API
 *
 * Deletes files from S3 using AWS SDK.
 * Requires AWS credentials configured on server.
 *
 * POST /api/gdpr/delete-s3
 * Requires service role authorization
 */

import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.GDPR_API_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { keys } = await request.json();

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return new Response(JSON.stringify({ error: 'S3 bucket not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false,
      },
    });

    const response = await s3Client.send(command);

    return new Response(JSON.stringify({
      deleted: response.Deleted?.length || 0,
      errors: response.Errors?.map(e => e.Message) || [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
