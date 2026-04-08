"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, Image as ImageIcon, Camera } from "lucide-react";

export default function GalleryPage() {
  const { id } = useParams();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`https://be-ptb-production.up.railway.app/api/sessions/${id}`);
        // If the backend doesn't have a GET /id endpoint yet, we might need to handle it or use a default
        if (!res.ok) throw new Error("Không tìm thấy bộ sưu tập này.");
        const data = await res.ok ? await res.json() : null;
        if (data && data.photos) {
          setPhotos(data.photos);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchSession();
  }, [id]);

  const downloadImage = (src: string, index: number) => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `probooth-photo-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="text-neutral-500 font-black tracking-widest uppercase italic">Preparing your gallery...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16 animate-in fade-in slide-in-from-top-8 duration-700">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic mb-4">PROBOOTH</h1>
          <div className="flex items-center justify-center gap-2 text-indigo-500 mb-2">
            <Camera size={20} />
            <span className="text-sm font-black uppercase tracking-[0.3em]">Official Gallery</span>
          </div>
          <p className="text-neutral-500 text-xs uppercase tracking-widest">Session ID: {id}</p>
        </header>

        {error ? (
          <div className="text-center bg-red-500/10 border border-red-500/20 p-12 rounded-[3rem]">
            <ImageIcon className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-black mb-2 uppercase">Gallery Not Found</h2>
            <p className="text-neutral-500">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-1000">
            {photos.map((src, i) => (
              <div key={i} className="group relative bg-neutral-900 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl transition-transform hover:scale-[1.02]">
                <img src={src} className="w-full h-full object-cover" alt={`Capture ${i+1}`} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6">
                  <button 
                    onClick={() => downloadImage(src, i)}
                    className="bg-white text-black px-8 py-4 rounded-full font-black flex items-center gap-3 shadow-2xl hover:scale-110 active:scale-95 transition-all"
                  >
                    <Download size={20} /> TẢI ẢNH {i+1}
                  </button>
                </div>
                <div className="absolute bottom-6 left-6 text-white/50 text-[10px] font-black tracking-[0.2em] italic uppercase">ProBooth // Studio Quality</div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-24 text-center text-neutral-600">
          <p className="text-[10px] uppercase tracking-[0.5em] font-black">Memory Vault Powered by MongoDB Atlas</p>
        </footer>
      </div>
    </div>
  );
}
