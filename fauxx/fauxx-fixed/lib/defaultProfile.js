export const BADGE_CATALOG = [
  { id: 'owner', label: 'Owner', icon: '★' },
  { id: 'verified', label: 'Verified', icon: '✓' },
  { id: 'vip', label: 'VIP', icon: '♛' },
  { id: 'booster', label: 'Booster', icon: '⚡' },
  { id: 'supporter', label: 'Early Supporter', icon: '♥' },
  { id: 'staff', label: 'Staff', icon: '⚙' },
  { id: 'bughunter', label: 'Bug Hunter', icon: '⛃' },
  { id: 'og', label: 'OG', icon: '◆' }
];

export const FONT_PRESETS = {
  system: { family: "'Inter', sans-serif", link: null },
  grotesk: { family: "'Space Grotesk', sans-serif", link: null },
  mono: { family: "'JetBrains Mono', monospace", link: null },
  playfair: { family: "'Playfair Display', serif", link: 'Playfair+Display:wght@500;700' },
  poppins: { family: "'Poppins', sans-serif", link: 'Poppins:wght@400;600' }
};

export function defaultProfile(displayName) {
  return {
    general: {
      displayName: displayName || 'yourname',
      description: 'what are you doing here?',
      statusText: '',
      location: '',
      opacity: 10,
      blur: 0,
      backgroundEffect: 'none',
      usernameEffect: 'none',
      glowName: false,
      glowSocials: false,
      glowBadges: false,
      descTypewriter: false,
      descPhrases: [],
      layout: 'classic',
      cardRadius: 3,
      cardBorder: 'none',
      avatarPadding: 0,
      fontChoice: 'system',
      enterEnabled: true,
      enterText: 'click to enter...',
      cursorTrail: 'none',
      pronouns: ''
    },
    assets: {
      backgroundUrl: '',
      backgroundType: 'auto',
      audioUrl: '',
      avatarUrl: '',
      cursorUrl: '',
      fontUrl: '',
      fontFileName: ''
    },
    colors: {
      accent: '#6C5CE7',
      text: '#E7E9EC',
      background: '#12161D',
      icon: '#8890A0',
      effect: '#ffffff'
    },
    other: {
      monochromeIcons: false,
      animatedTitle: false,
      swapBoxColors: false
    },
    socials: [],
    badges: [],
    gallery: []
  };
}

// Merge stored data over the defaults so a profile that predates a new field
// still renders sensibly instead of throwing on a missing property.
export function withDefaults(stored, displayName) {
  const base = defaultProfile(displayName);
  if (!stored) return base;
  return {
    general: { ...base.general, ...(stored.general || {}) },
    assets: { ...base.assets, ...(stored.assets || {}) },
    colors: { ...base.colors, ...(stored.colors || {}) },
    other: { ...base.other, ...(stored.other || {}) },
    socials: Array.isArray(stored.socials) ? stored.socials : [],
    badges: Array.isArray(stored.badges) ? stored.badges : [],
    gallery: Array.isArray(stored.gallery) ? stored.gallery.filter((u) => typeof u === 'string') : []
  };
}

// Split badges by who controls them: catalog badges (the "official" ones
// from BADGE_CATALOG) are admin-granted only; custom badges stay
// self-service. Used to sanitize a self-save so a user can't grant
// themselves an official badge by editing the request body.
export function mergeBadgesForSelfSave(existingBadges, incomingBadges) {
  const existingCatalog = (existingBadges || []).filter((b) => b && b.type === 'catalog');
  const incomingCustom = (incomingBadges || []).filter((b) => b && b.type === 'custom');
  return [...existingCatalog, ...incomingCustom];
}
