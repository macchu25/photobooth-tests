"use client";

import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, RotateCcw } from "lucide-react";
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
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-8 lg:p-12 overflow-y-auto">
      <div className="text-center flex flex-col items-center w-full max-w-4xl animate-in zoom-in duration-700 pt-10">
        <h2 className="text-6xl md:text-8xl font-black mb-16 italic tracking-tight uppercase">Your Masterpiece</h2>
        
        {/* Composition Preview */}
        <div className="bg-white p-12 md:p-16 rounded-[4rem] shadow-2xl w-full max-w-md transform rotate-1 mb-20">
          <div className="text-black font-black text-center text-[12px] tracking-[0.6em] border-b-4 border-black/5 pb-10 mb-8 uppercase italic opacity-50">Studio Print Edition</div>
          <div className={`grid gap-5 ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
            {frameSlots.filter(s => !!s).map((src, i) => (
              <div key={i} className={`relative ${layout === "STRIP" ? "aspect-[3/2]" : "aspect-square"} rounded-2xl overflow-hidden shadow-inner`}>
                <img src={src} className="w-full h-full object-cover" alt="Selected" />
              </div>
            ))}
          </div>
          <div className="text-black text-[9px] text-center pt-10 opacity-30 font-mono tracking-widest uppercase">ID: {id?.toString().substring(0, 10)}</div>
        </div>

        {/* QR Section */}
        <div className="bg-white p-12 rounded-[5rem] shadow-2xl mb-12">
          {origin && <QRCodeSVG value={`${origin}/view/${id}`} size={320} level="H" includeMargin />}
        </div>
        <h2 className="text-5xl font-black mb-16 italic tracking-tight uppercase">Scan to Download</h2>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-6 mb-20">
          <button onClick={() => window.print()} className="flex items-center gap-3 bg-white text-black px-12 py-6 rounded-full font-black uppercase text-lg shadow-2xl hover:scale-105 transition-all"><Printer /> PRINT PHOTO</button>
        </div>

        <button onClick={() => router.push("/")} className="text-neutral-500 hover:text-white transition-all font-black tracking-[0.5em] uppercase text-xl border-b-4 border-white/5 pb-4 flex items-center gap-3"><RotateCcw /> New Session</button>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-md, .max-w-md * { visibility: visible; }
          .max-w-md { position: fixed; left: 0; top: 0; width: 100%; transform: none !important; box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}
