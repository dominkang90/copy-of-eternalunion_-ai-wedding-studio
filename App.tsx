import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Uploader from './components/Uploader';
import ApiKeyModal from './components/ApiKeyModal';
import { AppState, UserPhoto } from './types';
import { generateWeddingPhoto, editWeddingPhoto, suggestWeddingPose, suggestWeddingRetouch } from './services/geminiService';
import { supabase, signInWithGoogle, signOut, savePhotoToAlbum, getUserPhotos, deleteUserPhoto, getUserApiKey, updateUserApiKey } from './services/supabaseService';
import { WEDDING_SCENES, POSE_TEMPLATES, FILTER_STYLES, OUTFIT_STYLES } from './constants';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [retouchSuggestions, setRetouchSuggestions] = useState<string[]>([]);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [editTab, setEditTab] = useState<'adjust' | 'face' | 'ai'>('adjust');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const isCancelledRef = useRef(false);

  const [state, setState] = useState<AppState>({
    brideImages: [],
    groomImages: [],
    sceneRefImage: null,
    poseRefImage: null,
    brideOutfitRefImage: null,
    groomOutfitRefImage: null,
    resultImage: null,
    originalGeneratedImage: null,
    batchResults: [],
    selectedScene: WEDDING_SCENES[0].description,
    selectedPose: POSE_TEMPLATES[0].prompt,
    selectedOutfit: OUTFIT_STYLES[0].description,
    customPosePrompt: POSE_TEMPLATES[0].prompt,
    selectedFilter: FILTER_STYLES[0].prompt,
    lighting: 50,
    isGenerating: false,
    isBatchGenerating: false,
    batchProgress: 0,
    isHighQuality: true,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    beautyLevel: 50,
    frameStyle: 'none',
    activeFilter: 'none',
    textOverlays: [],
    activeTab: 'generation',
    zoom: 1,
    customRetouchPrompt: '',
    showEditModal: false,
    userApiKey: undefined,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleUserLogin(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        handleUserLogin(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }

    if (window.innerWidth >= 1024) setIsSidebarOpen(true);
  }, []);

  const handleUserLogin = async (loggedUser: User | null) => {
    setUser(loggedUser);
    if (loggedUser) {
      fetchUserPhotos(loggedUser.id);
      // Fetch API Key
      try {
        const key = await getUserApiKey(loggedUser.id);
        if (key) {
          updateState({ userApiKey: key });
        } else {
          setShowApiKeyModal(true);
        }
      } catch (e) {
        console.error("Failed to fetch API Key", e);
      }
    } else {
      setUserPhotos([]);
      updateState({ userApiKey: undefined });
    }
  };

  const onSaveApiKey = async (apiKey: string) => {
    if (!user) return;
    await updateUserApiKey(user.id, apiKey);
    updateState({ userApiKey: apiKey });
    setShowApiKeyModal(false);
  };

  const fetchUserPhotos = async (userId: string) => {
    if (!supabase) return;
    try {
      const photos = await getUserPhotos(userId);
      setUserPhotos(photos);
    } catch (e) {
      console.error("앨범 로드 실패", e);
    }
  };

  const handleDownload = (imageUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || `wedding_photo_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToAlbum = async (targetImg?: string) => {
    if (!supabase) {
      setErrorMessage("Supabase 설정이 완료되지 않았습니다.");
      return;
    }
    if (!user) {
      setErrorMessage("앨범에 저장하려면 로그인이 필요합니다.");
      return;
    }
    const imgToSave = targetImg || state.resultImage;
    if (!imgToSave) return;

    setIsSaving(true);
    try {
      await savePhotoToAlbum(user.id, imgToSave, state.selectedScene);
      await fetchUserPhotos(user.id);
      setErrorMessage("앨범에 저장되었습니다!");
      setTimeout(() => setErrorMessage(null), 3000);
    } catch (e) {
      setErrorMessage("앨범 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("정말 이 사진을 앨범에서 삭제하시겠습니까?")) return;
    try {
      await deleteUserPhoto(photoId);
      if (user) await fetchUserPhotos(user.id);
    } catch (e) {
      setErrorMessage("삭제 중 오류가 발생했습니다.");
    }
  };

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
    setHoveredImage(null);
  };

  const handleGoHome = () => {
    updateState({
      resultImage: null,
      originalGeneratedImage: null,
      batchResults: [],
      brightness: 100,
      contrast: 100,
      saturation: 100,
      customRetouchPrompt: '',
      activeTab: 'generation',
      showEditModal: false
    });
    setRetouchSuggestions([]);
    setErrorMessage(null);
    setHoveredImage(null);
  };

  const handleBatchGenerate = async () => {
    if (!state.userApiKey) {
      if (user) setShowApiKeyModal(true);
      else setErrorMessage("로그인 후 이용 가능합니다.");
      return;
    }
    if (state.brideImages.length === 0 || state.groomImages.length === 0) {
      setErrorMessage("신랑/신부 사진을 업로드해주세요.");
      return;
    }

    const batchPoses = [
      "Cinematic wide shot of the couple standing together, grandeur and elegance",
      "Extreme close-up emotional portrait, soft lighting on faces",
      "Low angle shot looking up at the couple from behind, romantic back-view",
      "The groom holding the bride from behind, intimate and warm",
      "A trendy magazine-style profile shot of the couple looking away"
    ];

    updateState({ isBatchGenerating: true, batchProgress: 0, batchResults: [], resultImage: null });
    isCancelledRef.current = false;

    let results: string[] = [];
    let firstResult: string | null = null;

    try {
      for (let i = 0; i < batchPoses.length; i++) {
        if (isCancelledRef.current) break;
        updateState({ batchProgress: i + 1 });

        const img = await generateWeddingPhoto(
          state.brideImages,
          state.groomImages,
          state.selectedScene,
          batchPoses[i],
          state.selectedFilter,
          state.lighting,
          true,
          state.sceneRefImage,
          state.poseRefImage,
          state.selectedOutfit,
          state.brideOutfitRefImage,
          state.groomOutfitRefImage,
          firstResult,
          state.userApiKey // Pass Key
        );

        if (i === 0) firstResult = img;
        results.push(img);
        updateState({ batchResults: [...results] });
      }

      if (!isCancelledRef.current) {
        updateState({ resultImage: results[0], originalGeneratedImage: results[0] });
      }
    } catch (e: any) {
      setErrorMessage("배치 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
      updateState({ isBatchGenerating: false });
    }
  };

  const handleGenerate = async () => {
    if (!state.userApiKey) {
      if (user) setShowApiKeyModal(true);
      else setErrorMessage("로그인 후 이용 가능합니다.");
      return;
    }
    if (state.brideImages.length === 0 || state.groomImages.length === 0) {
      setErrorMessage("사진을 업로드해주세요.");
      return;
    }
    setErrorMessage(null);
    isCancelledRef.current = false;
    updateState({ isGenerating: true, batchResults: [] });

    try {
      const imageUrl = await generateWeddingPhoto(
        state.brideImages,
        state.groomImages,
        state.selectedScene,
        state.customPosePrompt || state.selectedPose,
        state.selectedFilter,
        state.lighting,
        true,
        state.sceneRefImage,
        state.poseRefImage,
        state.selectedOutfit,
        state.brideOutfitRefImage,
        state.groomOutfitRefImage,
        null,
        state.userApiKey // Pass Key
      );

      if (isCancelledRef.current) return;
      updateState({ resultImage: imageUrl, originalGeneratedImage: imageUrl });

      const suggestions = await suggestWeddingRetouch(state.selectedScene, state.userApiKey);
      setRetouchSuggestions(suggestions);
    } catch (error: any) {
      setErrorMessage(error.message || "이미지 생성 오류");
    } finally {
      updateState({ isGenerating: false });
    }
  };

  const handleRetouch = async (instruction: string) => {
    if (!state.resultImage || !state.userApiKey) return;
    updateState({ isGenerating: true });
    try {
      const img = await editWeddingPhoto(state.resultImage, instruction, state.userApiKey);
      // 팝업 내부에서 즉각 반영
      updateState({ resultImage: img });
    } catch (e) {
      setErrorMessage("리터칭 오류");
    } finally {
      updateState({ isGenerating: false });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-naver-bg overflow-hidden font-sans">
      <ApiKeyModal isOpen={showApiKeyModal} onSave={onSaveApiKey} />

      {/* 프로페셔널 편집 모달 (팝업 내 즉각 반영 버전) */}
      {state.showEditModal && state.resultImage && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-4 lg:p-10 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => updateState({ showEditModal: false })} />

          <div className="relative w-full max-w-7xl h-full sm:h-[90vh] bg-[#1a1a1a] rounded-none sm:rounded-naver-2xl shadow-naver-lg overflow-hidden flex flex-col lg:flex-row animate-in zoom-in-95 duration-300 border border-white/10">
            {/* 왼쪽: 메인 프리뷰 영역 */}
            <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
              {/* 상단 툴바 */}
              <div className="h-14 px-6 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-sm z-20">
                <div className="flex items-center space-x-4">
                  <span className="text-white/60 text-[11px] font-bold tracking-widest uppercase">Editor v2.0 Professional</span>
                  <div className="h-4 w-[1px] bg-white/10"></div>
                  <button
                    onMouseDown={() => setIsComparing(true)}
                    onMouseUp={() => setIsComparing(false)}
                    onMouseLeave={() => setIsComparing(false)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-naver-full transition-all active:scale-95 flex items-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                    <span>원본과 비교 (누르고 계세요)</span>
                  </button>
                </div>
                <button
                  onClick={() => updateState({ showEditModal: false })}
                  className="text-white/40 hover:text-white p-2 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center p-8 relative">
                {/* 이미지 로딩 오버레이 */}
                {state.isGenerating && (
                  <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white text-xs font-bold tracking-widest animate-pulse">리터칭 데이터 분석 및 적용 중...</p>
                  </div>
                )}

                <img
                  src={isComparing ? (state.originalGeneratedImage || state.resultImage) : state.resultImage}
                  className="max-h-full w-auto shadow-2xl transition-all duration-300 rounded-naver-sm select-none"
                  style={{
                    filter: `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`,
                    transform: isComparing ? 'scale(0.98)' : 'scale(1)'
                  }}
                  alt="editor-preview"
                />

                {isComparing && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-4 py-2 rounded-naver-md border border-white/20 z-40 text-white text-[10px] font-bold uppercase tracking-widest">Original View</div>
                )}
              </div>

              {/* 하단 단축키 바 */}
              <div className="h-10 px-6 flex items-center text-[9px] text-white/30 font-bold uppercase tracking-widest bg-black/40 border-t border-white/5">
                Space: Compare • S: Save • ESC: Close
              </div>
            </div>

            {/* 오른쪽: 정밀 컨트롤 패널 */}
            <div className="w-full lg:w-[400px] bg-[#1a1a1a] border-l border-white/10 flex flex-col overflow-hidden">
              <div className="flex border-b border-white/10">
                <button onClick={() => setEditTab('adjust')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${editTab === 'adjust' ? 'text-brand-primary border-b-2 border-brand-primary bg-white/5' : 'text-white/40 hover:text-white/60'}`}>기본 보정</button>
                <button onClick={() => setEditTab('face')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${editTab === 'face' ? 'text-brand-primary border-b-2 border-brand-primary bg-white/5' : 'text-white/40 hover:text-white/60'}`}>인물 리터칭</button>
                <button onClick={() => setEditTab('ai')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${editTab === 'ai' ? 'text-brand-primary border-b-2 border-brand-primary bg-white/5' : 'text-white/40 hover:text-white/60'}`}>AI 특수효과</button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {editTab === 'adjust' && (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Color & Exposure</h3>
                      <div className="space-y-6">
                        <EditorSlider label="Exposure (밝기)" value={state.brightness} onChange={(v) => updateState({ brightness: v })} dark />
                        <EditorSlider label="Contrast (대비)" value={state.contrast} onChange={(v) => updateState({ contrast: v })} dark />
                        <EditorSlider label="Vibrance (채도)" value={state.saturation} onChange={(v) => updateState({ saturation: v })} dark />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Quick Retouch</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {["선명하게", "부드럽게", "영화처럼", "따뜻하게"].map(cmd => (
                          <button key={cmd} onClick={() => handleRetouch(cmd)} className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-naver-md text-[10px] font-bold text-white/80 transition-all">{cmd}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {editTab === 'face' && (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Smart Face Retouch</h3>
                      <div className="space-y-2">
                        {["피부 결 고르게 정리", "눈동자 선명하게 보정", "치아 미백 효과 적용", "전체적인 얼굴 윤곽 최적화"].map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleRetouch(s)}
                            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-brand-primary/20 border border-white/10 rounded-naver-md text-[11px] font-bold text-white/80 transition-all flex items-center justify-between group"
                          >
                            <span>{s}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-white/20 group-hover:text-brand-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {editTab === 'ai' && (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">AI Artistic Effects</h3>
                      <div className="space-y-2">
                        {retouchSuggestions.length > 0 ? retouchSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleRetouch(s)}
                            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-brand-primary/20 border border-white/10 rounded-naver-md text-[11px] font-bold text-white/80 transition-all flex items-center justify-between"
                          >
                            <span className="truncate pr-4">{s}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-brand-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                          </button>
                        )) : (
                          <p className="text-white/40 text-[10px]">스튜디오 조명 분석 후 추천 리터칭이 활성화됩니다.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 공통: 맞춤 요청 영역 (상시 노출) */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Custom Request (맞춤 요청)</h3>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="예: '신부의 드레스 끝단을 더 길게'"
                      value={state.customRetouchPrompt}
                      onChange={(e) => updateState({ customRetouchPrompt: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleRetouch(state.customRetouchPrompt)}
                      className="w-full pl-4 pr-12 py-4 bg-white/5 border border-white/10 rounded-naver-md text-xs text-white focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all placeholder:text-white/20"
                    />
                    <button
                      onClick={() => handleRetouch(state.customRetouchPrompt)}
                      disabled={!state.customRetouchPrompt || state.isGenerating}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-brand-primary hover:bg-brand-primary/20 rounded-naver-sm transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                    </button>
                  </div>
                  <p className="text-[9px] text-white/20 font-medium">자연스러운 문장으로 요청하면 AI 전문가가 실시간으로 반영합니다.</p>
                </div>
              </div>

              <div className="p-8 pt-0 flex flex-col space-y-3">
                <button
                  onClick={() => handleSaveToAlbum()}
                  disabled={isSaving}
                  className="w-full py-4 bg-brand-primary text-white rounded-naver-md font-bold text-sm shadow-naver-md hover:bg-brand-hover active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  )}
                  <span>최종 결과 앨범 저장</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownload(state.resultImage!)}
                    className="py-3 bg-white/10 text-white border border-white/10 rounded-naver-md font-bold text-[11px] transition-all hover:bg-white/20"
                  >
                    기기에 다운로드
                  </button>
                  <button
                    onClick={() => updateState({ showEditModal: false })}
                    className="py-3 bg-transparent text-white/40 hover:text-white/60 border border-white/10 rounded-naver-md font-bold text-[11px] transition-all"
                  >
                    편집창 닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {hoveredImage && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] pointer-events-none select-none animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white p-1 rounded-naver-lg shadow-naver-lg border border-naver-border overflow-hidden ring-4 ring-black/5">
            <img src={hoveredImage} className="max-w-[280px] max-h-[380px] object-contain rounded-naver-md" alt="preview" />
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[110] transform transition-transform duration-300 lg:relative lg:translate-x-0 w-full max-w-[340px] shadow-naver-lg lg:shadow-none bg-white ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          state={{ ...state, user }}
          updateState={updateState}
          retouchSuggestions={retouchSuggestions}
          userPhotos={userPhotos}
          onApplyAIEdit={handleRetouch}
          onAddText={() => { }}
          onSuggestPose={async () => {
            if (!state.userApiKey) {
              if (user) setShowApiKeyModal(true);
              return;
            }
            const p = await suggestWeddingPose(state.selectedScene, state.userApiKey);
            updateState({ customPosePrompt: p });
          }}
          onBatchGenerate={handleBatchGenerate}
          onDeletePhoto={handleDeletePhoto}
          onClose={() => setIsSidebarOpen(false)}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        <header className="h-16 px-4 lg:px-8 shrink-0 flex items-center justify-between bg-white border-b border-naver-border z-30 shadow-naver-sm">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-naver-bg rounded-naver-md text-naver-secondary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <h1 onClick={handleGoHome} className="text-lg lg:text-xl font-bold text-naver-text tracking-tighter cursor-pointer hover:opacity-70 transition-all select-none">
              <span className="text-brand-primary mr-2">ETERNAL</span> UNION
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[11px] font-bold text-naver-text">{user.user_metadata.full_name || user.email}</span>
                  <div className="flex space-x-2 mt-0.5">
                    <button
                      onClick={() => setShowApiKeyModal(true)}
                      className={`text-[10px] font-bold ${state.userApiKey ? 'text-naver-quaternary hover:text-brand-primary' : 'text-red-500 animate-pulse'}`}
                    >
                      {state.userApiKey ? 'API Key 변경' : 'API Key 필요!'}
                    </button>
                    <span className="text-[10px] text-naver-border">|</span>
                    <button onClick={() => signOut()} className="text-[10px] text-naver-secondary hover:text-red-500 font-bold transition-colors">
                      로그아웃
                    </button>
                  </div>
                </div>
                <img
                  src={user.user_metadata.avatar_url}
                  alt="profile"
                  className="w-9 h-9 rounded-full border border-naver-border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowApiKeyModal(true)}
                />
              </div>
            ) : (
              <button onClick={() => signInWithGoogle()} className="px-4 py-1.5 border border-naver-border rounded-naver-full text-xs font-bold hover:bg-naver-bg transition-all flex items-center space-x-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" /></svg>
                <span>구글 로그인</span>
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={state.isGenerating || state.isBatchGenerating || state.brideImages.length === 0}
              className={`px-8 py-2.5 rounded-naver-full font-bold shadow-naver-md transition-all text-sm ${state.isGenerating || state.isBatchGenerating ? 'bg-naver-bg text-naver-quaternary' : 'bg-brand-primary text-white hover:bg-brand-hover active:scale-95'}`}
            >
              {state.isGenerating ? "처리 중..." : "화보 생성"}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-naver-bg p-4 lg:p-8 flex flex-col items-center justify-center custom-scrollbar relative">
          {errorMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg p-4 bg-white border-l-4 border-brand-primary shadow-naver-lg text-xs font-bold rounded-naver-md animate-in slide-in-from-top-4 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="p-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}

          {!state.resultImage && !state.batchResults.length && !state.isGenerating && !state.isBatchGenerating ? (
            <div className="max-w-4xl w-full flex flex-col items-center animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 w-full mb-8">
                <Uploader label="신부 사진들" images={state.brideImages} onUpload={(imgs) => updateState({ brideImages: imgs })} />
                <Uploader label="신랑 사진들" images={state.groomImages} onUpload={(imgs) => updateState({ groomImages: imgs })} />
              </div>
            </div>
          ) : (state.isGenerating || state.isBatchGenerating) ? (
            <div className="text-center px-4 flex flex-col items-center animate-in fade-in duration-300">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-brand-primary/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                {state.isBatchGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand-primary">
                    {state.batchProgress}/5
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-naver-text italic mb-4">
                {state.isBatchGenerating ? "시그니처 5종 화보를 제작 중입니다..." : "전문가 리터칭 화보 생성 중..."}
              </h3>
              <p className="text-naver-quaternary text-sm max-w-xs leading-relaxed">인물과 의상의 고유함을 유지하며 최적의 앵글을 계산하고 있습니다.</p>
            </div>
          ) : (
            <div className="w-full max-w-7xl h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
              {state.batchResults.length > 0 ? (
                <div className="w-full space-y-8">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="text-xl font-bold">스튜디오 시그니처 화보 팩 (5종)</h2>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => state.batchResults.forEach((img, i) => handleDownload(img, `wedding_pack_${i + 1}.png`))}
                        className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-naver-full shadow-sm hover:bg-brand-hover transition-all"
                      >
                        전체 다운로드
                      </button>
                      <button onClick={handleGoHome} className="text-sm text-naver-quaternary font-bold hover:text-naver-text transition-all">새로 만들기</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {state.batchResults.map((img, idx) => (
                      <div key={idx} className="relative group rounded-naver-xl overflow-hidden shadow-naver-md border border-naver-border bg-white transition-all hover:scale-[1.03] hover:shadow-naver-lg cursor-pointer" onClick={() => updateState({ resultImage: img, originalGeneratedImage: img, showEditModal: true })}>
                        <img src={img} className="w-full aspect-[3/4] object-cover" alt={`result-${idx}`} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4">
                          <span className="text-[10px] font-bold mb-2">PRO EDIT</span>
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                            className="mt-4 px-3 py-1 bg-white text-brand-primary text-[10px] font-bold rounded-naver-full"
                          >
                            다운로드
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative group max-w-lg w-full">
                  <div className="relative rounded-naver-xl overflow-hidden shadow-naver-lg transition-transform duration-500 hover:scale-[1.01] cursor-pointer" onClick={() => updateState({ showEditModal: true, originalGeneratedImage: state.resultImage })}>
                    <img src={state.resultImage!} className="w-full h-auto" alt="result" />
                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-naver-full text-[10px] font-bold flex items-center space-x-2">
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
                      <span>클릭하여 정밀 편집</span>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button onClick={() => updateState({ showEditModal: true, originalGeneratedImage: state.resultImage })} className="px-8 py-3 bg-brand-primary text-white rounded-naver-full text-sm font-bold shadow-naver-md hover:bg-brand-hover active:scale-95 transition-all">스튜디오 리터칭</button>
                    <button onClick={() => handleDownload(state.resultImage!)} className="px-8 py-3 bg-white text-naver-secondary border border-naver-border rounded-naver-full text-sm font-bold shadow-naver-sm hover:bg-naver-bg transition-all">기기에 저장</button>
                    <button onClick={handleGoHome} className="px-8 py-3 bg-naver-text text-white rounded-naver-full text-sm font-bold transition-all">새로 만들기</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const EditorSlider = ({ label, value, onChange, dark }: { label: string, value: number, onChange: (v: number) => void, dark?: boolean }) => (
  <div className="space-y-3">
    <div className={`flex justify-between text-[10px] font-bold uppercase tracking-tight ${dark ? 'text-white/40' : 'text-naver-secondary'}`}>
      <span>{label}</span>
      <span className="text-brand-primary">{value}%</span>
    </div>
    <input
      type="range"
      min="50"
      max="150"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className={`w-full h-1 rounded-naver-full appearance-none accent-brand-primary cursor-pointer ${dark ? 'bg-white/10' : 'bg-naver-border'}`}
    />
  </div>
);

export default App;
