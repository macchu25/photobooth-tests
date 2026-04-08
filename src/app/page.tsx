"use client";
// Photobooth v6 - Final Stable Version

import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  useDroppable,
  DragStartEvent,
  DragOverlay
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { 
  GripVertical, 
  Loader2, 
  CheckCircle2, 
  X,
  Maximize2,
  Camera,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  LayoutGrid,
  Columns,
  Download,
  Printer
} from "lucide-react";

type Step = "IDLE" | "PACKAGE_SELECT" | "READY" | "COUNTDOWN" | "FLASH" | "DESIGN" | "SAVING" | "RESULT";
type Layout = "GRID" | "STRIP";

function DraggableThumb({ id, src }: { id: string, src: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`relative aspect-[3/2] bg-neutral-800 rounded-xl overflow-hidden border-2 border-white/5 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 scale-95" : "opacity-100 shadow-xl"}`}>
      <img src={src} className="w-full h-full object-cover" alt="Capture" />
    </div>
  );
}

function DroppableSlot({ id, photoSrc, onClear, isStrip }: { id: string, photoSrc?: string, onClear?: () => void, isStrip?: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`relative ${isStrip ? "aspect-[3/2]" : "aspect-square"} rounded-xl transition-all border-2 flex items-center justify-center overflow-hidden ${isOver ? "border-indigo-500 bg-indigo-500/10" : "border-white/5 bg-black/20"} ${photoSrc ? "shadow-lg" : "border-dashed opacity-20"}`}>
      {photoSrc ? (
        <>
          <img src={photoSrc} className="w-full h-full object-cover" alt="Framed" />
          {onClear && (
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors">
              <X size={10} />
            </button>
          )}
        </>
      ) : (
        <Camera size={16} className="opacity-10 text-black" />
      )}
    </div>
  );
}

