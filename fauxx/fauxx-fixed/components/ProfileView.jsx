'use client';
import { useEffect, useRef, useState } from 'react';
import { FONT_PRESETS } from '../lib/defaultProfile';

function isVideoUrl(url) {
  if (!url) return false;
  if (url.indexOf('data:') === 0) return /^data:video\//i.test(url);
  return /\.(mp4|webm|ogv|ogg)(\?.*)?$/i.test(url);
}

export default function ProfileView({ username, profile, isOwner }) {
  const g = profile.general;
  const a = profile.assets;
  const c = profile.colors;
  const o = profile.other;

  const audioRef = useRef(null);
  const nameElRef = useRef(null);
  const descElRef = useRef(null);
  const [gateGone, setGateGone] = useState(false);
  const [gateHidden, setGateHidden] = useState(g.enterEnabled === false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // CSS variables driven by saved colors/layout.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--accent', c.accent);
    root.setProperty('--text', c.text);
    root.setProperty('--panel', c.background);
    root.setProperty('--icon', c.icon);
    root.setProperty('--effect', c.effect);
    root.setProperty('--card-opacity', g.opacity + '%');
    root.setProperty('--bg-blur', g.blur + 'px');
    root.setProperty('--card-radius', (g.cardRadius != null ? g.cardRadius : 3) + 'px');
    root.setProperty('--avatar-padding', (g.avatarPadding || 0) + 'px');
    if (a.cursorUrl) {
      root.setProperty('--custom-cursor', `url('${a.cursorUrl.replace(/'/g, '%27')}') 16 16, auto`);
      document.body.classList.add('has-cursor');
    } else {
      document.body.classList.remove('has-cursor');
    }
  }, [c, g, a.cursorUrl]);

  // Font: curated Google Font, or a custom uploaded file.
  useEffect(() => {
    let link, styleTag;
    if (g.fontChoice === 'custom' && a.fontUrl) {
      styleTag = document.createElement('style');
      styleTag.textContent = `@font-face{ font-family:"CustomUserFont"; src:url(${a.fontUrl}); font-display:swap; }`;
      document.head.appendChild(styleTag);
      document.documentElement.style.setProperty('--body-font', "'CustomUserFont', sans-serif");
    } else {
      const preset = FONT_PRESETS[g.fontChoice] || FONT_PRESETS.system;
      if (preset.link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${preset.link}&display=swap`;
        document.head.appendChild(link);
      }
      document.documentElement.style.setProperty('--body-font', preset.family);
    }
    return () => { if (link) link.remove(); if (styleTag) styleTag.remove(); };
  }, [g.fontChoice, a.fontUrl]);

  // Cursor trail: sparkle or ribbon following the pointer, tinted with the accent color.
  const trailCanvasRef = useRef(null);
  useEffect(() => {
    const style = g.cursorTrail || 'none';
    const canvas = trailCanvasRef.current;
    if (style === 'none' || !canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    let points = [];
    let raf;
    function onResize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    function onMove(e) {
      points.push({ x: e.clientX, y: e.clientY, t: Date.now() });
      if (points.length > 40) points.shift();
    }
    function loop() {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6C5CE7';
      points = points.filter((p) => now - p.t < 500);
      if (style === 'sparkle') {
        points.forEach((p) => {
          const age = (now - p.t) / 500;
          ctx.globalAlpha = 1 - age;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * (1 - age) + 1, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (style === 'ribbon') {
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (let i = 1; i < points.length; i++) {
          const pA = points[i - 1], pB = points[i];
          const age = (now - pB.t) / 500;
          ctx.globalAlpha = 1 - age;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 3 * (1 - age) + 0.5;
          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('pointermove', onMove);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointermove', onMove);
    };
  }, [g.cursorTrail]);

  // Particles background effect: soft dots drifting upward, behind the card.
  const particlesCanvasRef = useRef(null);
  useEffect(() => {
    if (g.backgroundEffect !== 'particles') return;
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      s: Math.random() * 0.4 + 0.15
    }));
    let raf;
    function onResize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    function loop() {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      particles.forEach((p) => {
        p.y -= p.s;
        if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    window.addEventListener('resize', onResize);
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [g.backgroundEffect]);

  // Name effect: typewriter needs imperative typing; gradient/glitch are pure CSS (handled in JSX).
  useEffect(() => {
    if (g.usernameEffect !== 'typewriter' || !nameElRef.current) return;
    const el = nameElRef.current;
    const text = g.displayName || 'yourname';
    let i = 0;
    el.textContent = '';
    const id = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [g.usernameEffect, g.displayName]);

  // Description: static or looping typewriter across one or more phrases.
  useEffect(() => {
    if (!descElRef.current) return;
    const el = descElRef.current;
    if (!g.descTypewriter) {
      el.textContent = g.description || '';
      return;
    }
    let phrases = (g.descPhrases || []).filter((p) => p && p.trim());
    if (!phrases.length) phrases = [g.description || ''];
    let pi = 0, ci = 0, deleting = false, timer;
    el.textContent = '';
    (function step() {
      const current = phrases[pi];
      if (!deleting) {
        ci++;
        el.textContent = current.slice(0, ci);
        if (ci >= current.length) { deleting = true; timer = setTimeout(step, 1400); return; }
        timer = setTimeout(step, 45);
      } else {
        ci--;
        el.textContent = current.slice(0, ci);
        if (ci <= 0) { deleting = false; pi = (pi + 1) % phrases.length; timer = setTimeout(step, 300); return; }
        timer = setTimeout(step, 25);
      }
    })();
    return () => clearTimeout(timer);
  }, [g.descTypewriter, g.descPhrases, g.description]);

  // Animated tab title.
  useEffect(() => {
    if (!o.animatedTitle || !g.description) return;
    let i = 0;
    const id = setInterval(() => {
      document.title = (i % 2 === 0) ? (g.displayName || username) : g.description;
      i++;
    }, 2200);
    return () => { clearInterval(id); document.title = g.displayName || username; };
  }, [o.animatedTitle, g.description, g.displayName, username]);

  // Lightbox keyboard controls.
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e) {
      const count = (profile.gallery || []).length;
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowLeft' && count > 1) setLightboxIndex((i) => (i - 1 + count) % count);
      else if (e.key === 'ArrowRight' && count > 1) setLightboxIndex((i) => (i + 1) % count);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxIndex, profile.gallery]);

  function attemptAutoplay() {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  useEffect(() => {
    // If the gate is disabled entirely, try to play right away (still subject
    // to the browser's autoplay rules — most will block this without a gesture).
    if (g.enterEnabled === false) attemptAutoplay();
  }, [g.enterEnabled]);

  function handleEnter() {
    setGateGone(true);
    attemptAutoplay();
    setTimeout(() => setGateHidden(true), 550);
  }

  const isVideo = a.backgroundUrl && (a.backgroundType === 'video' || (a.backgroundType === 'auto' && isVideoUrl(a.backgroundUrl)));
  const borderClass = { 'accent-left': 'border-accent-left', outline: 'border-outline', 'full-accent': 'border-full-accent', none: '' }[g.cardBorder] || 'border-accent-left';
  const cardClass = ['card', o.swapBoxColors ? 'swap' : '', borderClass, g.layout === 'sleek' ? 'layout-sleek' : ''].filter(Boolean).join(' ');
  const avatarWrapClass = 'avatar-wrap' + ((g.avatarPadding | 0) === 0 ? ' no-pad' : '');
  const validBadges = (profile.badges || []).filter((b) => b && b.label);
  const validSocials = (profile.socials || []).filter((s) => s && s.url);

  return (
    <>
      <div id="bgLayer">
        {a.backgroundUrl && (isVideo ? (
          <video src={a.backgroundUrl} autoPlay muted loop playsInline />
        ) : (
          <div className="bg-img" style={{ backgroundImage: `url('${a.backgroundUrl.replace(/'/g, '%27')}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ))}
      </div>
      <div id="bgDim" />
      {g.backgroundEffect !== 'none' && g.backgroundEffect !== 'particles' && <div id="bgEffect" className={g.backgroundEffect} />}
      {g.backgroundEffect === 'particles' && <canvas id="particlesCanvas" ref={particlesCanvasRef} />}
      {g.cursorTrail && g.cursorTrail !== 'none' && <canvas id="trailCanvas" ref={trailCanvasRef} />}

      {!gateHidden && (
        <div id="enterGate" className={gateGone ? 'gone' : ''} onClick={handleEnter}>
          <div className="enter-glow" />
          <div className="enter-text">{g.enterText || 'click to enter...'}</div>
        </div>
      )}

      <main id="publicView">
        <div className={cardClass}>
          <div className="avatar-row">
            <div className={avatarWrapClass}>
              {a.avatarUrl && <img className={'avatar' + (g.glowName ? ' glow' : '')} src={a.avatarUrl} alt="" />}
            </div>
            <div>
              <div className={'name' + (g.glowName ? ' glow' : '')} ref={nameElRef}>
                {g.usernameEffect === 'gradient' ? (
                  <span className="gradient-fx">{g.displayName || 'yourname'}</span>
                ) : g.usernameEffect === 'glitch' ? (
                  <span className="glitch-fx" data-text={g.displayName || 'yourname'}>{g.displayName || 'yourname'}</span>
                ) : g.usernameEffect === 'typewriter' ? null : (
                  g.displayName || 'yourname'
                )}
              </div>
              <div className="meta-line">
                {[g.location, g.pronouns].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {g.statusText && (
            <div className="status-pill"><span className="status-dot" /><span>{g.statusText}</span></div>
          )}

          <div className="desc" ref={descElRef} />

          {validBadges.length > 0 && (
            <div className="badges">
              {validBadges.map((b, i) => (
                <span key={i} className={'badge' + (g.glowBadges ? ' glow' : '')}>
                  {b.icon && <span className="badge-ic">{b.icon}</span>}
                  <span>{b.label}</span>
                </span>
              ))}
            </div>
          )}

          {validSocials.length > 0 && (
            <div className="socials">
              {validSocials.map((s, i) => (
                <a key={i} className={'social' + (g.glowSocials ? ' glow' : '') + (o.monochromeIcons ? ' mono' : '')} href={s.url} target="_blank" rel="noopener noreferrer">
                  <span className="social-ic">{(s.label || '?').trim().charAt(0).toUpperCase()}</span>
                  <span>{s.label || s.url}</span>
                </a>
              ))}
            </div>
          )}

          {(profile.gallery || []).length > 0 && (
            <div className="gallery-grid">
              {profile.gallery.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" onClick={() => setLightboxIndex(i)} style={{ cursor: 'pointer' }} />
              ))}
            </div>
          )}
        </div>
      </main>

      {lightboxIndex !== null && (profile.gallery || []).length > 0 && (
        <div className="lightbox" onClick={() => setLightboxIndex(null)}>
          {profile.gallery.length > 1 && (
            <button
              type="button"
              className="lightbox-nav prev"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + profile.gallery.length) % profile.gallery.length); }}
              aria-label="Previous photo"
            >‹</button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.gallery[lightboxIndex]} alt="" onClick={(e) => e.stopPropagation()} />
          {profile.gallery.length > 1 && (
            <button
              type="button"
              className="lightbox-nav next"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % profile.gallery.length); }}
              aria-label="Next photo"
            >›</button>
          )}
          <button type="button" className="lightbox-close" onClick={() => setLightboxIndex(null)} aria-label="Close">✕</button>
        </div>
      )}

      <audio ref={audioRef} src={a.audioUrl || undefined} loop />

      {isOwner && (
        <a id="editFab" href="/edit" title="Edit your profile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </a>
      )}
    </>
  );
}
