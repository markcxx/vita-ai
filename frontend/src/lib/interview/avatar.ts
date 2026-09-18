const UPDATED_CAST_TYPES = new Set(["project_deep_dive", "technical", "behavioral", "creative", "product", "finance", "education", "legal", "service"]);
const CAST_TYPES = new Set(['hr','technical','scenario','behavioral','project_deep_dive','leader','creative','product','engineering','finance','education','health','legal','sales','service','agriculture']);

const AVATAR_PATHS: Record<string, string> = {
  engineer: '/images/interviewers/panel-engineer.png',
  medical: '/images/interviewers/panel-medical.png',
  agriculture: '/images/interviewers/panel-agriculture.png',
  panel_hr: '/images/interviewers/panel-hr.png',
  panel_technical: '/images/interviewers/panel-technical.png',
  panel_product: '/images/interviewers/panel-product.png',
  hr: '/images/interviewers/avatar-hr.png',
  business: '/images/interviewers/avatar-business.png',
  professional: '/images/interviewers/avatar-professional.png',
  pink_tweed: '/images/interviewers/avatar-pink-tweed.png',
  denim_creative: '/images/interviewers/avatar-denim-creative.png',
  white_executive: '/images/interviewers/avatar-white-executive.png',
  knit_academic: '/images/interviewers/avatar-knit-academic.png',
  lavender_tech: '/images/interviewers/avatar-lavender-tech.png',
  fashion_media: '/images/interviewers/avatar-fashion-media.png',
  navy_technical: '/images/interviewers/avatar-navy-technical.png',
  beige_business: '/images/interviewers/avatar-beige-business.png',
};

const LEGACY_AVATAR_BY_TYPE: Record<string, string> = {
  behavioral: AVATAR_PATHS.hr,
  scenario: AVATAR_PATHS.business,
  leader: AVATAR_PATHS.business,
  technical: AVATAR_PATHS.professional,
  project_deep_dive: AVATAR_PATHS.professional,
};

export function getInterviewerAvatar(avatar?: string, type?: string) {
  if (avatar === 'custom' || type?.startsWith('custom_') && !avatar) {
    const label = (type || 'AI').slice(-2).replace(/[^a-zA-Z0-9]/g,'');
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" rx="30" fill="#e6f2fc"/><circle cx="120" cy="90" r="44" fill="#9fc4e6"/><path d="M40 230v-28a80 65 0 01160 0v28" fill="#abcde9"/><text x="120" y="214" text-anchor="middle" fill="#47759d" font-size="28">${label}</text></svg>`)}`;
  }
  if (type && CAST_TYPES.has(type) && (!avatar || !avatar.startsWith('data:'))) return `/images/interviewers/${UPDATED_CAST_TYPES.has(type) ? 'cast-v4' : 'cast-v3'}/${type === 'project_deep_dive' ? 'project_deep_dive-thinning' : type}.png`;
  if (avatar && (avatar.startsWith('/') || /^data:image\/(png|jpeg|webp);base64,/.test(avatar))) return avatar;
  if (avatar && AVATAR_PATHS[avatar]) return AVATAR_PATHS[avatar];
  if (type && LEGACY_AVATAR_BY_TYPE[type]) return LEGACY_AVATAR_BY_TYPE[type];
  if (type && AVATAR_PATHS[type]) return AVATAR_PATHS[type];
  return AVATAR_PATHS.business;
}
