/**
 * Cloudinary File Deletion API
 *
 * Deletes files from Cloudinary using Admin API.
 * Requires Cloudinary API credentials configured on server.
 *
 * POST /api/gdpr/delete-cloudinary
 * Requires service role authorization
 */

import cloudinary from 'cloudinary';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

    const { publicIds } = await request.json();

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cloudinary Admin API allows max 100 per request (handled by caller)
    const result = await cloudinary.v2.api.delete_resources(publicIds);

    const deleted = Object.values(result.deleted || {}).filter(v => v === 'deleted').length;

    return new Response(JSON.stringify({
      deleted,
      result: result.deleted,
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
