
import { WeddingScene, PoseTemplate, FilterStyle, OutfitStyle } from './types';

export const WEDDING_SCENES: WeddingScene[] = [
  { 
    id: 'hanbok', 
    name: '한옥 클래식', 
    description: 'Traditional Korean Hanok house with wooden architecture, tiled roofs, and elegant paper doors background', 
    thumbnail: 'https://images.unsplash.com/photo-1590664095641-7fa05f689813?q=80&w=800&auto=format&fit=crop' 
  },
  { 
    id: 'cathedral', 
    name: '웅장한 성당', 
    description: 'Grand gothic cathedral interior with stained glass windows, high stone arches, and majestic altar', 
    thumbnail: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?q=80&w=800&auto=format&fit=crop' 
  },
  { 
    id: 'hotel', 
    name: '럭셔리 볼룸', 
    description: 'Luxury hotel grand ballroom with giant crystal chandeliers and rich floral arrangements', 
    thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop' 
  },
  { 
    id: 'forest', 
    name: '비밀의 숲', 
    description: 'Sun-drenched mystical forest garden with ancient trees and romantic hanging flowers', 
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop' 
  },
];

export const OUTFIT_STYLES: OutfitStyle[] = [
  { 
    id: 'royal', 
    name: '로열 실크', 
    description: 'High-end luxury white silk wedding ballgown for the bride and a sharp classic black tuxedo for the groom.', 
    thumbnail: 'https://images.unsplash.com/photo-1546193430-c2d20e03daf7?q=80&w=800&auto=format&fit=crop' 
  },
  { 
    id: 'hanbok', 
    name: '궁중 혼례복', 
    description: 'Traditional Korean Royal Wedding Hanbok. Bride in red Hwarot with gold embroidery, Groom in blue Gwanbok.', 
    thumbnail: 'https://images.unsplash.com/photo-1582234372722-50d7ccc30e5a?q=80&w=800&auto=format&fit=crop' 
  },
  { 
    id: 'vintage', 
    name: '레트로 가든', 
    description: 'Vintage bohemian lace dress for the bride and a stylish beige checkered suit for the groom.', 
    thumbnail: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?q=80&w=800&auto=format&fit=crop' 
  },
  { 
    id: 'modern', 
    name: '모던 시크', 
    description: 'Minimalist contemporary silk mermaid dress for the bride and a sophisticated slim-fit charcoal suit for the groom.', 
    thumbnail: 'https://images.unsplash.com/photo-1550005809-91ad75fb315f?q=80&w=800&auto=format&fit=crop' 
  },
];

export const POSE_TEMPLATES: PoseTemplate[] = [
  { id: 'classic', name: '정면 클래식', prompt: 'The couple is standing side by side, looking directly at the camera with a gentle, loving smile.' },
  { id: 'forehead', name: '이마 맞대기', prompt: 'The couple is touching their foreheads together, eyes closed, creating a deeply romantic and intimate atmosphere.' },
  { id: 'lift', name: '안아 올리기', prompt: 'The groom is lifting the bride up in his arms, both showing expressions of pure joy and celebration.' },
  { id: 'back', name: '백허그', prompt: 'The groom is hugging the bride warmly from behind, a soft and protective embrace.' },
];

export const FILTER_STYLES: FilterStyle[] = [
  { id: 'editorial', name: '에디토리얼', description: '잡지 화보 같은 선명함', prompt: 'High-end fashion magazine grade, sharp professional focus, balanced studio highlights.' },
  { id: 'fineart', name: '파인 아트', description: '회화적인 부드러운 질감', prompt: 'Painterly texture, soft artistic lighting, museum-quality oil painting finish.' },
  { id: 'film-gold', name: '필름 골드', description: '따뜻한 빈티지 아날로그', prompt: 'Vintage film aesthetic with warm golden skin tones and subtle analog grain.' },
];
