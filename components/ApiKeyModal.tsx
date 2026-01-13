import React, { useState } from 'react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onSave: (apiKey: string) => Promise<void>;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave }) => {
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!apiKey.trim()) {
            setError("API 키를 입력해주세요.");
            return;
        }

        // Simple validation
        if (!apiKey.startsWith("AIza")) {
            setError("올바른 Gemini API 키 형식이 아닌 것 같습니다. (AIza로 시작)");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(apiKey.trim());
        } catch (e) {
            setError("키 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-naver-xl shadow-2xl p-8 border border-naver-border relative">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1. .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                    </div>

                    <h2 className="text-2xl font-bold text-naver-text">API 키 등록이 필요합니다</h2>
                    <p className="text-sm text-naver-secondary leading-relaxed">
                        나만의 시그니처 화보 생성을 위해<br />
                        <strong>Google Gemini API 키</strong>를 입력해주세요.
                    </p>

                    <div className="text-xs bg-gray-50 p-4 rounded-naver-md text-gray-500 text-left border border-gray-100">
                        <p className="font-bold mb-1">💡 왜 필요한가요?</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>사용자별 개인화된 AI 생성을 위해 필요합니다.</li>
                            <li>키는 안전하게 암호화되어 본인만 사용합니다.</li>
                            <li>제공해주신 키로만 과금/사용량이 집계됩니다.</li>
                        </ul>
                    </div>

                    <div className="space-y-2 text-left">
                        <label className="text-xs font-bold text-naver-text">Gemini API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full p-3 border border-naver-border rounded-naver-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-sm transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                    </div>

                    <div className="pt-4 space-y-3">
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="w-full py-4 bg-brand-primary text-white rounded-naver-full font-bold shadow-naver-md hover:bg-brand-hover transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                            {isSaving ? <span>저장 중...</span> : <span>API 키 저장하고 시작하기</span>}
                        </button>

                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs text-naver-quaternary hover:text-brand-primary font-bold underline transition-colors"
                        >
                            API 키가 없으신가요? (Google AI Studio에서 발급받기)
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
