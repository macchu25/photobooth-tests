"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";

export default function PackageSelectPage() {
  const router = useRouter();
  const { setMaxPhotos, setFrameSlots, resetSession } = usePhotobooth();

  const handleSelect = (n: number) => {
    resetSession();
    setMaxPhotos(n);
    setFrameSlots(new Array(n).fill(undefined));
    router.push("/capture");
  };

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      <h2 className="text-5xl md:text-7xl font-black mb-12 italic tracking-tight uppercase animate-in fade-in slide-in-from-bottom-8 shrink-0">SELECT PACKAGE</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl animate-in fade-in zoom-in duration-700 overflow-hidden">
        {[4, 6, 8].map(n => (
          <button 
            key={n} 
            onClick={() => handleSelect(n)} 
            className="group relative bg-neutral-900/50 backdrop-blur-2xl border border-white/5 p-12 rounded-[3.5rem] hover:border-white transition-all overflow-hidden text-center flex flex-col items-center justify-center"
          >
            <div className="absolute -right-6 -bottom-6 text-white/5 text-[15rem] font-black group-hover:text-white/10 transition-colors pointer-events-none">{n}</div>
            <div className="text-9xl font-black text-neutral-600 group-hover:text-white transition-colors relative z-10 leading-none">{n}</div>
            <div className="text-[10px] uppercase font-black tracking-[0.4em] text-neutral-500 relative z-10 mt-6">Digital Captures</div>
          </button>
        ))}
      </div>
      <button 
        onClick={() => router.push("/")} 
        className="mt-12 text-neutral-500 hover:text-white flex items-center gap-2 uppercase text-[10px] font-black tracking-widest transition-all shrink-0"
      >
        <RotateCcw size={14} /> Back
      </button>
    </main>
  );
}
