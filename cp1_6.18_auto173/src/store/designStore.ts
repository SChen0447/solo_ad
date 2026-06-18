import { create } from 'zustand';
import {
  DesignState,
  TemplateType,
  TemplateCategory,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_ACCENT_COLOR,
  getDefaultBusinessCardData,
  getDefaultLetterheadData,
  getDefaultSocialCoverData,
  BusinessCardData,
  LetterheadData,
  SocialCoverData,
  TextElement,
  LogoElement
} from '../types/design';

const lightenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

const darkenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

export const useDesignStore = create<DesignState>((set) => ({
  logoImage: null,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
  accentColor: DEFAULT_ACCENT_COLOR,
  recommendedColors: [],
  activeTemplate: 'business-card-front',
  activeCategory: 'business-card',
  businessCard: getDefaultBusinessCardData(),
  letterhead: getDefaultLetterheadData(),
  socialCover: getDefaultSocialCoverData(),
  isExporting: false,

  setLogoImage: (logo) =>
    set((state) => ({
      logoImage: logo,
      businessCard: {
        ...state.businessCard,
        front: {
          ...state.businessCard.front,
          logo: { ...state.businessCard.front.logo, src: logo }
        }
      },
      letterhead: {
        ...state.letterhead,
        logo: { ...state.letterhead.logo, src: logo }
      },
      socialCover: {
        ...state.socialCover,
        logo: { ...state.socialCover.logo, src: logo }
      }
    })),

  setPrimaryColor: (color) =>
    set(() => ({
      primaryColor: color,
      secondaryColor: lightenColor(color, 10),
      accentColor: darkenColor(color, 20)
    })),

  setRecommendedColors: (colors) => set({ recommendedColors: colors }),

  setActiveTemplate: (template: TemplateType) => set({ activeTemplate: template }),

  setActiveCategory: (category: TemplateCategory) => set({ activeCategory: category }),

  updateBusinessCardFrontElement: (elementId, updates) =>
    set((state) => {
      const element = state.businessCard.front[elementId];
      const updatedElement = { ...element, ...updates } as TextElement | LogoElement;
      return {
        businessCard: {
          ...state.businessCard,
          front: {
            ...state.businessCard.front,
            [elementId]: updatedElement
          }
        }
      };
    }),

  updateBusinessCardBackElement: (elementId, updates) =>
    set((state) => ({
      businessCard: {
        ...state.businessCard,
        back: {
          ...state.businessCard.back,
          [elementId]: { ...state.businessCard.back[elementId], ...updates }
        }
      }
    })),

  updateLetterheadElement: (elementId, updates) =>
    set((state) => {
      const element = state.letterhead[elementId];
      const updatedElement = { ...element, ...updates } as TextElement | LogoElement;
      return {
        letterhead: {
          ...state.letterhead,
          [elementId]: updatedElement
        }
      };
    }),

  updateSocialCoverElement: (elementId, updates) =>
    set((state) => {
      const element = state.socialCover[elementId];
      const updatedElement = { ...element, ...updates } as TextElement | LogoElement;
      return {
        socialCover: {
          ...state.socialCover,
          [elementId]: updatedElement
        }
      };
    }),

  setIsExporting: (exporting) => set({ isExporting: exporting })
}));

export { lightenColor, darkenColor };
