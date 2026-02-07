export type FocusAppCategory = "social" | "video" | "games" | "news" | "other";

export interface FocusApp {
  id: string;
  label: string;
  domain: string;
  iconKey: string;
  category?: FocusAppCategory;
}

/**
 * Top 8 most popular distraction apps/sites
 */
export const FOCUS_APPS_TOP8: FocusApp[] = [
  {
    id: "instagram",
    label: "Instagram",
    domain: "instagram.com",
    iconKey: "Instagram",
    category: "social",
  },
  {
    id: "tiktok",
    label: "TikTok",
    domain: "tiktok.com",
    iconKey: "Music2",
    category: "social",
  },
  {
    id: "youtube",
    label: "YouTube",
    domain: "youtube.com",
    iconKey: "Youtube",
    category: "video",
  },
  {
    id: "x",
    label: "X",
    domain: "x.com",
    iconKey: "Twitter",
    category: "social",
  },
  {
    id: "facebook",
    label: "Facebook",
    domain: "facebook.com",
    iconKey: "Facebook",
    category: "social",
  },
  {
    id: "reddit",
    label: "Reddit",
    domain: "reddit.com",
    iconKey: "MessageSquare",
    category: "social",
  },
  {
    id: "twitch",
    label: "Twitch",
    domain: "twitch.tv",
    iconKey: "Twitch",
    category: "video",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    domain: "pinterest.com",
    iconKey: "Image",
    category: "social",
  },
];

/**
 * Extended list of popular distraction apps/sites
 */
export const FOCUS_APPS_EXTENDED: FocusApp[] = [
  {
    id: "discord",
    label: "Discord",
    domain: "discord.com",
    iconKey: "MessageCircle",
    category: "social",
  },
  {
    id: "netflix",
    label: "Netflix",
    domain: "netflix.com",
    iconKey: "Film",
    category: "video",
  },
  {
    id: "primevideo",
    label: "Prime Video",
    domain: "primevideo.com",
    iconKey: "Play",
    category: "video",
  },
  {
    id: "spotify",
    label: "Spotify",
    domain: "open.spotify.com",
    iconKey: "Music",
    category: "other",
  },
  {
    id: "kwai",
    label: "Kwai",
    domain: "kwai.com",
    iconKey: "Video",
    category: "video",
  },
  {
    id: "9gag",
    label: "9GAG",
    domain: "9gag.com",
    iconKey: "Laugh",
    category: "other",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    domain: "linkedin.com",
    iconKey: "Linkedin",
    category: "social",
  },
  {
    id: "threads",
    label: "Threads",
    domain: "threads.net",
    iconKey: "AtSign",
    category: "social",
  },
  {
    id: "snapchat",
    label: "Snapchat",
    domain: "snapchat.com",
    iconKey: "Ghost",
    category: "social",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Web",
    domain: "web.whatsapp.com",
    iconKey: "Phone",
    category: "social",
  },
  {
    id: "telegram",
    label: "Telegram",
    domain: "web.telegram.org",
    iconKey: "Send",
    category: "social",
  },
  {
    id: "twitter",
    label: "Twitter",
    domain: "twitter.com",
    iconKey: "Twitter",
    category: "social",
  },
  {
    id: "hbomax",
    label: "Max",
    domain: "max.com",
    iconKey: "Tv",
    category: "video",
  },
  {
    id: "disneyplus",
    label: "Disney+",
    domain: "disneyplus.com",
    iconKey: "Sparkles",
    category: "video",
  },
  {
    id: "tumblr",
    label: "Tumblr",
    domain: "tumblr.com",
    iconKey: "PenSquare",
    category: "social",
  },
];

/**
 * All apps combined (top 8 + extended)
 */
export const FOCUS_APPS_ALL: FocusApp[] = [
  ...FOCUS_APPS_TOP8,
  ...FOCUS_APPS_EXTENDED,
];

/**
 * Get IDs of top 8 apps
 */
export const TOP8_DOMAINS = FOCUS_APPS_TOP8.map((app) => app.domain);
