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

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      {/* ... (existing code for Modals and Sidebar) ... */}

      {/* Sidebar Overlay and Aside code remains the same... */}

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
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 focus:outline-none group"
                >
                  <div className="flex flex-col items-end mr-1 hidden sm:flex">
                    <span className="text-[11px] font-bold text-naver-text group-hover:text-brand-primary transition-colors">{user.user_metadata.full_name || user.email}</span>
                  </div>
                  <img
                    src={user.user_metadata.avatar_url || "https://www.gravatar.com/avatar?d=mp"}
                    alt="profile"
                    className={`w-9 h-9 rounded-full border border-naver-border transition-all ${isProfileMenuOpen ? 'ring-2 ring-brand-primary ring-offset-1' : 'group-hover:opacity-80'}`}
                  />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-naver-lg shadow-naver-lg py-1 z-50 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-naver-border/50 bg-naver-bg/50">
                      <p className="text-xs font-bold text-naver-text truncate">{user.user_metadata.full_name || 'User'}</p>
                      <p className="text-[10px] text-naver-tertiary truncate">{user.email}</p>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => { setShowApiKeyModal(true); setIsProfileMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-naver-secondary hover:bg-naver-bg hover:text-brand-primary rounded-md transition-colors flex items-center space-x-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                        <span>API Key 설정</span>
                        {!state.userApiKey && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                      </button>
                      <button
                        onClick={() => { signOut(); setIsProfileMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors flex items-center space-x-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
                        <span>로그아웃</span>
                      </button>
                    </div>
                  </div>
                )}
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
      <div className="fixed bottom-0 left-0 bg-red-900/90 text-white text-[10px] p-2 z-[9999] w-full break-all">
        DEBUG:
        SupabaseClient: {supabase ? 'Initialized' : 'NULL'} |
        User: {user ? user.email : 'NULL'} |
        API Key: {state.userApiKey ? 'Loaded' : 'Missing'} |
        ENV_URL: {process.env.SUPABASE_URL ? 'Exists' : 'Missing'}
      </div>
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
