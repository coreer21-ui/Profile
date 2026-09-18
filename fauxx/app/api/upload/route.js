import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import {
  getUserFromRequestCookies,
  isAdminFromRequestCookies
} from '../../../lib/session';
import { normalizeUsername } from '../../../lib/kv';

const MAX_BYTES = 100 * 1024 * 1024;

const ALLOWED_FIELDS = new Set([
  'background',
  'avatar',
  'audio',
  'cursor',
  'font',
  'gallery'
]);

const ALLOWED_CONTENT_TYPES = [
  'image/*',
  'audio/*',
  'video/*',
  'font/*',
  'application/octet-stream'
];

export async function POST(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload,
        multipart
      ) => {
        let payload = {};

        try {
          payload = JSON.parse(clientPayload || '{}');
        } catch {
          throw new Error('Invalid upload request');
        }

        const selfUsername = getUserFromRequestCookies(request);
        const isAdmin = isAdminFromRequestCookies(request);

        let username = selfUsername;

        // Admins can upload for another user's profile.
        if (!username && isAdmin) {
          username = normalizeUsername(payload.username);
        }

        if (!username) {
          throw new Error('Not logged in');
        }

        username = normalizeUsername(username);

        const field = payload.field;

        if (!ALLOWED_FIELDS.has(field)) {
          throw new Error('Invalid field');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,

          tokenPayload: JSON.stringify({
            username,
            field
          })
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload completed:', {
          url: blob.url,
          tokenPayload
        });
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Blob client upload error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Upload failed'
      },
      { status: 400 }
    );
  }
}
