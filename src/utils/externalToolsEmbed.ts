// Sites conhecidos que bloqueiam iframes
export const BLOCKED_SITES = [
  // Google
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'drive.google.com',
  'scholar.google.com',
  
  // Microsoft 365
  'microsoft.com',
  'microsoft365.com',
  'office.com',
  'office365.com',
  'live.com',
  'onedrive.live.com',
  'sharepoint.com',
  'microsoftonline.com',
  'login.microsoftonline.com',
  'outlook.com',
  'outlook.live.com',
  
  // AI Tools
  'claude.ai',
  'anthropic.com',
  'chat.openai.com',
  'chatgpt.com',
  'openai.com',
  'perplexity.ai',
  
  // Design Tools
  'canva.com',
  'figma.com',
  'miro.com',
  
  // Productivity
  'notion.so',
  'notion.com',
  'trello.com',
  
  // Translation
  'deepl.com',
  
  // Education
  'khanacademy.org',
  'wolframalpha.com',
  
  // Video/Streaming
  'youtube.com',
  'www.youtube.com',
  
  // Others
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
];

export function isKnownBlockedSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_SITES.some(blocked => 
      hostname === blocked || hostname.endsWith('.' + blocked)
    );
  } catch {
    return false;
  }
}
