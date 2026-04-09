"use client";

import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Printer, RotateCcw, Download, CheckCircle2, Heart } from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";
import { useEffect, useState, useRef } from "react";
import { CompositionFrame } from "@/components/CompositionFrame";
import { toPng } from "html-to-image";

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const { frameSlots, layout, maxPhotos, frameColor } = usePhotobooth();
  const [origin, setOrigin] = useState("");
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!frameRef.current) return;
    try {
      // Scale is reset to 1 during capture to get full resolution
      const dataUrl = await toPng(frameRef.current, { 
        quality: 1,
        pixelRatio: 2, // Higher resolution
        backgroundColor: "transparent"
      });
      const link = document.createElement('a');
      link.download = `photobooth-${id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    
    const handleResize = () => {
      const vh = window.innerHeight * 0.5; // Thu nhỏ xuống mức 50%
      // Estimate content height based on layout to fit screen
      let contentHeight = 600; 
      if (layout === "POLAROID") contentHeight = 810;
      if (layout === "POSTER") contentHeight = 700;
      if (layout === "STRIP") contentHeight = 720;
      if (layout === "STRING") contentHeight = 500; 

      let s = 1;
      if (contentHeight > vh) s = vh / contentHeight;

      if (layout === "STRING") {
        const vw = window.innerWidth * 0.9;
        const contentWidth = 180 * maxPhotos + 200;
        if (contentWidth > vw) {
          s = Math.min(s, vw / contentWidth);
        }
      }

      setScale(s);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [layout, maxPhotos]);

  // Calculate photo height based on count for responsiveness
  const photoHeight = maxPhotos > 6 ? "h-[50px] md:h-[60px] lg:h-[70px]" : "h-[80px] md:h-[100px] lg:h-[120px]";

  return (
    <main className="min-h-screen lg:fixed lg:inset-0 bg-[#050505] text-white flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto lg:overflow-hidden font-sans">
      <div className="w-full h-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 animate-in zoom-in duration-500 overflow-visible lg:overflow-hidden py-10 lg:py-0">
        
        {/* LEFT: Finished Product */}
        <div className="w-full lg:flex-1 flex flex-col items-center justify-center h-fit lg:h-full select-none overflow-hidden">
          <div 
            ref={frameRef}
            style={{ 
              transform: `scale(${scale})`,
              transformOrigin: "center center"
            }} 
            className="w-fit transition-all duration-700 h-fit"
          >
            <CompositionFrame 
              layout={layout} 
              frameSlots={frameSlots} 
              frameColor={frameColor} 
              maxPhotos={maxPhotos} 
              isResult={true}
              footerLabel={`ARCHIVE // ${id?.toString().toUpperCase()}`}
            />
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
                <button 
                  onClick={handleDownload}
                  className="bg-neutral-900 border border-white/5 py-4 rounded-[1.2rem] font-black uppercase text-[8px] tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all cursor-pointer"
                >
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
