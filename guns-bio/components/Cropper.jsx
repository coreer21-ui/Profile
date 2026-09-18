'use client';
import { useEffect, useRef, useState } from 'react';

const VIEW = 260;
const OUT = 480;

export default function Cropper({ src, onCancel, onCropped }) {
  const imgRef = useRef(null);
  const viewportRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const state = useRef({ natW: 0, natH: 0, baseScale: 1, scale: 1, tx: 0, ty: 0 });
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const probe = new Image();
    if (src.indexOf('data:') !== 0 && src.indexOf('blob:') !== 0) probe.crossOrigin = 'anonymous';
    probe.onload = () => {
      const s = state.current;
      s.natW = probe.naturalWidth;
      s.natH = probe.naturalHeight;
      s.baseScale = VIEW / Math.min(s.natW, s.natH);
      s.scale = 1;
      setZoom(100);
      if (imgRef.current) imgRef.current.src = src;
      layout();
      center();
      setReady(true);
    };
    probe.onerror = () => setError('Could not load that image to crop.');
    probe.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function layout() {
    const img = imgRef.current;
    if (!img) return;
    const s = state.current;
    const factor = s.baseScale * s.scale;
    img.style.width = s.natW * factor + 'px';
    img.style.height = s.natH * factor + 'px';
  }
  function clampPan() {
    const img = imgRef.current;
    if (!img) return;
    const s = state.current;
    const w = parseFloat(img.style.width), h = parseFloat(img.style.height);
    const minTx = Math.min(0, VIEW - w), minTy = Math.min(0, VIEW - h);
    s.tx = Math.max(minTx, Math.min(0, s.tx));
    s.ty = Math.max(minTy, Math.min(0, s.ty));
    img.style.transform = `translate(${s.tx}px, ${s.ty}px)`;
  }
  function center() {
    const img = imgRef.current;
    if (!img) return;
    const s = state.current;
    const w = parseFloat(img.style.width), h = parseFloat(img.style.height);
    s.tx = (VIEW - w) / 2;
    s.ty = (VIEW - h) / 2;
    clampPan();
  }

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
    function down(e) {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startTx = state.current.tx; startTy = state.current.ty;
      vp.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!dragging) return;
      state.current.tx = startTx + (e.clientX - startX);
      state.current.ty = startTy + (e.clientY - startY);
      clampPan();
    }
    function up() { dragging = false; }
    vp.addEventListener('pointerdown', down);
    vp.addEventListener('pointermove', move);
    vp.addEventListener('pointerup', up);
    vp.addEventListener('pointercancel', up);
    return () => {
      vp.removeEventListener('pointerdown', down);
      vp.removeEventListener('pointermove', move);
      vp.removeEventListener('pointerup', up);
      vp.removeEventListener('pointercancel', up);
    };
  }, [ready]);

  function handleZoom(e) {
    const v = parseInt(e.target.value, 10);
    setZoom(v);
    state.current.scale = v / 100;
    layout();
    clampPan();
  }

  function apply() {
    const img = imgRef.current;
    const s = state.current;
    const factor = s.baseScale * s.scale;
    const sx = -s.tx / factor, sy = -s.ty / factor, sSize = VIEW / factor;
    const canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
      canvas.toBlob((blob) => {
        if (blob) onCropped(blob);
        else setError('Could not export the cropped image.');
      }, 'image/jpeg', 0.92);
    } catch {
      setError('Can\u2019t crop this image because of the source\u2019s cross-origin policy \u2014 try uploading the file directly instead.');
    }
  }

  return (
    <div className="modal-wrap" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" style={{ maxWidth: 320 }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: "'Space Grotesk',sans-serif", fontSize: 17 }}>Crop your avatar</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--icon)' }}>Drag to reposition, use the slider to zoom.</p>
        <div
          ref={viewportRef}
          style={{
            width: VIEW, height: VIEW, overflow: 'hidden', position: 'relative', margin: '0 auto',
            border: '1px solid var(--border)', borderRadius: 3, background: '#0B0E13', touchAction: 'none', cursor: 'grab'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} alt="" style={{ position: 'absolute', left: 0, top: 0, userSelect: 'none', pointerEvents: 'none' }} />
        </div>
        {error && <p className="error-text" style={{ marginTop: 10 }}>{error}</p>}
        <input type="range" min="100" max="320" value={zoom} onChange={handleZoom} style={{ width: '100%', marginTop: 14, accentColor: 'var(--accent)' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={apply} disabled={!ready}>Use this crop</button>
        </div>
      </div>
    </div>
  );
}