export default function Photobooth() {
  const [step, setStep] = useState<Step>("IDLE");
  const [layout, setLayout] = useState<Layout>("GRID");
  const [countdown, setCountdown] = useState(3);
  const [capturedPhotos, setCapturedPhotos] = useState<{id: string, src: string}[]>([]);
  const [frameSlots, setFrameSlots] = useState<(string | undefined)[]>([]);
  const [maxPhotos, setMaxPhotos] = useState<number>(4);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const setupCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(e => console.error(e));
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      setCameraError(err.name === "NotAllowedError" ? "Quyền truy cập Camera bị từ chối." : err.message);
    }
  }, []);

  useEffect(() => {
    setupCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [setupCamera]);

  const startPackage = (n: number) => {
    setMaxPhotos(n);
    setCapturedPhotos([]);
    setFrameSlots(new Array(n).fill(undefined));
    setStep("READY");
  };

  useEffect(() => {
    if (step === "COUNTDOWN") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else { setStep("FLASH"); }
    } else if (step === "FLASH") {
      const flashTimer = setTimeout(() => {
        let src = "";
        if (videoRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            src = canvasRef.current.toDataURL("image/jpeg", 0.85);
          }
        }
        const updated = [...capturedPhotos, { id: `p-${Date.now()}`, src }];
        setCapturedPhotos(updated);
        
        if (updated.length < maxPhotos) {
          setStep("READY");
          setTimeout(() => { setCountdown(3); setStep("COUNTDOWN"); }, 1000);
        } else { setStep("DESIGN"); }
      }, 300);
      return () => clearTimeout(flashTimer);
    }
  }, [step, countdown, capturedPhotos, maxPhotos]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over?.id.toString().startsWith("slot-")) {
      const idx = parseInt(over.id.toString().split("-")[1]);
      const photo = capturedPhotos.find(p => p.id === active.id);
      if (photo) {
        const next = [...frameSlots];
        next[idx] = photo.src;
        setFrameSlots(next);
      }
    }
  };

  const finalizeDesign = async () => {
    const final = frameSlots.filter(s => !!s) as string[];
    if (final.length === 0) return;
    setStep("SAVING");
    try {
      const r = await fetch("https://be-ptb-production.up.railway.app/api/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: final })
      });
      const d = await r.json();
      setSessionId(d.id);
    } catch { setSessionId("err-" + Date.now()); }
    setStep("RESULT");
  };

  const showVideoInMainContent = ["READY", "COUNTDOWN", "FLASH"].includes(step);

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center overflow-x-hidden font-sans scroll-smooth">
      
      {/* PERSISTENT VIDEO ELEMENT - Never unmounted */}
      <div className={`fixed inset-0 z-0 overflow-hidden transition-all duration-1000 ${showVideoInMainContent ? "pointer-events-none opacity-0" : "opacity-30"}`}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover blur-[80px] scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
      </div>

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
        
        {step === "IDLE" && (
          <div className="text-center animate-in fade-in zoom-in duration-1000 py-20">
            <h1 className="text-8xl md:text-[14rem] font-black tracking-tighter italic mb-4 drop-shadow-[0_20px_60px_rgba(255,255,255,0.15)]">PROBOOTH</h1>
            <p className="text-xl text-neutral-500 tracking-[0.6em] uppercase mb-20 font-light">Cinematic Capture Engine</p>
            <button 
              onClick={() => setStep("PACKAGE_SELECT")} 
              className="bg-white text-black px-24 py-10 rounded-full font-black text-4xl hover:scale-110 hover:shadow-[0_0_80px_rgba(255,255,255,0.3)] active:scale-95 transition-all duration-500 shadow-2xl"
            >
              START
            </button>
          </div>
        )}

        {step === "PACKAGE_SELECT" && (
          <div className="text-center w-full max-w-6xl animate-in fade-in slide-in-from-bottom-12 py-10">
            <h2 className="text-5xl md:text-6xl font-black mb-16 italic uppercase">Select Package</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
              {[4, 6, 8].map(n => (
                <button key={n} onClick={() => startPackage(n)} className="group relative bg-neutral-900 border border-white/5 p-16 rounded-[4rem] hover:border-white transition-all overflow-hidden text-center">
                  <div className="text-9xl font-black text-neutral-600 group-hover:text-white transition-colors leading-none">{n}</div>
                  <div className="text-xs uppercase font-black tracking-[0.4em] text-neutral-500 mt-6 mt-4">Captures</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep("IDLE")} className="mt-16 text-neutral-500 hover:text-white flex items-center gap-2 mx-auto uppercase text-xs tracking-widest"><RotateCcw size={16} /> Cancel</button>
          </div>
        )}

        {showVideoInMainContent && (
          <div className="w-full h-full max-w-5xl flex flex-col items-center animate-in fade-in duration-500 py-10 h-[80vh]">
             <div className="w-full flex justify-between items-center mb-6 px-4 font-black text-neutral-500 tracking-[0.2em] italic uppercase">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,1)]" />
                <span>PHASE {capturedPhotos.length + 1} // {maxPhotos}</span>
              </div>
              <button onClick={() => setStep("IDLE")} className="text-xs border border-white/10 px-6 py-2 rounded-full">Exit</button>
            </div>
            
            <div className="relative w-full flex-1 bg-neutral-900 rounded-[4rem] overflow-hidden shadow-2xl border-4 border-white/5">
              {/* Actual Video View - using a separate element but pointing to same stream is safer when we need it un-blurred */}
              <video 
                ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
                autoPlay playsInline muted 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {cameraError && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center">
                  <AlertTriangle className="text-yellow-500 mb-4" size={48} />
                  <p className="text-xl font-bold mb-4">{cameraError}</p>
                  <button onClick={setupCamera} className="bg-white text-black px-8 py-3 rounded-full font-bold">RETRY</button>
                </div>
              )}

              {step === "READY" && !cameraError && (
                <div className="absolute bottom-10 inset-x-0 flex justify-center">
                  <button onClick={() => { setCountdown(3); setStep("COUNTDOWN"); }} className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-full border-4 border-white shadow-2xl hover:scale-110 active:scale-95 transition-all" />
                </div>
              )}
              {step === "COUNTDOWN" && <div className="absolute inset-0 flex items-center justify-center text-[20rem] font-black italic">{countdown}</div>}
              {step === "FLASH" && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}
            </div>
          </div>
        )}

        {step === "DESIGN" && (
          <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-12 py-10 animate-in fade-in slide-in-from-right-12">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
              <div className="flex-1 flex flex-col bg-neutral-950/80 backdrop-blur-3xl rounded-[3.5rem] p-10 border border-white/5 h-fit">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-4xl font-black italic uppercase">Gallery</h2>
                  <div className="flex bg-black p-1 rounded-2xl border border-white/10">
                    <button onClick={() => setLayout("GRID")} className={`px-5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${layout === "GRID" ? "bg-white text-black" : "text-neutral-500"}`}><LayoutGrid size={12} /> Grid</button>
                    <button onClick={() => setLayout("STRIP")} className={`px-5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${layout === "STRIP" ? "bg-white text-black" : "text-neutral-500"}`}><Columns size={12} /> Strip</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
                </div>
              </div>

              <div className="w-full lg:w-[400px] flex flex-col">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl">
                  <div className="text-black font-black text-center text-[10px] tracking-[0.4em] border-b border-black/10 pb-6 mb-6 uppercase italic opacity-30 leading-none">ProBooth Studio Layout</div>
                  <div className={`grid gap-4 ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
                    {frameSlots.map((src, i) => (
                      <DroppableSlot key={i} id={`slot-${i}`} photoSrc={src} isStrip={layout === "STRIP"} onClear={() => {
                        const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                      }} />
                    ))}
                  </div>
                </div>
                <button onClick={finalizeDesign} disabled={frameSlots.every(s => !s)} className="mt-8 bg-indigo-600 py-8 rounded-[2rem] font-black text-2xl hover:bg-indigo-500 transition-all shadow-xl active:scale-95">GO TO PREVIEW</button>
              </div>

              <DragOverlay>
                {activeId ? (
                   <div className="w-40 aspect-[3/2] rounded-xl overflow-hidden border-4 border-indigo-500 shadow-2xl scale-110">
                    <img src={capturedPhotos.find(p => p.id === activeId)?.src} className="w-full h-full object-cover" />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {step === "SAVING" && (
          <div className="flex flex-col items-center gap-6 py-40">
            <Loader2 className="w-20 h-20 animate-spin text-indigo-500" />
            <h2 className="text-3xl font-black italic tracking-widest uppercase">Processing...</h2>
          </div>
        )}

        {step === "RESULT" && (
          <div className="text-center flex flex-col items-center p-4 w-full max-w-4xl animate-in zoom-in py-10">
             {/* Unified Print View */}
             <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md transform rotate-1 mb-20 group">
              <div className="text-black font-black text-center text-[10px] tracking-[0.5em] border-b-2 border-black/5 pb-8 mb-6 uppercase italic opacity-40">Official Studio Print</div>
              <div className={`grid gap-4 ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
                {frameSlots.filter(s => !!s).map((src, i) => (
                  <div key={i} className={`relative ${layout === "STRIP" ? "aspect-[3/2]" : "aspect-square"} rounded-xl overflow-hidden shadow-inner`}>
                    <img src={src} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-black text-[8px] text-center pt-8 opacity-20 font-mono tracking-widest uppercase">Session ID: {sessionId?.substring(0, 10)}</div>
            </div>

            <div className="bg-white p-10 rounded-[4rem] shadow-2xl mb-12">
              <QRCodeSVG value={`${window.location.origin}/view/${sessionId}`} size={280} level="H" includeMargin />
            </div>
            <div className="flex gap-4 mb-20">
               <button onClick={() => window.print()} className="bg-white text-black px-10 py-5 rounded-full font-black text-sm hover:scale-105 transition-all flex items-center gap-2"><Printer size={18} /> PRINT NOW</button>
            </div>
            <button onClick={() => setStep("IDLE")} className="text-neutral-600 hover:text-white uppercase font-black tracking-widest text-lg transition-all border-b border-white/10 pb-2">Start Again</button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-md, .max-w-md * { visibility: visible; }
          .max-w-md { position: fixed; left: 0; top: 0; width: 100%; transform: none !important; box-shadow: none !important; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
