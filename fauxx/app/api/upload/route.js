import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import {
  getUserFromRequestCookies,
  isAdminFromRequestCookies
} from '../../../lib/session';
import { normalizeUsername } from '../../../lib/kv';

const ALLOWED_FIELDS = new Set([
  'background',
  'avatar',
  'audio',
  'cursor',
  'font',
  'gallery'
]);

export async function POST(request) {
  const selfUsername = getUserFromRequestCookies(request);

  let username = selfUsername;

  // Admin can upload on behalf of another user.
  if (!username && isAdminFromRequestCookies(request)) {
    const body = await request.clone().json().catch(() => ({}));
    username = normalizeUsername(body.username);
  }

  if (!username) {
    return NextResponse.json(
      { error: 'Not logged in' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const field = body.field;

    if (!ALLOWED_FIELDS.has(field)) {
      return NextResponse.json(
        { error: 'Invalid field' },
        { status: 400 }
      );
    }

    const safeUsername = normalizeUsername(username);

    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            'image/*',
            'audio/*',
            'video/*',
            'font/*',
            'application/octet-stream'
          ],

          tokenPayload: JSON.stringify({
            username: safeUsername,
            field
          })
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', {
          url: blob.url,
          tokenPayload
        });
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      { error: error?.message || 'Upload failed' },
      { status: 400 }
    );
  }
}
