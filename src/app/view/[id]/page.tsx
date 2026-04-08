"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, Image as ImageIcon, Camera, AlertCircle } from "lucide-react";

export default function GalleryPage() {
  const { id } = useParams();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      if (!id) return;
      setLoading(true);
      setError(null);
      
      try {
        // Đảm bảo URL kết thúc bằng ID chính xác
        const res = await fetch(`https://be-ptb-production.up.railway.app/api/sessions/${id}`);
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `Lỗi server: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data && data.photos && data.photos.length > 0) {
          setPhotos(data.photos);
        } else {
          throw new Error("Bộ sưu tập này không có ảnh hoặc đã bị xóa.");
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message === "Failed to fetch" ? "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng." : err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  const downloadImage = (src: string, index: number) => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `probooth-${id}-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-6">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-6" />
        <p className="text-neutral-500 font-black tracking-[0.3em] uppercase italic animate-pulse">Retrieving Memories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans select-none">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12 animate-in fade-in slide-in-from-top-10 duration-700">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic mb-2">PROBOOTH</h1>
          <div className="flex items-center justify-center gap-3 text-emerald-500 mb-2">
            <Camera size={20} />
            <span className="text-xs font-black uppercase tracking-[0.4em]">Digital Collection</span>
          </div>
          <p className="text-neutral-700 text-[9px] uppercase tracking-widest font-mono">Archive ID: {id}</p>
        </header>

        {error ? (
          <div className="text-center bg-red-500/5 border border-red-500/10 p-16 rounded-[4rem] animate-in zoom-in">
            <AlertCircle className="mx-auto text-red-500 mb-6" size={56} />
            <h2 className="text-3xl font-black mb-4 uppercase italic">Gallery Error</h2>
            <p className="text-neutral-500 max-w-sm mx-auto leading-relaxed mb-10">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-white text-black px-10 py-4 rounded-full font-black uppercase text-xs">Try Again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-1000">
            {photos.map((src, i) => (
              <div key={i} className="group relative bg-white p-4 rounded-[2.5rem] shadow-2xl transition-all hover:scale-[1.03] hover:-rotate-1">
                <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-neutral-100 ring-1 ring-black/5">
                  <img src={src} className="w-full h-full object-cover" alt={`Capture ${i+1}`} />
                </div>
                <div className="mt-4 flex flex-col items-center">
                   <button 
                    onClick={() => downloadImage(src, i)}
                    className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all text-xs uppercase"
                  >
                    <Download size={16} /> Save to Device
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-24 text-center">
            <div className="h-px bg-white/5 w-24 mx-auto mb-8" />
            <p className="text-[9px] uppercase tracking-[0.6em] font-black text-neutral-800 italic">Cinematic Photobooth Pro // End of Gallery</p>
        </footer>
      </div>
    </div>
  );
}
