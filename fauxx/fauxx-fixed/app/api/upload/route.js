import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getUserFromRequestCookies, isAdminFromRequestCookies } from '../../../lib/session';
import { normalizeUsername } from '../../../lib/kv';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a'];
const FONT_TYPES = [
  'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
  'application/font-sfnt', 'application/x-font-ttf', 'application/x-font-otf',
  'application/font-woff', 'application/font-woff2',
  // Browsers report font files inconsistently by OS/browser — this field
  // alone keeps the octet-stream fallback; every other field stays strict.
  'application/octet-stream'
];

// Vercel Blob's allowedContentTypes matches literal MIME types, not globs —
// 'image/*' silently never matches a real 'image/png' upload. Every field
// gets its own exact list instead of one shared wildcard list.
const FIELD_LIMITS = {
  avatar: { types: IMAGE_TYPES, maxBytes: 8 * 1024 * 1024 },
  cursor: { types: IMAGE_TYPES, maxBytes: 2 * 1024 * 1024 },
  gallery: { types: IMAGE_TYPES, maxBytes: 8 * 1024 * 1024 },
  background: { types: [...IMAGE_TYPES, ...VIDEO_TYPES], maxBytes: 100 * 1024 * 1024 },
  audio: { types: AUDIO_TYPES, maxBytes: 30 * 1024 * 1024 },
  font: { types: FONT_TYPES, maxBytes: 8 * 1024 * 1024 }
};

export async function POST(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try {
          payload = JSON.parse(clientPayload || '{}');
        } catch {
          throw new Error('Invalid upload request');
        }

        const selfUsername = getUserFromRequestCookies(request);
        const isAdmin = isAdminFromRequestCookies(request);

        // Admins can upload for another user's profile; everyone else
        // always uploads to their own.
        let username = selfUsername;
        if (!username && isAdmin) {
          username = normalizeUsername(payload.username);
        }
        if (!username) {
          throw new Error('Not logged in');
        }
        username = normalizeUsername(username);

        const field = payload.field;
        const limits = FIELD_LIMITS[field];
        if (!limits) {
          throw new Error('Invalid field');
        }

        // The client picks its own pathname, so it can't be trusted on its
        // own — without this check, any logged-in user could upload to
        // another user's exact blob path (visible in that user's public
        // page source) and silently overwrite their file.
        if (!pathname.startsWith(`${username}/`)) {
          throw new Error('Invalid upload path');
        }

        return {
          allowedContentTypes: limits.types,
          maximumSizeInBytes: limits.maxBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ username, field })
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload completed:', { url: blob.url, tokenPayload });
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Blob client upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}
