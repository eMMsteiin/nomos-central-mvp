export interface ExternalTool {
  id: string;
  name: string;
  url: string;
  icon: string; // Lucide icon name or emoji
  iconColor?: string;
  isCustom: boolean;
  order: number;
}

export interface PresetTool {
  name: string;
  url: string;
  icon: string;
  iconColor: string;
  category: 'design' | 'google' | 'microsoft' | 'productivity';
}

export const PRESET_TOOLS: PresetTool[] = [
  // Design
  { name: 'Canva', url: 'https://www.canva.com', icon: 'Palette', iconColor: '#8B5CF6', category: 'design' },
  { name: 'Figma', url: 'https://www.figma.com', icon: 'Figma', iconColor: '#F24E1E', category: 'design' },
  
  // Google Suite
  { name: 'Google Docs', url: 'https://docs.google.com', icon: 'FileText', iconColor: '#4285F4', category: 'google' },
  { name: 'Google Sheets', url: 'https://sheets.google.com', icon: 'Table', iconColor: '#34A853', category: 'google' },
  { name: 'Google Slides', url: 'https://slides.google.com', icon: 'Presentation', iconColor: '#FBBC04', category: 'google' },
  { name: 'Google Drive', url: 'https://drive.google.com', icon: 'HardDrive', iconColor: '#4285F4', category: 'google' },
  
  // Microsoft 365
  { name: 'Word Online', url: 'https://office.live.com/start/Word.aspx', icon: 'FileText', iconColor: '#2B579A', category: 'microsoft' },
  { name: 'Excel Online', url: 'https://office.live.com/start/Excel.aspx', icon: 'Table', iconColor: '#217346', category: 'microsoft' },
  { name: 'PowerPoint Online', url: 'https://office.live.com/start/PowerPoint.aspx', icon: 'Presentation', iconColor: '#D24726', category: 'microsoft' },
  { name: 'OneDrive', url: 'https://onedrive.live.com', icon: 'Cloud', iconColor: '#0078D4', category: 'microsoft' },
  
  // Productivity
  { name: 'Notion', url: 'https://www.notion.so', icon: 'Square', iconColor: '#000000', category: 'productivity' },
  { name: 'Trello', url: 'https://trello.com', icon: 'LayoutGrid', iconColor: '#0052CC', category: 'productivity' },
  { name: 'Miro', url: 'https://miro.com', icon: 'PenTool', iconColor: '#FFD02F', category: 'productivity' },
];

export const CATEGORY_LABELS: Record<PresetTool['category'], string> = {
  design: 'Design',
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  productivity: 'Produtividade',
};
