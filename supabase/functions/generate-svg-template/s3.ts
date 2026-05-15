// Phase 177 B3 — AWS SDK direct upload helper.
//
// Replaces the Node-script presign-then-PUT shape (`/api/media/presign`) which
// is a Vite dev-server middleware ONLY (vite.config.js:53-54). The disabled
// `_api-disabled/media/presign.js` confirms there is no Vercel/production
// presign endpoint — vercel.json rewrites all /api/* to /index.html, so an EF
// calling `/api/media/presign` in prod would receive HTML and throw a parse
// error. Direct AWS SDK upload (signed in-process via the Supabase secrets) is
// the only viable path from inside the Edge Function runtime.
//
// Plan 01 Task 1 verified AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
// (and AWS_REGION as a bonus) are set as Supabase secrets BEFORE this code
// runs. Plan 01 Task 3 spike `aws_sdk_ok: true` flag confirmed @aws-sdk/client-s3
// boots cleanly in the Deno EF runtime.
//
// WR-09 closure (Plan 177-08): The S3 key is now DETERMINISTIC — `thumbnails/system/${slug}.png`
// (no timestamp suffix). Retries overwrite the same S3 object instead of accreting orphan PNGs.
// Combined with the BL-02 atomic-RPC closure (approve_draft_atomic), the only way an old PNG
// persists beyond a failed approve is if the rasterize succeeded but the RPC failed BEFORE
// landing the new svg_templates row — and on retry, rasterize will re-run and overwrite
// the same key. No orphan accretion possible.
//
// Public-read URL convention `s3://bizscreen-media/thumbnails/system/${slug}.png`
// matches the Phase 175 thumbnails/system/* pattern (so gallery_templates VIEW
// surfaces the resulting URL with no extra plumbing).
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@^3.654.0";

const s3 = new S3Client({
  region: Deno.env.get("AWS_REGION") ?? "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

export async function uploadPng(buffer: Uint8Array, slug: string): Promise<string> {
  const bucket = Deno.env.get("S3_BUCKET") ?? "bizscreen-media";
  // WR-09 closure (177-08): deterministic key — retries OVERWRITE same key, no orphan accretion.
  const key = `thumbnails/system/${slug}.png`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "image/png",
  }));
  // Public-read URL convention matches Phase 175 thumbnails/system/* pattern.
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}
