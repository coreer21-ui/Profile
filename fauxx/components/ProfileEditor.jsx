'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { defaultProfile } from '../lib/defaultProfile';
import Cropper from './Cropper';

const PANELS = [
  { id: 'assets', label: 'Assets', title: 'Assets', sub: 'Upload files or paste links' },
  { id: 'general', label: 'General', title: 'General', sub: 'Profile text and description' },
  { id: 'layout', label: 'Layout', title: 'Layout', sub: 'Borders, radius and spacing' },
  { id: 'typography', label: 'Typography', title: 'Typography', sub: 'Font for your name and bio' },
  { id: 'effects', label: 'Effects', title: 'Effects', sub: 'Cursor trail and background particles' },
  { id: 'entrance', label: 'Entrance', title: 'Entrance', sub: 'Your click-to-enter screen' },
  { id: 'colors', label: 'Colors', title: 'Colors', sub: 'Your palette' },
  { id: 'links', label: 'Socials & badges', title: 'Socials & badges', sub: 'Manage your links and badges' },
  { id: 'gallery', label: 'Gallery', title: 'Gallery', sub: 'A few extra photos on your profile' },
  { id: 'other', label: 'Other', title: 'Other', sub: 'Extra toggles' },
  { id: 'security', label: 'Security', title: 'Security', sub: 'Password' }
];

function Toast({ message, err }) {
  if (!message) return null;
  return <div id="toast" className={'show' + (err ? ' err' : '')}>{message}</div>;
}

