/**
 * Document Converter Edge Function
 *
 * Converts uploaded PDF and Office documents into PNG page images that are
 * compatible with WebOS/Tizen smart TV players (which cannot render raw PDFs
 * or Office files).
 *
 * Flow:
 *   1. Receive { mediaId, storageUrl, mimeType } from client
 *   2. Download the document from storageUrl
 *   3. For Office files: convert to PDF via Gotenberg (LibreOffice)
 *   4. For PDF: store the original URL as the "page" (TODO: split pages with magick-wasm)
 *   5. Upload converted page images to documents/pages/{mediaId}/page-NNN.png
 *   6. Update media_assets.config_json with conversion results
 *
 * Auth: JWT verification (same pattern as rss-proxy)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Update the media_assets record with conversion results.
 */
// deno-lint-ignore no-explicit-any
async function updateMediaAsset(
  supabaseAdmin: any,
  mediaId: string,
  configJson: Record<string, unknown>,
  thumbnailUrl?: string,
): Promise<void> {
  const updates: Record<string, unknown> = { config_json: configJson };
  if (thumbnailUrl) {
    updates.thumbnail_url = thumbnailUrl;
  }

  const { error } = await supabaseAdmin
    .from('media_assets')
    .update(updates)
    .eq('id', mediaId);

  if (error) {
    console.error('[doc-converter] Failed to update media_assets:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // -- CORS preflight -------------------------------------------------------
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // -- Authentication -----------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } },
        401,
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        401,
      );
    }

    // -- Parse body ---------------------------------------------------------
    const body = await req.json();
    const { mediaId, storageUrl, mimeType } = body as {
      mediaId: string;
      storageUrl: string;
      mimeType: string;
    };

    if (!mediaId || !storageUrl || !mimeType) {
      return jsonResponse(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'mediaId, storageUrl, and mimeType are required' } },
        400,
      );
    }

    console.log(`[doc-converter] Processing mediaId=${mediaId} mimeType=${mimeType}`);

    // -- Fetch existing config to preserve originalFormat --------------------
    const { data: existingAsset } = await supabaseAdmin
      .from('media_assets')
      .select('config_json')
      .eq('id', mediaId)
      .single();

    const originalFormat = existingAsset?.config_json?.originalFormat || '';

    // -- Download the document ----------------------------------------------
    const docResponse = await fetch(storageUrl);
    if (!docResponse.ok) {
      await updateMediaAsset(supabaseAdmin, mediaId, {
        conversionStatus: 'error',
        conversionError: `Failed to download document: HTTP ${docResponse.status}`,
        convertedPages: [],
        pageCount: 0,
        originalFormat,
      });
      return jsonResponse(
        { ok: false, error: { code: 'DOWNLOAD_ERROR', message: `HTTP ${docResponse.status}` } },
        502,
      );
    }

    const docBuffer = await docResponse.arrayBuffer();
    const pageUrls: string[] = [];

    // -- Conversion logic ---------------------------------------------------
    if (mimeType !== 'application/pdf') {
      // Office file: convert to PDF via Gotenberg (LibreOffice)
      const gotenbergUrl = Deno.env.get('GOTENBERG_URL') || 'http://localhost:3000';

      try {
        const formData = new FormData();
        formData.append('files', new Blob([docBuffer], { type: mimeType }), 'document');

        const convertResponse = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
          method: 'POST',
          body: formData,
        });

        if (!convertResponse.ok) {
          throw new Error(`Gotenberg returned HTTP ${convertResponse.status}`);
        }

        // Gotenberg returns a PDF -- store it as the single page for now
        // TODO: Integrate magick-wasm to split the converted PDF into per-page PNGs
        const pdfBlob = await convertResponse.blob();
        const pagePath = `documents/pages/${mediaId}/page-000.pdf`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('media')
          .upload(pagePath, pdfBlob, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload converted PDF: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('media')
          .getPublicUrl(pagePath);

        pageUrls.push(publicUrl);
      } catch (err) {
        console.error('[doc-converter] Office conversion failed:', err);
        await updateMediaAsset(supabaseAdmin, mediaId, {
          conversionStatus: 'error',
          conversionError: 'Office conversion service unavailable.',
          convertedPages: [],
          pageCount: 0,
          originalFormat,
        });
        return jsonResponse({ ok: true, data: { mediaId, status: 'error' } });
      }
    } else {
      // PDF: store the original PDF URL as the single "page"
      // TODO: Integrate magick-wasm to split PDF into per-page PNG images.
      // For now the original PDF URL serves as the single convertedPages entry,
      // allowing the UI to display a preview/download link immediately.
      pageUrls.push(storageUrl);
    }

    // -- Upload page images (when magick-wasm splitting is added) -----------
    // Future: iterate over split page images and upload each as:
    //   documents/pages/${mediaId}/page-${index.toString().padStart(3, '0')}.png
    // For now, pageUrls already contains the single entry from above.

    // -- Update media_assets with success -----------------------------------
    const firstPageUrl = pageUrls[0] || null;

    await updateMediaAsset(
      supabaseAdmin,
      mediaId,
      {
        conversionStatus: 'complete',
        convertedPages: pageUrls,
        pageCount: pageUrls.length,
        originalFormat,
      },
      firstPageUrl ?? undefined,
    );

    console.log(`[doc-converter] Complete mediaId=${mediaId} pages=${pageUrls.length}`);

    return jsonResponse({
      ok: true,
      data: {
        mediaId,
        status: 'complete',
        pageCount: pageUrls.length,
        convertedPages: pageUrls,
      },
    });
  } catch (err) {
    console.error('[doc-converter] Unhandled error:', err);
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        },
      },
      500,
    );
  }
});
