"use client";

import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Printer, RotateCcw, Share2, Download } from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";
import { useEffect, useState } from "react";

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const { frameSlots, layout } = usePhotobooth();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto font-sans scroll-smooth">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-20 animate-in zoom-in duration-700 pt-10">
        
        {/* LEFT SIDE: The Composition View */}
        <div className="flex-1 flex flex-col items-center lg:items-end w-full">
          <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-[0_0_100px_rgba(255,255,255,0.1)] w-full max-w-lg transform -rotate-1 hover:rotate-0 transition-transform duration-700">
            <div className="text-black font-black text-center text-[11px] tracking-[0.5em] border-b-4 border-black/5 pb-8 mb-8 uppercase italic opacity-40 leading-none">Global Studio Masterpiece</div>
            <div className={`grid gap-4 ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
              {frameSlots.filter(s => !!s).map((src, i) => (
                <div key={i} className={`relative shadow-inner overflow-hidden rounded-xl ${layout === "STRIP" ? "aspect-[3/2]" : "aspect-square"}`}>
                  <img src={src} className="w-full h-full object-cover" alt="Selected" />
                </div>
              ))}
            </div>
            <div className="text-black text-[9px] text-center pt-8 opacity-20 font-mono tracking-widest uppercase">
              ID: {id?.toString().substring(0, 12).toUpperCase()} // {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Controls & QR */}
        <div className="w-full lg:w-[450px] flex flex-col items-center lg:items-start text-center lg:text-left space-y-10 animate-in slide-in-from-right-12 duration-1000">
          <div>
            <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter mb-4 leading-none uppercase">FINISHED!</h2>
            <p className="text-neutral-500 text-lg uppercase tracking-[0.3em] font-light">Your session is secured.</p>
          </div>

          <div className="bg-white p-10 rounded-[4rem] shadow-2xl ring-12 ring-white/5 inline-block">
            {origin && <QRCodeSVG value={`${origin}/view/${id}`} size={280} level="H" includeMargin />}
          </div>

          <div className="space-y-4 w-full">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Next Steps</h3>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => window.print()} 
                className="w-full bg-white text-black py-6 rounded-[1.5rem] font-black uppercase flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all text-lg shadow-xl"
              >
                <Printer size={24} /> Print Now
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-neutral-900 border border-white/10 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all">
                  <Download size={14} /> Download
                </button>
                <button 
                  onClick={() => router.push("/")} 
                  className="bg-indigo-600 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all"
                >
                  <RotateCcw size={14} /> New Session
                </button>
              </div>
            </div>
          </div>

          <div className="pt-10 opacity-30">
            <p className="text-[10px] uppercase tracking-[0.4em] leading-loose">
              Powered by MongoDB Atlas & Railway<br/>
              ProBooth Cinematic Engine v5.0
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-lg, .max-w-lg * { visibility: visible; }
          .max-w-lg { position: fixed; left: 0; top: 0; width: 100% !important; max-width: none !important; transform: none !important; box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}
