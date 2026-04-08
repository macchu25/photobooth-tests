"use client";
// Photobooth v5 - Scrollable & Print Composition View

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    setupCamera();
  }, []);

  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: any) { setCameraError(err.message); }
  }

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

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center overflow-x-hidden font-sans scroll-smooth">
      
      {/* Background stays sticky */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }} autoPlay playsInline muted className="w-full h-full object-cover blur-[120px] opacity-20 scale-110" />
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
            <h2 className="text-5xl md:text-7xl font-black mb-20 italic italic tracking-tight uppercase">Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
              {[4, 6, 8].map(n => (
                <button 
                  key={n} 
                  onClick={() => startPackage(n)} 
                  className="group relative bg-neutral-900 border border-white/5 p-16 rounded-[4rem] hover:border-white transition-all overflow-hidden"
                >
                  <div className="absolute -right-10 -bottom-10 text-white/5 text-[18rem] font-black group-hover:text-white/10 transition-colors pointer-events-none">{n}</div>
                  <div className="text-9xl font-black text-neutral-600 group-hover:text-white transition-colors relative z-10 leading-none">{n}</div>
                  <div className="text-sm uppercase font-black tracking-[0.3em] text-neutral-500 relative z-10 mt-6">Capture Studio</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep("IDLE")} className="mt-20 text-neutral-500 hover:text-white flex items-center gap-2 mx-auto uppercase text-xs tracking-widest transition-all"><RotateCcw size={16} /> Back</button>
          </div>
        )}

        {(step === "READY" || step === "COUNTDOWN" || step === "FLASH") && (
          <div className="w-full h-full max-w-5xl flex flex-col items-center animate-in fade-in duration-500 py-10">
            <div className="w-full flex justify-between items-center mb-8 px-4 font-black text-neutral-500 tracking-[0.2em] italic">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,1)]" />
                <span>PHASE {capturedPhotos.length + 1} // {maxPhotos}</span>
              </div>
              <button onClick={() => setStep("IDLE")} className="text-sm uppercase border border-white/10 px-6 py-2 rounded-full">Abort</button>
            </div>
            <div className="relative w-full aspect-[4/3] md:aspect-video bg-neutral-900 rounded-[4rem] overflow-hidden shadow-[0_60px_100px_-20px_rgba(0,0,0,1)] border-4 border-white/5">
              <video 
                autoPlay playsInline muted 
                className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
                ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {step === "READY" && (
                <div className="absolute bottom-12 inset-x-0 flex justify-center">
                  <button onClick={() => { setCountdown(3); setStep("COUNTDOWN"); }} className="group relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-white rounded-full scale-100 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_60px_rgba(255,255,255,0.4)]" />
                    <div className="absolute inset-2 bg-black/10 rounded-full border-4 border-black/20" />
                  </button>
                </div>
              )}
              {step === "COUNTDOWN" && <div className="absolute inset-0 flex items-center justify-center text-[25rem] font-black italic animate-in zoom-in duration-300 select-none">{countdown}</div>}
              {step === "FLASH" && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}
            </div>
          </div>
        )}

        {step === "DESIGN" && (
          <div className="w-full max-w-7xl flex flex-col md:flex-row gap-12 py-20 animate-in fade-in slide-in-from-right-12">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
              <div className="flex-1 flex flex-col bg-neutral-950/80 backdrop-blur-3xl rounded-[4rem] p-12 border border-white/5 h-fit min-h-[600px]">
                <div className="flex justify-between items-end mb-12">
                  <div>
                    <h2 className="text-5xl font-black italic mb-2">CUSTOMIZE</h2>
                    <p className="text-neutral-500 text-sm tracking-wide">Select your photos and arrange them in the strip.</p>
                  </div>
                  <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 scale-90 origin-right">
                    <button onClick={() => setLayout("GRID")} className={`px-6 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all ${layout === "GRID" ? "bg-white text-black" : "text-neutral-500"}`}><LayoutGrid size={14} /> Grid</button>
                    <button onClick={() => setLayout("STRIP")} className={`px-6 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all ${layout === "STRIP" ? "bg-white text-black" : "text-neutral-500"}`}><Columns size={14} /> Strip</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
                </div>
              </div>

              <div className="w-full md:w-[400px] flex flex-col shrink-0">
                <div className={`bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col relative transition-all duration-700`}>
                  <div className="text-black font-black text-center text-[11px] tracking-[0.5em] border-b-2 border-black/5 pb-8 mb-8 uppercase italic opacity-40 leading-none">The ProBooth Experience</div>
                  <div className={`grid gap-4 ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
                    {frameSlots.map((src, i) => (
                      <DroppableSlot key={i} id={`slot-${i}`} photoSrc={src} isStrip={layout === "STRIP"} onClear={() => {
                        const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                      }} />
                    ))}
                  </div>
                  <div className="text-black text-[9px] text-center pt-10 opacity-20 font-mono tracking-widest uppercase">Verified Studio Composition // {new Date().toLocaleDateString()}</div>
                </div>
                <button onClick={finalizeDesign} disabled={frameSlots.every(s => !s)} className="mt-10 w-full bg-indigo-600 disabled:opacity-20 py-10 rounded-[2.5rem] font-black text-3xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-4">PREVIEW <ChevronRight /></button>
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="w-48 aspect-[3/2] rounded-2xl overflow-hidden border-4 border-indigo-500 shadow-2xl scale-110 -rotate-2 ring-12 ring-indigo-500/10">
                    <img src={capturedPhotos.find(p => p.id === activeId)?.src} className="w-full h-full object-cover" />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {step === "SAVING" && (
          <div className="flex flex-col items-center gap-10 animate-pulse text-center py-40">
            <Loader2 className="w-32 h-32 animate-spin text-indigo-500" />
            <h2 className="text-6xl font-black italic tracking-widest uppercase">Developing</h2>
          </div>
        )}

        {step === "RESULT" && (
          <div className="text-center flex flex-col items-center p-6 w-full max-w-4xl animate-in zoom-in duration-700 py-10">
            <h2 className="text-6xl md:text-8xl font-black mb-16 italic tracking-tight uppercase">Your Print</h2>
            
            {/* The Unified Composition View */}
            <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-[0_0_150px_rgba(255,255,255,0.1)] w-full max-w-md transform rotate-1 transition-transform hover:rotate-0 duration-700 mb-20 group">
              <div className="text-black font-black text-center text-[12px] tracking-[0.6em] border-b-4 border-black/5 pb-10 mb-8 uppercase italic opacity-50">High Gloss Studio Print</div>
              <div className={`grid gap-5 ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
                {frameSlots.filter(s => !!s).map((src, i) => (
                  <div key={i} className={`relative ${layout === "STRIP" ? "aspect-[3/2]" : "aspect-square"} rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5`}>
                    <img src={src} className="w-full h-full object-cover" alt="Selected" />
                  </div>
                ))}
              </div>
              <div className="text-black text-[10px] text-center pt-10 opacity-30 font-mono tracking-widest uppercase leading-loose">
                Unique Session ID: {sessionId?.substring(0, 8).toUpperCase()}<br/>
                Captured at ProBooth Pro Studio
              </div>
              <div className="absolute -right-4 -top-4 bg-indigo-600 text-white p-4 rounded-3xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle2 /></div>
            </div>

            <div className="bg-white p-12 rounded-[5rem] shadow-2xl mb-12">
              <QRCodeSVG value={`https://be-ptb-production.up.railway.app/view/${sessionId}`} size={320} level="H" includeMargin />
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 mb-20">
              <button className="flex items-center gap-3 bg-neutral-900 border border-white/10 px-10 py-5 rounded-full font-black uppercase text-sm hover:bg-white hover:text-black transition-all"><Download /> Download HD</button>
              <button onClick={() => window.print()} className="flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-black uppercase text-sm hover:scale-105 transition-all"><Printer /> Print Photo</button>
            </div>

            <button onClick={() => setStep("IDLE")} className="text-neutral-600 hover:text-white transition-all font-black tracking-[0.5em] uppercase text-xl border-b-4 border-white/5 pb-4">Next Guest</button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-md, .max-w-md * { visibility: visible; }
          .max-w-md { 
            position: absolute; 
            left: 50%; 
            top: 0; 
            transform: translateX(-50%) rotate(0) !important; 
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
          }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
