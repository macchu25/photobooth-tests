"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";

export default function PackageSelectPage() {
  const router = useRouter();
  const { setMaxPhotos, setFrameSlots } = usePhotobooth();

  const handleSelect = (n: number) => {
    setMaxPhotos(n);
    setFrameSlots(new Array(n).fill(undefined));
    router.push("/capture");
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h2 className="text-6xl md:text-8xl font-black mb-16 italic tracking-tight uppercase animate-in fade-in slide-in-from-bottom-8">Select Package</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl animate-in fade-in zoom-in duration-700">
        {[4, 6, 8].map(n => (
          <button 
            key={n} 
            onClick={() => handleSelect(n)} 
            className="group relative bg-neutral-900/50 backdrop-blur-3xl border border-white/5 p-16 rounded-[4rem] hover:border-white transition-all overflow-hidden text-center"
          >
            <div className="absolute -right-10 -bottom-10 text-white/5 text-[15rem] font-black group-hover:text-white/10 transition-colors pointer-events-none">{n}</div>
            <div className="text-9xl font-black text-neutral-600 group-hover:text-white transition-colors relative z-10 leading-none">{n}</div>
            <div className="text-sm uppercase font-black tracking-widest text-neutral-500 relative z-10 mt-6">Photos</div>
          </button>
        ))}
      </div>
      <button 
        onClick={() => router.push("/")} 
        className="mt-16 text-neutral-500 hover:text-white flex items-center gap-2 uppercase text-xs tracking-widest transition-all"
      >
        <RotateCcw size={16} /> Back
      </button>
    </main>
  );
}
