"use client";

import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Printer, RotateCcw, Share2, Download, CheckCircle2 } from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";
import { useEffect, useState } from "react";

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const { frameSlots, layout, maxPhotos } = usePhotobooth();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Calculate photo size for strip based on count
  const photoHeight = maxPhotos > 6 ? "h-[50px] md:h-[60px]" : "h-[80px] md:h-[100px]";

  return (
    <main className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden font-sans">
      <div className="w-full h-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20 animate-in zoom-in duration-500 overflow-hidden">
        
        {/* LEFT: Finished Product */}
        <div className="flex-1 flex flex-col items-center justify-center h-full max-h-[85vh] w-full overflow-hidden select-none">
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(255,255,255,0.1)] w-fit flex flex-col items-center overflow-hidden transform lg:-rotate-1 hover:rotate-0 transition-transform duration-700 h-fit max-h-full">
            <div className="text-black font-black text-center text-[9px] tracking-[0.4em] border-b-2 border-black/5 pb-4 mb-4 uppercase italic opacity-40 shrink-0 w-full">Studio Print Edition</div>
            
            <div className={`flex flex-col gap-2 overflow-y-auto scrollbar-hide shrink items-center ${layout === "GRID" ? "grid grid-cols-2" : "flex flex-col"}`}>
              {frameSlots.filter(s => !!s).map((src, i) => (
                <div key={i} className={`relative shadow-inner overflow-hidden rounded-lg bg-neutral-100 ${layout === "STRIP" ? `aspect-[3/2] ${photoHeight}` : "aspect-square w-24 md:w-32"}`}>
                  <img src={src} className="w-full h-full object-cover" alt="Selected" />
                </div>
              ))}
            </div>

            <div className="text-black text-[7px] text-center pt-6 opacity-20 font-mono tracking-widest uppercase shrink-0 w-full">
                {id?.toString().substring(0, 15).toUpperCase()}
            </div>
          </div>
        </div>

        {/* RIGHT: QR and Actions */}
        <div className="w-full lg:w-[400px] flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3 justify-center lg:justify-start text-emerald-500">
              <CheckCircle2 size={24} />
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">SUCCESS!</h2>
            </div>
            <p className="text-neutral-500 text-xs uppercase tracking-[0.4em] font-black">Digital Copy Ready</p>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[3.5rem] shadow-2xl ring-1 ring-white/10 inline-block overflow-hidden">
            {origin && <QRCodeSVG value={`${origin}/view/${id}`} size={220} level="H" includeMargin />}
          </div>

          <div className="space-y-4 w-full">
            <button 
              onClick={() => window.print()} 
              className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black uppercase flex items-center justify-center gap-3 hover:scale-105 transition-all text-sm shadow-xl"
            >
              <Printer size={18} /> Print Memories
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-neutral-900 border border-white/5 py-4 rounded-[1.2rem] font-black uppercase text-[8px] tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all opacity-30">
                <Download size={14} /> Download
              </button>
              <button 
                onClick={() => router.push("/")} 
                className="bg-indigo-600 py-4 rounded-[1.2rem] font-black uppercase text-[8px] tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all italic italic tracking-wider"
              >
                <RotateCcw size={14} /> New Shot
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-h-full, .max-h-full * { visibility: visible; }
          .max-h-full { position: fixed; left: 0; top: 0; width: 100% !important; transform: none !important; box-shadow: none !important; height: auto !important; max-height: none !important; overflow: visible !important; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
