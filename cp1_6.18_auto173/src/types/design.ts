export type TemplateType = 'business-card-front' | 'business-card-back' | 'letterhead' | 'twitter-cover' | 'instagram-cover' | 'linkedin-cover';

export type TemplateCategory = 'business-card' | 'letterhead' | 'social-cover';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TextElement {
  id: string;
  content: string;
  position: Position;
  fontSize: number;
  opacity: number;
  color: string;
  fontWeight?: string;
}

export interface LogoElement {
  src: string | null;
  position: Position;
  scale: number;
  opacity: number;
}

export interface BusinessCardData {
  front: {
    logo: LogoElement;
    name: TextElement;
    title: TextElement;
    phone: TextElement;
    email: TextElement;
    website: TextElement;
  };
  back: {
    slogan: TextElement;
  };
}

export interface LetterheadData {
  logo: LogoElement;
  companyName: TextElement;
  address: TextElement;
  contact: TextElement;
}

export interface SocialCoverData {
  logo: LogoElement;
  title: TextElement;
  subtitle: TextElement;
}

export interface DesignState {
  logoImage: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  recommendedColors: string[];
  activeTemplate: TemplateType;
  activeCategory: TemplateCategory;
  businessCard: BusinessCardData;
  letterhead: LetterheadData;
  socialCover: SocialCoverData;
  isExporting: boolean;
  setLogoImage: (logo: string | null) => void;
  setPrimaryColor: (color: string) => void;
  setRecommendedColors: (colors: string[]) => void;
  setActiveTemplate: (template: TemplateType) => void;
  setActiveCategory: (category: TemplateCategory) => void;
  updateBusinessCardFrontElement: (elementId: keyof BusinessCardData['front'], updates: Partial<TextElement | LogoElement>) => void;
  updateBusinessCardBackElement: (elementId: keyof BusinessCardData['back'], updates: Partial<TextElement>) => void;
  updateLetterheadElement: (elementId: keyof LetterheadData, updates: Partial<TextElement | LogoElement>) => void;
  updateSocialCoverElement: (elementId: keyof SocialCoverData, updates: Partial<TextElement | LogoElement>) => void;
  setIsExporting: (exporting: boolean) => void;
}

export const DEFAULT_PRIMARY_COLOR = '#4F46E5';
export const DEFAULT_SECONDARY_COLOR = '#818CF8';
export const DEFAULT_ACCENT_COLOR = '#3730A3';

export const getDefaultBusinessCardData = (): BusinessCardData => ({
  front: {
    logo: {
      src: null,
      position: { x: 45, y: 27 },
      scale: 1,
      opacity: 1
    },
    name: {
      id: 'name',
      content: '张三',
      position: { x: 45, y: 100 },
      fontSize: 16,
      opacity: 1,
      color: '#1f2937',
      fontWeight: 'bold'
    },
    title: {
      id: 'title',
      content: '设计师',
      position: { x: 45, y: 125 },
      fontSize: 11,
      opacity: 0.8,
      color: '#6b7280'
    },
    phone: {
      id: 'phone',
      content: '📞 138-0000-0000',
      position: { x: 45, y: 165 },
      fontSize: 9,
      opacity: 0.9,
      color: '#4b5563'
    },
    email: {
      id: 'email',
      content: '✉️ zhangsan@example.com',
      position: { x: 45, y: 182 },
      fontSize: 9,
      opacity: 0.9,
      color: '#4b5563'
    },
    website: {
      id: 'website',
      content: '🌐 www.example.com',
      position: { x: 45, y: 199 },
      fontSize: 9,
      opacity: 0.9,
      color: '#4b5563'
    }
  },
  back: {
    slogan: {
      id: 'slogan',
      content: '创意无限',
      position: { x: 180, y: 135 },
      fontSize: 24,
      opacity: 1,
      color: '#ffffff',
      fontWeight: 'bold'
    }
  }
});

export const getDefaultLetterheadData = (): LetterheadData => ({
  logo: {
    src: null,
    position: { x: 100, y: 60 },
    scale: 1.2,
    opacity: 1
  },
  companyName: {
    id: 'companyName',
    content: '创意设计工作室',
    position: { x: 100, y: 140 },
    fontSize: 22,
    opacity: 1,
    color: '#1f2937',
    fontWeight: 'bold'
  },
  address: {
    id: 'address',
    content: '北京市朝阳区创意大厦 888 号',
    position: { x: 100, y: 180 },
    fontSize: 10,
    opacity: 0.7,
    color: '#6b7280'
  },
  contact: {
    id: 'contact',
    content: '电话: 010-12345678 | 邮箱: hello@design.com',
    position: { x: 100, y: 200 },
    fontSize: 10,
    opacity: 0.7,
    color: '#6b7280'
  }
});

export const getDefaultSocialCoverData = (): SocialCoverData => ({
  logo: {
    src: null,
    position: { x: 750, y: 180 },
    scale: 1.5,
    opacity: 1
  },
  title: {
    id: 'title',
    content: '创意设计工作室',
    position: { x: 750, y: 300 },
    fontSize: 42,
    opacity: 1,
    color: '#ffffff',
    fontWeight: 'bold'
  },
  subtitle: {
    id: 'subtitle',
    content: '让创意点亮世界',
    position: { x: 750, y: 370 },
    fontSize: 20,
    opacity: 0.85,
    color: '#ffffff'
  }
});