export default function ProfileEditor({ username }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(defaultProfile(username));
  const [panel, setPanel] = useState('assets');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    fetch('/api/profile/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function showToast(message, err) {
    setToast({ message, err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  function set(section, key, value) {
    setProfile((p) => ({ ...p, [section]: { ...p[section], [key]: value } }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Could not save changes', true);
      } else {
        showToast('Saved — your page is live');
      }
    } catch {
      showToast('Could not reach the server', true);
    } finally {
      setSaving(false);
    }
  }

  /*
   * Upload directly from the browser to Vercel Blob.
   *
   * The browser only contacts /api/upload to request a short-lived
   * upload token. The actual file does NOT pass through the
   * Next.js/Vercel Function.
   */
  async function uploadRaw(field, file) {
    if (!file) return null;

    const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

    if (file.size > MAX_BYTES) {
      showToast('That file is over 100MB', true);
      return null;
    }

    try {
      const safeName = (file.name || 'upload')
        .replace(/[^a-zA-Z0-9.\-_]/g, '');

      const pathname = `${field}-${Date.now()}-${safeName}`;

      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',

        /*
         * Files larger than 4 MB use multipart uploads.
         * This allows large files to upload directly to Blob
         * without going through the Vercel Function payload limit.
         */
        multipart: file.size > 4 * 1024 * 1024,

        /*
         * Your API uses this to validate the upload field
         * and determine which user is uploading.
         */
        clientPayload: JSON.stringify({
          field,
          username
        }),

        onUploadProgress(event) {
          if (event?.percentage != null) {
            showToast(`Uploading ${Math.round(event.percentage)}%`);
          }
        }
      });

      return blob.url;
    } catch (error) {
      console.error('Upload failed:', error);
      showToast(error?.message || 'Upload failed', true);
      return null;
    }
  }

  async function uploadFile(field, file) {
    const url = await uploadRaw(field, file);
    if (!url) return;

    const assetKey =
      field === 'avatar'
        ? 'avatarUrl'
        : field === 'background'
          ? 'backgroundUrl'
          : field === 'audio'
            ? 'audioUrl'
            : 'cursorUrl';

    set('assets', assetKey, url);
    showToast('Uploaded');
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  if (loading) return <div className="editor-shell" />;

  const active = PANELS.find((p) => p.id === panel);

  return (
    <div className="editor-shell">
      <div className="ed-nav">
        <div className="ed-brand">◆ editor</div>

        {PANELS.map((p) => (
          <button
            key={p.id}
            className={panel === p.id ? 'active' : ''}
            onClick={() => setPanel(p.id)}
          >
            <span className="label">{p.label}</span>
          </button>
        ))}

        <div className="spacer" />

        <button onClick={() => window.open(`/${username}`, '_blank')}>
          <span className="label">↗ View page</span>
        </button>

        <button onClick={logout}>
          <span className="label">✕ Log out</span>
        </button>
      </div>

      <div className="ed-main">
        <div className="ed-header">
          <div>
            <div className="ed-title">{active.title}</div>
            <div className="ed-sub">{active.sub}</div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save & publish'}
          </button>
        </div>

        {panel === 'assets' && (
          <AssetsPanel
            profile={profile}
            set={set}
            uploadFile={uploadFile}
            uploadRaw={uploadRaw}
            showToast={showToast}
          />
        )}

        {panel === 'general' && (
          <GeneralPanel
            profile={profile}
            set={set}
            setProfile={setProfile}
          />
        )}

        {panel === 'layout' && (
          <LayoutPanel
            profile={profile}
            set={set}
          />
        )}

        {panel === 'typography' && (
          <TypographyPanel
            profile={profile}
            set={set}
            uploadRaw={uploadRaw}
            showToast={showToast}
          />
        )}

        {panel === 'effects' && (
          <EffectsPanel
            profile={profile}
            set={set}
          />
        )}

        {panel === 'entrance' && (
          <EntrancePanel
            profile={profile}
            set={set}
          />
        )}

        {panel === 'colors' && (
          <ColorsPanel
            profile={profile}
            set={set}
          />
        )}

        {panel === 'links' && (
          <LinksPanel
            profile={profile}
            setProfile={setProfile}
          />
        )}

        {panel === 'gallery' && (
          <GalleryPanel
            profile={profile}
            setProfile={setProfile}
            uploadRaw={uploadRaw}
            showToast={showToast}
          />
        )}

        {panel === 'other' && (
          <OtherPanel
            profile={profile}
            set={set}
          />
        )}

        {panel === 'security' && (
          <SecurityPanel
            showToast={showToast}
          />
        )}
      </div>

      <Toast
        message={toast?.message}
        err={toast?.err}
      />
    </div>
  );
}

function UploadRow({
  field,
  accept,
  url,
  onUrlChange,
  onUpload
}) {
  const fileRef = useRef(null);

  return (
    <>
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="https://... or upload below"
      />

      <div className="upload-row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => fileRef.current.click()}
        >
          Upload file
        </button>

        <input
          ref={fileRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />

        <span className="upload-status">
          {url &&
          url.indexOf('http') === 0 &&
          url.includes('blob.vercel-storage.com')
            ? 'Using an uploaded file'
            : ''}
        </span>
      </div>
    </>
  );
}

function AssetsPanel({
  profile,
  set,
  uploadFile,
  uploadRaw,
  showToast
}) {
  const a = profile.assets;
  const [cropSrc, setCropSrc] = useState(null);
  const cropObjectUrl = useRef(null);

  function cleanupCropObjectUrl() {
    if (cropObjectUrl.current) {
      URL.revokeObjectURL(cropObjectUrl.current);
      cropObjectUrl.current = null;
    }
  }

  function handleAvatarFile(file) {
    const objUrl = URL.createObjectURL(file);
    const probe = new Image();

    probe.onload = () => {
      const ratio = probe.naturalWidth / probe.naturalHeight;

      if (ratio < 0.92 || ratio > 1.08) {
        cropObjectUrl.current = objUrl;
        setCropSrc(objUrl);
      } else {
        URL.revokeObjectURL(objUrl);
        uploadFile('avatar', file);
      }
    };

    probe.onerror = () => {
      URL.revokeObjectURL(objUrl);
      uploadFile('avatar', file);
    };

    probe.src = objUrl;
  }

  function openCropOnExisting() {
    if (!a.avatarUrl) {
      showToast('Upload or paste an avatar first.', true);
      return;
    }

    cropObjectUrl.current = null;
    setCropSrc(a.avatarUrl);
  }

  async function handleCropped(blob) {
    setCropSrc(null);
    cleanupCropObjectUrl();

    const file = new File(
      [blob],
      'avatar.jpg',
      { type: 'image/jpeg' }
    );

    const url = await uploadRaw('avatar', file);

    if (url) {
      set('assets', 'avatarUrl', url);
      showToast('Uploaded');
    }
  }

  function handleCropCancel() {
    setCropSrc(null);
    cleanupCropObjectUrl();
  }

  return (
    <div>
      <p
        className="hint-text"
        style={{ marginBottom: 16 }}
      >
        Uploading a file stores it for you and always works.
        A pasted link only works if it's already a direct,
        publicly embeddable file.
      </p>

      <div className="field">
        <label>Background</label>

        <UploadRow
          field="background"
          accept="image/*,video/*"
          url={a.backgroundUrl}
          onUrlChange={(v) =>
            set('assets', 'backgroundUrl', v)
          }
          onUpload={(f) =>
            uploadFile('background', f)
          }
        />
      </div>

      <div className="field">
        <label>Background type</label>

        <select
          value={a.backgroundType}
          onChange={(e) =>
            set(
              'assets',
              'backgroundType',
              e.target.value
            )
          }
        >
          <option value="auto">Auto-detect</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
      </div>

      <div className="field">
        <label>Audio (background music)</label>

        <UploadRow
          field="audio"
          accept="audio/*"
          url={a.audioUrl}
          onUrlChange={(v) =>
            set('assets', 'audioUrl', v)
          }
          onUpload={(f) =>
            uploadFile('audio', f)
          }
        />
      </div>

      <div className="field">
        <label>Avatar</label>

        <input
          type="text"
          value={a.avatarUrl}
          onChange={(e) =>
            set(
              'assets',
              'avatarUrl',
              e.target.value
            )
          }
          placeholder="https://... or upload below"
        />

        <div className="upload-row">
          <AvatarUploadButtons
            onFile={handleAvatarFile}
            onCropExisting={openCropOnExisting}
          />
        </div>
      </div>

      <div className="field">
        <label>Custom cursor</label>

        <UploadRow
          field="cursor"
          accept="image/*"
          url={a.cursorUrl}
          onUrlChange={(v) =>
            set('assets', 'cursorUrl', v)
          }
          onUpload={(f) =>
            uploadFile('cursor', f)
          }
        />
      </div>

      {cropSrc && (
        <Cropper
          src={cropSrc}
          onCancel={handleCropCancel}
          onCropped={handleCropped}
        />
      )}
    </div>
  );
}

function AvatarUploadButtons({
  onFile,
  onCropExisting
}) {
  const fileRef = useRef(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => fileRef.current.click()}
      >
        Upload file
      </button>

      <button
        type="button"
        className="btn btn-sm"
        onClick={onCropExisting}
      >
        Crop image
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </>
  );
}

function GeneralPanel({
  profile,
  set,
  setProfile
}) {
  const g = profile.general;

  function setPhrase(i, value) {
    const next = [...(g.descPhrases || [])];
    next[i] = value;
    set('general', 'descPhrases', next);
  }

  function addPhrase() {
    set(
      'general',
      'descPhrases',
      [...(g.descPhrases || []), '']
    );
  }

  function removePhrase(i) {
    set(
      'general',
      'descPhrases',
      (g.descPhrases || []).filter(
        (_, idx) => idx !== i
      )
    );
  }

  return (
    <div>
      <div className="field">
        <label>Display name</label>

        <input
          type="text"
          maxLength={40}
          value={g.displayName}
          onChange={(e) =>
            set(
              'general',
              'displayName',
              e.target.value
            )
          }
        />
      </div>

      <div className="field">
        <label>Description</label>

        <textarea
          maxLength={280}
          value={g.description}
          onChange={(e) =>
            set(
              'general',
              'description',
              e.target.value
            )
          }
        />
      </div>

      <div className="toggle-row">
        <span>
          Typewriter description
          <br />
          <small>
            Loop through one or more phrases
          </small>
        </span>

        <label className="switch">
          <input
            type="checkbox"
            checked={!!g.descTypewriter}
            onChange={(e) =>
              set(
                'general',
                'descTypewriter',
                e.target.checked
              )
            }
          />

          <span className="track" />
        </label>
      </div>

      {g.descTypewriter && (
        <div style={{ margin: '10px 0' }}>
          <label>Phrases to loop through</label>

          {(g.descPhrases || []).map((p, i) => (
            <div
              className="list-item"
              key={i}
            >
              <input
                type="text"
                value={p}
                onChange={(e) =>
                  setPhrase(
                    i,
                    e.target.value
                  )
                }
              />

              <button
                className="btn btn-sm btn-danger"
                onClick={() =>
                  removePhrase(i)
                }
              >
                Remove
              </button>
            </div>
          ))}

          <button
            className="btn btn-sm"
            onClick={addPhrase}
          >
            + Add phrase
          </button>
        </div>
      )}

      <div
        className="row"
        style={{ marginTop: 16 }}
      >
        <div className="field">
          <label>Location</label>

          <input
            type="text"
            value={g.location}
            onChange={(e) =>
              set(
                'general',
                'location',
                e.target.value
              )
            }
          />
        </div>

        <div className="field">
          <label>Pronouns</label>

          <input
            type="text"
            value={g.pronouns || ''}
            onChange={(e) =>
              set(
                'general',
                'pronouns',
                e.target.value
              )
            }
            placeholder="e.g. they/them"
          />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Status text</label>

          <input
            type="text"
            value={g.statusText}
            onChange={(e) =>
              set(
                'general',
                'statusText',
                e.target.value
              )
            }
          />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>
            Card opacity ({g.opacity}%)
          </label>

          <input
            type="range"
            min="0"
            max="100"
            value={g.opacity}
            onChange={(e) =>
              set(
                'general',
                'opacity',
                parseInt(
                  e.target.value,
                  10
                )
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Background blur ({g.blur}px)
          </label>

          <input
            type="range"
            min="0"
            max="20"
            value={g.blur}
            onChange={(e) =>
              set(
                'general',
                'blur',
                parseInt(
                  e.target.value,
                  10
                )
              )
            }
          />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Background effect</label>

          <select
            value={g.backgroundEffect}
            onChange={(e) =>
              set(
                'general',
                'backgroundEffect',
                e.target.value
              )
            }
          >
            <option value="none">None</option>
            <option value="scanlines">
              Scanlines
            </option>
            <option value="grain">Grain</option>
            <option value="vignette">
              Vignette
            </option>
            <option value="particles">
              Particles
            </option>
          </select>
        </div>

        <div className="field">
          <label>Name effect</label>

          <select
            value={g.usernameEffect}
            onChange={(e) =>
              set(
                'general',
                'usernameEffect',
                e.target.value
              )
            }
          >
            <option value="none">None</option>
            <option value="gradient">
              Gradient
            </option>
            <option value="glitch">
              Glitch
            </option>
            <option value="typewriter">
              Typewriter
            </option>
          </select>
        </div>
      </div>

      <div className="section-title">
        Glow
      </div>

      {[
        'glowName',
        'glowSocials',
        'glowBadges'
      ].map((k) => (
        <div
          className="toggle-row"
          key={k}
        >
          <span>
            {k === 'glowName'
              ? 'Name glow'
              : k === 'glowSocials'
                ? 'Socials glow'
                : 'Badges glow'}
          </span>

          <label className="switch">
            <input
              type="checkbox"
              checked={!!g[k]}
              onChange={(e) =>
                set(
                  'general',
                  k,
                  e.target.checked
                )
              }
            />

            <span className="track" />
          </label>
        </div>
      ))}
    </div>
  );
}

function LayoutPanel({ profile, set }) {
  const g = profile.general;

  return (
    <div>
      <div className="field">
        <label>Layout preset</label>

        <select
          value={g.layout}
          onChange={(e) =>
            set(
              'general',
              'layout',
              e.target.value
            )
          }
        >
          <option value="classic">
            Classic
          </option>
          <option value="sleek">
            Sleek
          </option>
        </select>
      </div>

      <div className="field">
        <label>Card border</label>

        <select
          value={g.cardBorder}
          onChange={(e) =>
            set(
              'general',
              'cardBorder',
              e.target.value
            )
          }
        >
          <option value="accent-left">
            Accent left bar
          </option>
          <option value="outline">
            Thin outline
          </option>
          <option value="full-accent">
            Full accent border
          </option>
          <option value="none">
            None
          </option>
        </select>
      </div>

      <div className="row">
        <div className="field">
          <label>
            Corner radius ({g.cardRadius}px)
          </label>

          <input
            type="range"
            min="0"
            max="28"
            value={g.cardRadius}
            onChange={(e) =>
              set(
                'general',
                'cardRadius',
                parseInt(
                  e.target.value,
                  10
                )
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Avatar padding ({g.avatarPadding}px)
          </label>

          <input
            type="range"
            min="0"
            max="10"
            value={g.avatarPadding}
            onChange={(e) =>
              set(
                'general',
                'avatarPadding',
                parseInt(
                  e.target.value,
                  10
                )
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function TypographyPanel({
  profile,
  set,
  uploadRaw,
  showToast
}) {
  const g = profile.general;
  const a = profile.assets;
  const fileRef = useRef(null);

  async function handleFontFile(file) {
    if (
      !/\.(ttf|otf|woff|woff2)$/i.test(
        file.name
      )
    ) {
      showToast(
        'Use a .ttf, .otf, .woff or .woff2 file',
        true
      );
      return;
    }

    const url = await uploadRaw(
      'font',
      file
    );

    if (!url) return;

    set(
      'assets',
      'fontUrl',
      url
    );

    set(
      'assets',
      'fontFileName',
      file.name
    );

    showToast('Font uploaded');
  }

  return (
    <div>
      <div className="field">
        <label>Font</label>

        <select
          value={g.fontChoice}
          onChange={(e) =>
            set(
              'general',
              'fontChoice',
              e.target.value
            )
          }
        >
          <option value="system">
            System (Inter)
          </option>
          <option value="grotesk">
            Space Grotesk
          </option>
          <option value="mono">
            JetBrains Mono
          </option>
          <option value="playfair">
            Playfair Display
          </option>
          <option value="poppins">
            Poppins
          </option>
          <option value="custom">
            Custom upload
          </option>
        </select>
      </div>

      {g.fontChoice === 'custom' && (
        <div className="field">
          <label>
            Custom font file (.ttf / .otf /
            .woff / .woff2)
          </label>

          <div className="upload-row">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                fileRef.current.click()
              }
            >
              Upload font
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={(e) => {
                const f =
                  e.target.files[0];

                if (f) {
                  handleFontFile(f);
                }

                e.target.value = '';
              }}
            />

            <span className="upload-status">
              {a.fontFileName
                ? `Using: ${a.fontFileName}`
                : ''}
            </span>
          </div>
        </div>
      )}

      <p className="hint-text">
        Applies to your display name and
        description.
      </p>
    </div>
  );
}

function EffectsPanel({ profile, set }) {
  const g = profile.general;

  return (
    <div>
      <div className="field">
        <label>Cursor trail</label>

        <select
          value={g.cursorTrail || 'none'}
          onChange={(e) =>
            set(
              'general',
              'cursorTrail',
              e.target.value
            )
          }
        >
          <option value="none">None</option>
          <option value="sparkle">
            Sparkle
          </option>
          <option value="ribbon">
            Ribbon
          </option>
        </select>
      </div>

      <p className="hint-text">
        Follows the visitor's mouse in your
        accent color. The "Particles"
        background effect (in General) also
        runs behind your card.
      </p>
    </div>
  );
}

function EntrancePanel({ profile, set }) {
  const g = profile.general;

  return (
    <div>
      <div className="toggle-row">
        <span>
          Show a click-to-enter screen
          <br />
          <small>
            A full-screen gate visitors
            click through first
          </small>
        </span>

        <label className="switch">
          <input
            type="checkbox"
            checked={
              g.enterEnabled !== false
            }
            onChange={(e) =>
              set(
                'general',
                'enterEnabled',
                e.target.checked
              )
            }
          />

          <span className="track" />
        </label>
      </div>

      <div
        className="field"
        style={{ marginTop: 14 }}
      >
        <label>Enter screen text</label>

        <input
          type="text"
          maxLength={60}
          value={g.enterText}
          onChange={(e) =>
            set(
              'general',
              'enterText',
              e.target.value
            )
          }
        />
      </div>

      <p className="hint-text">
        This click also satisfies the
        browser's rule that sound needs a
        visitor gesture first, so your
        background music can start right as
        they enter.
      </p>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <div className="color-field">
        <input
          type="color"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />

        <input
          type="text"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />
      </div>
    </div>
  );
}

function ColorsPanel({ profile, set }) {
  const c = profile.colors;

  return (
    <div className="grid2">
      <ColorField
        label="Accent color"
        value={c.accent}
        onChange={(v) =>
          set('colors', 'accent', v)
        }
      />

      <ColorField
        label="Text color"
        value={c.text}
        onChange={(v) =>
          set('colors', 'text', v)
        }
      />

      <ColorField
        label="Card background"
        value={c.background}
        onChange={(v) =>
          set('colors', 'background', v)
        }
      />

      <ColorField
        label="Icon color"
        value={c.icon}
        onChange={(v) =>
          set('colors', 'icon', v)
        }
      />

      <ColorField
        label="Effect color"
        value={c.effect}
        onChange={(v) =>
          set('colors', 'effect', v)
        }
      />
    </div>
  );
}

function LinksPanel({
  profile,
  setProfile
}) {
  const socials = profile.socials || [];
  const badges = profile.badges || [];
  const catalogBadges =
    badges.filter(
      (b) => b.type === 'catalog'
    );

  function updateSocial(
    i,
    key,
    value
  ) {
    const next = socials.map(
      (s, idx) =>
        idx === i
          ? { ...s, [key]: value }
          : s
    );

    setProfile((p) => ({
      ...p,
      socials: next
    }));
  }

  function addSocial() {
    setProfile((p) => ({
      ...p,
      socials: [
        ...(p.socials || []),
        {
          label: '',
          url: ''
        }
      ]
    }));
  }

  function removeSocial(i) {
    setProfile((p) => ({
      ...p,
      socials: (
        p.socials || []
      ).filter(
        (_, idx) => idx !== i
      )
    }));
  }

  function updateCustomBadge(
    i,
    value
  ) {
    const next = badges.map(
      (b, idx) =>
        idx === i
          ? {
              ...b,
              label: value
            }
          : b
    );

    setProfile((p) => ({
      ...p,
      badges: next
    }));
  }

  function addCustomBadge() {
    setProfile((p) => ({
      ...p,
      badges: [
        ...(p.badges || []),
        {
          type: 'custom',
          label: '',
          icon: ''
        }
      ]
    }));
  }

  function removeBadge(i) {
    setProfile((p) => ({
      ...p,
      badges: (
        p.badges || []
      ).filter(
        (_, idx) => idx !== i
      )
    }));
  }

  return (
    <div>
      <div className="section-title">
        Socials
      </div>

      {socials.map((s, i) => (
        <div
          className="list-item"
          key={i}
        >
          <input
            type="text"
            style={{ maxWidth: 140 }}
            placeholder="Label"
            value={s.label}
            onChange={(e) =>
              updateSocial(
                i,
                'label',
                e.target.value
              )
            }
          />

          <input
            type="text"
            placeholder="https://..."
            value={s.url}
            onChange={(e) =>
              updateSocial(
                i,
                'url',
                e.target.value
              )
            }
          />

          <button
            className="btn btn-sm btn-danger"
            onClick={() =>
              removeSocial(i)
            }
          >
            Remove
          </button>
        </div>
      ))}

      <button
        className="btn btn-sm"
        onClick={addSocial}
      >
        + Add social
      </button>

      <div className="section-title">
        Official badges
      </div>

      <p
        className="hint-text"
        style={{ marginBottom: 10 }}
      >
        These are granted by the site
        admin, not chosen here — reach out
        to them if you think you should have
        one.
      </p>

      <div className="badge-catalog">
        {catalogBadges.length === 0 && (
          <span className="hint-text">
            None yet
          </span>
        )}

        {catalogBadges.map((b) => (
          <span
            key={b.id}
            className="catalog-chip active"
            style={{
              cursor: 'default'
            }}
          >
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </span>
        ))}
      </div>

      <div className="section-title">
        Custom badges
      </div>

      {badges
        .filter(
          (b) => b.type === 'custom'
        )
        .map((b) => {
          const i =
            badges.indexOf(b);

          return (
            <div
              className="list-item"
              key={i}
            >
              <input
                type="text"
                placeholder="Badge text"
                value={b.label}
                onChange={(e) =>
                  updateCustomBadge(
                    i,
                    e.target.value
                  )
                }
              />

              <button
                className="btn btn-sm btn-danger"
                onClick={() =>
                  removeBadge(i)
                }
              >
                Remove
              </button>
            </div>
          );
        })}

      <button
        className="btn btn-sm"
        onClick={addCustomBadge}
      >
        + Add custom badge
      </button>
    </div>
  );
}

function GalleryPanel({
  profile,
  setProfile,
  uploadRaw,
  showToast
}) {
  const gallery =
    profile.gallery || [];

  const fileRef = useRef(null);
  const MAX_IMAGES = 8;

  function addUrl(url) {
    if (!url) return;

    if (gallery.length >= MAX_IMAGES) {
      showToast(
        `You can have up to ${MAX_IMAGES} photos`,
        true
      );
      return;
    }

    setProfile((p) => ({
      ...p,
      gallery: [
        ...(p.gallery || []),
        url
      ]
    }));
  }

  function removeAt(i) {
    setProfile((p) => ({
      ...p,
      gallery: (
        p.gallery || []
      ).filter(
        (_, idx) => idx !== i
      )
    }));
  }

  async function handleFiles(files) {
    const remaining =
      MAX_IMAGES - gallery.length;

    if (remaining <= 0) {
      showToast(
        `You can have up to ${MAX_IMAGES} photos`,
        true
      );
      return;
    }

    const toUpload =
      Array.from(files).slice(
        0,
        remaining
      );

    for (const file of toUpload) {
      const url = await uploadRaw(
        'gallery',
        file
      );

      if (url) addUrl(url);
    }
  }

  return (
    <div>
      <p
        className="hint-text"
        style={{ marginBottom: 16 }}
      >
        Up to {MAX_IMAGES} extra photos,
        shown in a small grid on your page.
      </p>

      <div
        className="grid2"
        style={{ marginBottom: 16 }}
      >
        {gallery.map((url, i) => (
          <div
            key={i}
            style={{
              position: 'relative'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              style={{
                width: '100%',
                aspectRatio: '1',
                objectFit: 'cover',
                borderRadius: 3,
                border:
                  '1px solid var(--border)'
              }}
            />

            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() =>
                removeAt(i)
              }
              style={{
                position:
                  'absolute',
                top: 4,
                right: 4,
                background:
                  '#0D1016'
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="upload-row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            fileRef.current.click()
          }
          disabled={
            gallery.length >=
            MAX_IMAGES
          }
        >
          Upload photos
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            if (e.target.files.length) {
              handleFiles(
                e.target.files
              );
            }

            e.target.value = '';
          }}
        />

        <span className="upload-status">
          {gallery.length}/{MAX_IMAGES}
        </span>
      </div>
    </div>
  );
}

function OtherPanel({ profile, set }) {
  const o = profile.other;

  return (
    <div>
      {[
        [
          'monochromeIcons',
          'Monochrome icons'
        ],
        [
          'animatedTitle',
          'Animated browser title'
        ],
        [
          'swapBoxColors',
          'Swap card colors'
        ]
      ].map(([key, label]) => (
        <div
          className="toggle-row"
          key={key}
        >
          <span>{label}</span>

          <label className="switch">
            <input
              type="checkbox"
              checked={!!o[key]}
              onChange={(e) =>
                set(
                  'other',
                  key,
                  e.target.checked
                )
              }
            />

            <span className="track" />
          </label>
        </div>
      ))}
    </div>
  );
}

function SecurityPanel({
  showToast
}) {
  const [current, setCurrent] =
    useState('');

  const [next, setNext] =
    useState('');

  const [confirm, setConfirm] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  async function changePassword() {
    if (next.length < 6) {
      showToast(
        'New password must be at least 6 characters',
        true
      );
      return;
    }

    if (next !== confirm) {
      showToast(
        'Passwords do not match',
        true
      );
      return;
    }

    setBusy(true);

    const res = await fetch(
      '/api/profile/password',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body: JSON.stringify({
          currentPassword:
            current,
          newPassword: next
        })
      }
    );

    const data =
      await res
        .json()
        .catch(() => ({}));

    setBusy(false);

    if (!res.ok) {
      showToast(
        data.error ||
          'Could not update password',
        true
      );
      return;
    }

    setCurrent('');
    setNext('');
    setConfirm('');

    showToast(
      'Password updated'
    );
  }

  return (
    <div>
      <div className="field">
        <label>
          Current password
        </label>

        <input
          type="password"
          value={current}
          onChange={(e) =>
            setCurrent(
              e.target.value
            )
          }
        />
      </div>

      <div className="field">
        <label>
          New password
        </label>

        <input
          type="password"
          value={next}
          onChange={(e) =>
            setNext(
              e.target.value
            )
          }
        />
      </div>

      <div className="field">
        <label>
          Confirm new password
        </label>

        <input
          type="password"
          value={confirm}
          onChange={(e) =>
            setConfirm(
              e.target.value
            )
          }
        />
      </div>

      <button
        className="btn btn-primary"
        style={{ width: 'auto' }}
        onClick={changePassword}
        disabled={busy}
      >
        {busy
          ? 'Updating…'
          : 'Update password'}
      </button>

      <p
        className="hint-text"
        style={{ marginTop: 16 }}
      >
        Passwords are hashed with bcrypt
        on the server and never stored in
        plain text. Real access control now
        lives entirely server-side — unlike
        the old single-file version, there's
        no client-side hash for anyone to
        inspect.
      </p>
    </div>
  );
}
