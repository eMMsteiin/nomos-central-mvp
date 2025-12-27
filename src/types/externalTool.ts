export interface ExternalTool {
  id: string;
  name: string;
  url: string;
  icon: string; // Lucide icon name or emoji
  iconColor?: string;
  logoUrl?: string; // URL for real logo image
  isCustom: boolean;
  order: number;
  canEmbed: boolean; // true = tenta iframe, false = abre popup direto
}

export interface PresetTool {
  name: string;
  url: string;
  icon: string;
  iconColor: string;
  logoUrl?: string;
  category: 'design' | 'google' | 'microsoft' | 'productivity' | 'study' | 'reference';
  canEmbed: boolean;
}

export const PRESET_TOOLS: PresetTool[] = [
  // Study - ferramentas de estudo (muitas permitem iframe!)
  { name: 'Desmos', url: 'https://www.desmos.com/calculator', icon: 'Calculator', iconColor: '#2ECC71', logoUrl: 'https://www.desmos.com/assets/img/apps/calculator.png', category: 'study', canEmbed: true },
  { name: 'GeoGebra', url: 'https://www.geogebra.org/calculator', icon: 'Compass', iconColor: '#9C59D1', logoUrl: 'https://www.geogebra.org/images/geogebra-logo-name.png', category: 'study', canEmbed: true },
  { name: 'Wikipedia', url: 'https://pt.wikipedia.org', icon: 'BookOpen', iconColor: '#000000', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/103px-Wikipedia-logo-v2.svg.png', category: 'study', canEmbed: true },
  { name: 'Wolfram Alpha', url: 'https://www.wolframalpha.com', icon: 'Brain', iconColor: '#DD1100', logoUrl: 'https://www.wolframalpha.com/_next/static/images/share_3eSzXbxb.png', category: 'study', canEmbed: false },
  { name: 'Khan Academy', url: 'https://pt.khanacademy.org', icon: 'GraduationCap', iconColor: '#14BF96', logoUrl: 'https://cdn.kastatic.org/images/khan-logo-dark-background-2.png', category: 'study', canEmbed: false },
  
  // Reference - pesquisa e citações
  { name: 'Google Scholar', url: 'https://scholar.google.com', icon: 'Search', iconColor: '#4285F4', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Scholar_logo.svg/1024px-Google_Scholar_logo.svg.png', category: 'reference', canEmbed: false },
  { name: 'Scribbr', url: 'https://www.scribbr.com/citation/generator/', icon: 'Quote', iconColor: '#1D9BF0', logoUrl: 'https://www.scribbr.com/wp-content/uploads/2019/09/Scribbr-logo-2.png', category: 'reference', canEmbed: true },
  
  // AI tools removed - they don't work embedded and users prefer their own browser tabs
  
  // Design - nenhum permite iframe
  { name: 'Canva', url: 'https://www.canva.com', icon: 'Palette', iconColor: '#00C4CC', logoUrl: 'https://static.canva.com/static/images/canva-logo.png', category: 'design', canEmbed: false },
  { name: 'Figma', url: 'https://www.figma.com', icon: 'Figma', iconColor: '#F24E1E', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg', category: 'design', canEmbed: false },
  { name: 'Miro', url: 'https://miro.com', icon: 'PenTool', iconColor: '#FFD02F', logoUrl: 'https://miro.com/static/favicons/miro-logo-square-80.png', category: 'design', canEmbed: false },
  
  // Google Suite - nenhum permite iframe
  { name: 'Google Docs', url: 'https://docs.google.com', icon: 'FileText', iconColor: '#4285F4', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Google_Docs_logo_%282014-2020%29.svg/1024px-Google_Docs_logo_%282014-2020%29.svg.png', category: 'google', canEmbed: false },
  { name: 'Google Sheets', url: 'https://sheets.google.com', icon: 'Table', iconColor: '#34A853', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Google_Sheets_logo_%282014-2020%29.svg/1024px-Google_Sheets_logo_%282014-2020%29.svg.png', category: 'google', canEmbed: false },
  { name: 'Google Slides', url: 'https://slides.google.com', icon: 'Presentation', iconColor: '#FBBC04', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Google_Slides_2020_Logo.svg/1024px-Google_Slides_2020_Logo.svg.png', category: 'google', canEmbed: false },
  { name: 'Google Drive', url: 'https://drive.google.com', icon: 'HardDrive', iconColor: '#4285F4', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/1024px-Google_Drive_icon_%282020%29.svg.png', category: 'google', canEmbed: false },
  
  // Microsoft 365 - nenhum permite iframe
  { name: 'Word Online', url: 'https://office.live.com/start/Word.aspx', icon: 'FileText', iconColor: '#2B579A', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg/1024px-Microsoft_Office_Word_%282019%E2%80%93present%29.svg.png', category: 'microsoft', canEmbed: false },
  { name: 'Excel Online', url: 'https://office.live.com/start/Excel.aspx', icon: 'Table', iconColor: '#217346', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Microsoft_Office_Excel_%282019%E2%80%93present%29.svg/1024px-Microsoft_Office_Excel_%282019%E2%80%93present%29.svg.png', category: 'microsoft', canEmbed: false },
  { name: 'PowerPoint Online', url: 'https://office.live.com/start/PowerPoint.aspx', icon: 'Presentation', iconColor: '#D24726', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Microsoft_Office_PowerPoint_%282019%E2%80%93present%29.svg/1024px-Microsoft_Office_PowerPoint_%282019%E2%80%93present%29.svg.png', category: 'microsoft', canEmbed: false },
  { name: 'OneDrive', url: 'https://onedrive.live.com', icon: 'Cloud', iconColor: '#0078D4', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg/1024px-Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg.png', category: 'microsoft', canEmbed: false },
  
  // Productivity
  { name: 'Notion', url: 'https://www.notion.so', icon: 'Square', iconColor: '#000000', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png', category: 'productivity', canEmbed: false },
  { name: 'Trello', url: 'https://trello.com', icon: 'LayoutGrid', iconColor: '#0052CC', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Trello_logo.svg/1024px-Trello_logo.svg.png', category: 'productivity', canEmbed: false },
];

export const CATEGORY_LABELS: Record<PresetTool['category'], string> = {
  study: '📚 Estudos',
  reference: '📖 Referência',
  design: '🎨 Design',
  google: '🔵 Google Workspace',
  microsoft: '🟦 Microsoft 365',
  productivity: '⚡ Produtividade',
};
