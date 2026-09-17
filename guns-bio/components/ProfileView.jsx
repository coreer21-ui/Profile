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

  // Curated Google Font.
  useEffect(() => {
    const preset = FONT_PRESETS[g.fontChoice] || FONT_PRESETS.system;
    let link;
    if (preset.link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${preset.link}&display=swap`;
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty('--body-font', preset.family);
    return () => { if (link) link.remove(); };
  }, [g.fontChoice]);

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
      {g.backgroundEffect !== 'none' && <div id="bgEffect" className={g.backgroundEffect} />}

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
              <div className="meta-line">{g.location || ''}</div>
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
        </div>
      </main>

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
