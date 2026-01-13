
import React from 'react';
import { WEDDING_SCENES, POSE_TEMPLATES, OUTFIT_STYLES } from '../constants';
import { AppState, UserPhoto } from '../types';

interface SidebarProps {
  state: AppState & { user?: any };
  updateState: (updates: Partial<AppState>) => void;
  retouchSuggestions: string[];
  userPhotos: UserPhoto[];
  onApplyAIEdit: (prompt: string) => void;
  onAddText: () => void;
  onSuggestPose: () => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
  onBatchGenerate: () => Promise<void>;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ state, updateState, userPhotos, onDeletePhoto, onBatchGenerate }) => {
  const tabs = [
    { id: 'generation', label: '스튜디오', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg> },
    { id: 'album', label: '앨범', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> },
  ];

  const handleRefUpload = (type: 'scene' | 'pose' | 'brideOutfit' | 'groomOutfit') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        let key = '';
        if (type === 'scene') key = 'sceneRefImage';
        else if (type === 'pose') key = 'poseRefImage';
        else if (type === 'brideOutfit') key = 'brideOutfitRefImage';
        else if (type === 'groomOutfit') key = 'groomOutfitRefImage';
        updateState({ [key]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      <nav className="flex border-b border-naver-border shrink-0">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => updateState({ activeTab: tab.id as any })} className={`flex-1 py-4 flex flex-col items-center justify-center transition-all border-b-2 ${state.activeTab === tab.id ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-naver-tertiary'}`}>
            <span className="mb-1.5">{tab.icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-tight">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        {state.activeTab === 'generation' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="p-4 bg-brand-primary/10 rounded-naver-xl border border-brand-primary/20">
              <h3 className="text-[11px] font-bold text-brand-primary uppercase mb-2">프리미엄 원클릭 서비스</h3>
              <button
                onClick={onBatchGenerate}
                disabled={state.isGenerating || state.isBatchGenerating || state.brideImages.length === 0}
                className="w-full py-3 bg-brand-primary text-white rounded-naver-md font-bold text-xs shadow-naver-md hover:bg-brand-hover active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" /><path d="m3.265 10.602 7.667 4.128a1.5 1.5 0 0 0 1.336 0l7.667-4.128a.75.75 0 1 1 .712 1.32l-7.667 4.128a3 3 0 0 1-2.672 0l-7.667-4.128a.75.75 0 0 1 .712-1.32ZM3.265 14.352l7.667 4.128a1.5 1.5 0 0 0 1.336 0l7.667-4.128a.75.75 0 1 1 .712 1.32l-7.667 4.128a3 3 0 0 1-2.672 0l-7.667-4.128a.75.75 0 0 1 .712-1.32Z" /></svg>
                <span>시그니처 5종 포즈팩 생성</span>
              </button>
            </div>

            <div className="space-y-4">
              <SectionHeader title="스튜디오 배경" onUpload={handleRefUpload('scene')} refImg={state.sceneRefImage} onClear={() => updateState({ sceneRefImage: null })} />
              {!state.sceneRefImage && (
                <div className="grid grid-cols-2 gap-2">
                  {WEDDING_SCENES.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => updateState({ selectedScene: scene.description })}
                      className={`relative aspect-video rounded-naver-md overflow-hidden border-2 transition-all group bg-naver-border/30 ${state.selectedScene === scene.description ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-transparent opacity-90 hover:opacity-100 shadow-sm'}`}
                    >
                      <img
                        src={scene.thumbnail}
                        alt={scene.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className={`absolute inset-0 transition-colors ${state.selectedScene === scene.description ? 'bg-brand-primary/10' : 'bg-black/20 group-hover:bg-black/5'}`}></div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                        <span className="text-[11px] text-white font-bold leading-tight drop-shadow-sm">{scene.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-[12px] font-bold text-naver-text uppercase tracking-widest border-b border-naver-border pb-2">웨딩 의상 스타일</h3>
              <div className="grid grid-cols-2 gap-2">
                {OUTFIT_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => updateState({ selectedOutfit: style.description })}
                    className={`relative aspect-video rounded-naver-md overflow-hidden border-2 transition-all group bg-naver-border/30 ${state.selectedOutfit === style.description ? 'border-brand-primary ring-2 ring-brand-primary/20 shadow-naver-md' : 'border-transparent opacity-90 hover:opacity-100 shadow-sm'}`}
                  >
                    <img
                      src={style.thumbnail}
                      alt={style.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1546193430-c2d20e03daf7?q=80&w=400&auto=format&fit=crop';
                      }}
                    />
                    <div className={`absolute inset-0 transition-colors ${state.selectedOutfit === style.description ? 'bg-brand-primary/15' : 'bg-black/20 group-hover:bg-black/10'}`}></div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <span className="text-[11px] text-white font-bold leading-tight drop-shadow-sm">{style.name}</span>
                    </div>
                    {state.selectedOutfit === style.description && (
                      <div className="absolute top-2 right-2 bg-brand-primary text-white p-1 rounded-full shadow-lg z-10 animate-in zoom-in-50">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-naver-xl space-y-4">
                <p className="text-[9px] font-bold text-naver-quaternary uppercase text-center">특정 의상 이미지로 대체하기 (선택)</p>
                <div className="grid grid-cols-2 gap-3">
                  <SectionHeader title="신부 전용" onUpload={handleRefUpload('brideOutfit')} refImg={state.brideOutfitRefImage} onClear={() => updateState({ brideOutfitRefImage: null })} compact />
                  <SectionHeader title="신랑 전용" onUpload={handleRefUpload('groomOutfit')} refImg={state.groomOutfitRefImage} onClear={() => updateState({ groomOutfitRefImage: null })} compact />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="포즈 가이드" onUpload={handleRefUpload('pose')} refImg={state.poseRefImage} onClear={() => updateState({ poseRefImage: null })} />
              {!state.poseRefImage && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-1.5">
                    {POSE_TEMPLATES.map((pose) => (
                      <button
                        key={pose.id}
                        onClick={() => updateState({ selectedPose: pose.prompt, customPosePrompt: pose.prompt })}
                        className={`w-full text-left px-4 py-2.5 rounded-naver-md text-[11px] font-bold border transition-all ${state.selectedPose === pose.prompt ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-white text-naver-secondary border-naver-border hover:bg-naver-bg'}`}
                      >
                        {pose.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {state.activeTab === 'album' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <h3 className="text-[12px] font-bold text-naver-text uppercase tracking-widest border-b border-naver-border pb-2">나의 웨딩 앨범</h3>

            {/* User Profile Section */}
            <div className="bg-naver-bg p-4 rounded-naver-lg border border-naver-border mb-6 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xl overflow-hidden">
                {state.user?.user_metadata?.avatar_url ? (
                  <img src={state.user.user_metadata.avatar_url} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  state.user?.email?.[0].toUpperCase() || "U"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-naver-text truncate">{state.user?.user_metadata?.full_name || "사용자"}</p>
                <p className="text-[10px] text-naver-quaternary truncate">{state.user?.email}</p>
              </div>
            </div>

            {userPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {userPhotos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-naver-md overflow-hidden border border-naver-border bg-white shadow-naver-sm">
                    <img
                      src={photo.image_url}
                      alt={photo.scene_name}
                      className="w-full aspect-[3/4] object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => updateState({ resultImage: photo.image_url, activeTab: 'generation' })}
                    />
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-naver-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="p-1.5 bg-white border-t border-naver-border">
                      <p className="text-[9px] text-naver-tertiary truncate font-bold">{photo.scene_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-naver-bg rounded-full flex items-center justify-center mx-auto mb-3 border border-naver-border">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-naver-quaternary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <p className="text-[11px] text-naver-quaternary">저장된 화보가 없습니다.<br />화보를 생성하고 앨범에 저장해보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SectionHeader = ({ title, onUpload, refImg, onClear, compact }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <h3 className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold text-naver-text uppercase tracking-wider`}>{title}</h3>
      <label className={`${compact ? 'text-[8px] px-1 py-0.5' : 'text-[9px] px-2 py-1'} font-bold text-brand-primary bg-brand-primary/10 rounded-naver-full cursor-pointer border border-brand-primary/20 hover:bg-brand-primary/20 transition-all`}>
        업로드
        <input type="file" className="hidden" onChange={onUpload} accept="image/*" />
      </label>
    </div>
    {refImg && (
      <div className={`relative rounded-naver-lg overflow-hidden border-2 border-brand-primary shadow-naver-md group bg-naver-bg ${compact ? 'h-14' : 'h-24'}`}>
        <img src={refImg} alt="Reference" className="w-full h-full object-cover" />
        <button onClick={onClear} className="absolute top-1 right-1 bg-white text-naver-text p-1 rounded-naver-full shadow-lg hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    )}
  </div>
);

export default Sidebar;
