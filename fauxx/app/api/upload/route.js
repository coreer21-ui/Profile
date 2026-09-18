import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import {
  getUserFromRequestCookies,
  isAdminFromRequestCookies
} from '../../../lib/session';
import { normalizeUsername } from '../../../lib/kv';

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

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
  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload,
        multipart
      ) => {
        /*
         * Authenticate the person requesting an upload.
         */
        const selfUsername = getUserFromRequestCookies(request);
        const isAdmin = isAdminFromRequestCookies(request);

        let username = selfUsername;

        /*
         * An admin may upload for another user's profile.
         * The client sends that username in clientPayload.
         */
        if (!username && isAdmin) {
          try {
            const payload = JSON.parse(clientPayload || '{}');
            username = normalizeUsername(payload.username);
          } catch {
            throw new Error('Invalid upload request');
          }
        }

        if (!username) {
          throw new Error('Not logged in');
        }

        username = normalizeUsername(username);

        /*
         * Read the upload field from the client payload.
         */
        let payload = {};

        try {
          payload = JSON.parse(clientPayload || '{}');
        } catch {
          throw new Error('Invalid upload request');
        }

        const field = payload.field;

        if (!ALLOWED_FIELDS.has(field)) {
          throw new Error('Invalid field');
        }

        /*
         * Make sure the browser cannot use the upload token
         * to upload into somebody else's namespace.
         *
         * The client should use a pathname such as:
         *
         * username/background-123456-file.jpg
         */
        const expectedPrefix = `${username}/`;

        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error('Invalid upload path');
        }

        /*
         * Make sure the pathname actually belongs to the
         * requested field.
         *
         * Example:
         * username/background-123456-image.jpg
         */
        const pathnameAfterUsername = pathname.slice(
          expectedPrefix.length
        );

        if (!pathnameAfterUsername.startsWith(`${field}-`)) {
          throw new Error('Invalid upload field');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,

          maximumSizeInBytes: MAX_BYTES,

          /*
           * Preserve the pathname supplied by the client.
           * The pathname has already been validated above.
           */
          addRandomSuffix: false,

          /*
           * Large files are uploaded using multipart uploads.
           */
          multipart,

          /*
           * This is sent back to onUploadCompleted.
           */
          tokenPayload: JSON.stringify({
            username,
            field
          })
        };
      },

      onUploadCompleted: async ({
        blob,
        tokenPayload
      }) => {
        console.log('Blob upload completed:', {
          url: blob.url,
          tokenPayload
        });

        /*
         * Nothing else is required here because your
         * ProfileEditor already receives blob.url and stores
         * that URL in the user's profile.
         */
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload error:', error);

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
