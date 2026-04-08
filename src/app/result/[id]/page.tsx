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
    <main className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden font-sans">
      <div className="w-full h-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-center justify-center gap-8 lg:gap-16 animate-in zoom-in duration-700 overflow-hidden">
        
        {/* LEFT SIDE: The Composition View - Restricted height to fit screen */}
        <div className="flex-1 flex flex-col items-center justify-center h-full max-h-[80vh] w-full overflow-hidden">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md h-full flex flex-col overflow-hidden transform lg:-rotate-1">
            <div className="text-black font-black text-center text-[10px] tracking-[0.4em] border-b-2 border-black/5 pb-4 mb-4 uppercase italic opacity-30 shrink-0">Official Studio Print</div>
            <div className={`flex-1 grid gap-3 overflow-y-auto pr-1 scrollbar-hide ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
              {frameSlots.filter(s => !!s).map((src, i) => (
                <div key={i} className={`relative shadow-inner overflow-hidden rounded-xl ${layout === "STRIP" ? "aspect-[3/2]" : "aspect-square"}`}>
                  <img src={src} className="w-full h-full object-cover" alt="Selected" />
                </div>
              ))}
            </div>
            <div className="text-black text-[8px] text-center pt-4 opacity-20 font-mono tracking-widest uppercase shrink-0">Session: {id?.toString().substring(0, 10)}</div>
          </div>
        </div>

        {/* RIGHT SIDE: Controls & QR */}
        <div className="w-full lg:w-[400px] flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 shrink-0">
          <div>
            <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter leading-none uppercase">FINISHED!</h2>
            <p className="text-neutral-500 text-sm uppercase tracking-[0.3em]">Scanned & Secured.</p>
          </div>

          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl ring-8 ring-white/5 inline-block">
            {origin && <QRCodeSVG value={`${origin}/view/${id}`} size={240} level="H" includeMargin />}
          </div>

          <div className="space-y-3 w-full max-w-[300px] lg:max-w-none">
            <button onClick={() => window.print()} className="w-full bg-white text-black py-5 rounded-[1.2rem] font-black uppercase flex items-center justify-center gap-3 hover:scale-105 transition-all text-sm shadow-xl italic">
              <Printer size={18} /> Print Now
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-neutral-900 border border-white/10 py-4 rounded-[1.2rem] font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all opacity-50">
                <Download size={14} /> Download
              </button>
              <button onClick={() => router.push("/")} className="bg-indigo-600 py-4 rounded-[1.2rem] font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all italic">
                <RotateCcw size={14} /> New
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-md, .max-w-md * { visibility: visible; }
          .max-w-md { position: fixed; left: 0; top: 0; width: 100% !important; max-width: none !important; transform: none !important; box-shadow: none !important; height: auto !important; max-height: none !important; overflow: visible !important; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </main>
  );
}
