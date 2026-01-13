
import React from 'react';

interface UploaderProps {
  label: string;
  images: string[];
  onUpload: (base64s: string[]) => void;
  className?: string;
}

const Uploader: React.FC<UploaderProps> = ({ label, images, onUpload, className }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Cast to File[] to prevent 'unknown' type errors during map processing
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = 10 - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    const promises = filesToProcess.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        // Fix: Ensure the argument passed is explicitly a File/Blob
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      onUpload([...images, ...results]);
    });
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="block text-[11px] lg:text-[12px] font-bold text-naver-secondary uppercase tracking-widest mb-3">
        {label} <span className="text-brand-primary">({images.length}/10)</span>
      </label>
      <div className={`relative aspect-[3/4] rounded-naver-xl lg:rounded-naver-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-white shadow-naver-base ${
        images.length > 0 ? 'border-brand-primary bg-naver-bg' : 'border-naver-border hover:border-brand-primary hover:bg-naver-bg/50 cursor-pointer active:scale-[0.98]'
      }`}>
        {images.length > 0 ? (
          <>
            <img src={images[0]} alt={label} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-naver-full flex items-center justify-center mb-3">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                 </svg>
              </div>
              <span className="text-white text-xs font-bold uppercase tracking-tight">사진 추가하기</span>
            </div>
          </>
        ) : (
          <div className="text-center p-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-naver-bg rounded-naver-full flex items-center justify-center mb-4 border border-naver-border">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-naver-quaternary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              </svg>
            </div>
            <p className="text-[13px] font-bold text-naver-tertiary mb-1 uppercase tracking-tight">사진 업로드 (최대 10장)</p>
            <p className="text-[11px] text-naver-quaternary">다양한 각도의 사진을 올리면<br/>얼굴 일관성이 좋아집니다</p>
          </div>
        )}
        <input 
          type="file" 
          multiple
          accept="image/*" 
          onChange={handleFileChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
      </div>
    </div>
  );
};

export default Uploader;
