
export type WeddingScene = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
};

export type PoseTemplate = {
  id: string;
  name: string;
  prompt: string;
};

export type FilterStyle = {
  id: string;
  name: string;
  prompt: string;
  description?: string;
};

export type OutfitStyle = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
};

export interface TextOverlay {
  id: string;
  text: string;
  font: string;
  color: string;
  size: number;
}

export interface UserPhoto {
  id: string;
  image_url: string;
  scene_name: string;
  created_at: string;
}

export interface AppState {
  brideImages: string[];
  groomImages: string[];
  sceneRefImage: string | null;
  poseRefImage: string | null;
  brideOutfitRefImage: string | null;
  groomOutfitRefImage: string | null;
  resultImage: string | null;
  originalGeneratedImage: string | null;
  batchResults: string[];
  selectedScene: string;
  selectedPose: string;
  selectedOutfit: string;
  customPosePrompt: string;
  selectedFilter: string;
  lighting: number;
  isGenerating: boolean;
  isBatchGenerating: boolean;
  batchProgress: number;
  isHighQuality: boolean;

  brightness: number;
  contrast: number;
  saturation: number;
  beautyLevel: number;
  frameStyle: string;
  activeFilter: string;
  textOverlays: TextOverlay[];

  activeTab: 'generation' | 'color' | 'album';
  zoom: number;
  customRetouchPrompt: string;
  showEditModal: boolean;
  userApiKey?: string;
}
