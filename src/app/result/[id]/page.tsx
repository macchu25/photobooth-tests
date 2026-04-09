"use client";

import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Printer, RotateCcw, Download, CheckCircle2, Heart } from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";
import { useEffect, useState } from "react";

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const { frameSlots, layout, maxPhotos, frameColor } = usePhotobooth();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Calculate photo height based on count for responsiveness
  const photoHeight = maxPhotos > 6 ? "h-[50px] md:h-[60px] lg:h-[70px]" : "h-[80px] md:h-[100px] lg:h-[120px]";

  return (
    <main className="min-h-screen lg:fixed lg:inset-0 bg-[#050505] text-white flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto lg:overflow-hidden font-sans">
      <div className="w-full h-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 animate-in zoom-in duration-500 overflow-visible lg:overflow-hidden py-10 lg:py-0">
        
        {/* LEFT: Finished Product */}
        <div className="w-full lg:flex-1 flex flex-col items-center justify-center h-fit lg:h-full max-h-none lg:max-h-[85vh] overflow-visible lg:overflow-hidden select-none">
          <div className="p-6 md:p-10 rounded-[2.5rem] shadow-[0_0_100px_rgba(255,255,255,0.05)] w-fit flex flex-col items-center overflow-hidden transform lg:-rotate-1 lg:hover:rotate-0 transition-transform duration-700 h-fit max-h-none lg:max-h-full" style={{ backgroundColor: frameColor }}>
            <div className={`font-black text-center text-[8px] md:text-[10px] tracking-[0.4em] border-b-2 pb-4 mb-4 uppercase italic opacity-30 shrink-0 w-full ${frameColor === "black" ? "text-white border-white/10" : "text-black border-black/5"}`}>Studio Print Edition</div>
            
            <div className={`
              ${layout === "GRID" ? "grid grid-cols-2 gap-2" : ""}
              ${layout === "STRIP" ? "flex flex-col gap-2" : ""}
              ${layout === "POLAROID" ? "relative w-[300px] md:w-[350px] h-[450px] md:h-[550px]" : ""}
              ${layout === "POSTER" ? "flex flex-col gap-6 py-4" : ""}
              ${layout === "WALL" ? "grid grid-cols-2 gap-x-4 gap-y-12 pt-8" : ""}
              overflow-y-auto scrollbar-hide shrink items-center
            `}>
              {frameSlots.filter(s => !!s).map((src, i) => {
                let customStyle: React.CSSProperties = {};
                const shadow = "shadow-[0_10px_30px_rgba(0,0,0,0.15)]";

                if (layout === "POLAROID") {
                  const rotations = [-4, 5, -2, 3, -6, 4];
                  const positions = [
                    { top: '0px', left: '35%' },
                    { top: '40px', left: '65%' },
                    { top: '160px', left: '40%' },
                    { top: '220px', left: '70%' },
                    { top: '340px', left: '30%' },
                    { top: '380px', left: '60%' },
                  ];
                  const pos = positions[i % positions.length];
                  customStyle = {
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    transform: `translateX(-50%) rotate(${rotations[i % rotations.length]}deg)`,
                    zIndex: i,
                    width: '140px',
                    height: '170px',
                    padding: '6px 6px 24px 6px',
                    backgroundColor: 'white',
                  };
                }
                if (layout === "POSTER") {
                  const rotations = [1, -1, 1.5, -1.5, 2];
                  customStyle = {
                    transform: `rotate(${rotations[i % rotations.length]}deg)`,
                    width: '180px',
                    padding: '8px 8px 32px 8px',
                    backgroundColor: 'white',
                  };
                }
                if (layout === "WALL") {
                  const rotations = [-2, 2, -1, 3, -3, 1];
                  customStyle = {
                    transform: `rotate(${rotations[i % rotations.length]}deg)`,
                    backgroundColor: 'white',
                    padding: '6px 6px 20px 6px',
                  };
                }

                return (
                  <div key={i} style={customStyle} className={`
                    ${layout === "POLAROID" || layout === "POSTER" || layout === "WALL" ? `relative border border-neutral-100 ${shadow}` : ""}
                  `}>
                    {layout === "WALL" && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-6 bg-neutral-800 rounded z-20 shadow-sm" />
                    )}
                    <div className={`relative shadow-inner overflow-hidden rounded-lg bg-neutral-100 
                      ${layout === "STRIP" ? `aspect-[3/2] ${photoHeight}` : ""}
                      ${layout === "GRID" ? "aspect-square w-24 md:w-32 lg:w-40" : ""}
                      ${layout === "POLAROID" || layout === "POSTER" || layout === "WALL" ? "aspect-square w-full" : ""}
                    `}>
                      <img src={src} className="w-full h-full object-cover" alt="Selected" />
                    </div>
                    {layout === "POSTER" && i % 2 === 0 && (
                      <div className="absolute top-1 right-1 text-red-500 scale-75 opacity-40">
                        <Heart size={14} fill="currentColor" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`text-[7px] text-center pt-6 opacity-20 font-mono tracking-widest uppercase shrink-0 w-full whitespace-nowrap overflow-hidden ${frameColor === "black" ? "text-white" : "text-black"}`}>
                ARCHIVE // {id?.toString().toUpperCase()}
            </div>
          </div>
        </div>

        {/* RIGHT: QR and Actions */}
        <div className="w-full lg:w-[450px] flex flex-col items-center text-center space-y-8 shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3 justify-center text-emerald-500">
              <CheckCircle2 size={32} />
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">SUCCESS!</h2>
            </div>
            <p className="text-neutral-500 text-[10px] uppercase tracking-[0.5em] font-black">Digital Vault Protected</p>
          </div>

          <div className="flex flex-col items-center space-y-8 w-full max-w-[320px]">
            <div className="bg-white p-6 rounded-[3.5rem] shadow-2xl ring-1 ring-white/10 overflow-hidden transform hover:scale-105 transition-transform duration-500">
              {origin && <QRCodeSVG value={`${origin}/view/${id}`} size={240} level="H" includeMargin />}
            </div>

            <div className="space-y-4 w-full px-4 md:px-0">
              <button 
                onClick={() => window.print()} 
                className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black uppercase flex items-center justify-center gap-3 hover:scale-105 transition-all text-sm shadow-xl italic"
              >
                <Printer size={18} /> Print Memories
              </button>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button className="bg-neutral-900 border border-white/5 py-4 rounded-[1.2rem] font-black uppercase text-[8px] tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all opacity-30">
                  <Download size={14} /> Download
                </button>
                <button 
                  onClick={() => router.push("/")} 
                  className="bg-indigo-600 py-4 rounded-[1.2rem] font-black uppercase text-[8px] tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all italic tracking-wider"
                >
                   <RotateCcw size={14} /> New Shot
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-h-none, .max-h-none * { visibility: visible !important; }
          .lg\\:-rotate-1 { transform: none !important; }
          .shadow-inner { box-shadow: none !important; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
