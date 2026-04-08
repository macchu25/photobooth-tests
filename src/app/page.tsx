"use client";
// Photobooth v4 - Dynamic Layouts (Strip & Grid)

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
  Columns
} from "lucide-react";

type Step = "IDLE" | "PACKAGE_SELECT" | "READY" | "COUNTDOWN" | "FLASH" | "DESIGN" | "SAVING" | "RESULT";
type Layout = "GRID" | "STRIP";

// --- Components ---

function DraggableThumb({ id, src }: { id: string, src: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`relative aspect-[3/2] bg-neutral-800 rounded-xl overflow-hidden border-2 border-white/5 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 scale-95" : "opacity-100 shadow-xl"}`}>
      <img src={src} className="w-full h-full object-cover" alt="Capture" />
    </div>
  );
}

function DroppableSlot({ id, photoSrc, onClear, isStrip }: { id: string, photoSrc?: string, onClear: () => void, isStrip?: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`relative ${isStrip ? "aspect-[3/2]" : "aspect-square"} rounded-xl transition-all border-2 flex items-center justify-center overflow-hidden ${isOver ? "border-indigo-500 bg-indigo-500/20" : "border-white/10 bg-black/40"} ${photoSrc ? "shadow-2xl" : "border-dashed opacity-40"}`}>
      {photoSrc ? (
        <>
          <img src={photoSrc} className="w-full h-full object-cover" alt="Framed" />
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors">
            <X size={12} />
          </button>
        </>
      ) : (
        <Camera size={20} className="opacity-10" />
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
    <main className="fixed inset-0 bg-[#0a0a0a] text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }} autoPlay playsInline muted className="w-full h-full object-cover blur-[100px] opacity-30 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 md:p-12">
        
        {step === "IDLE" && (
          <div className="text-center animate-in fade-in zoom-in duration-1000">
            <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter italic mb-4 drop-shadow-[0_20px_50px_rgba(255,255,255,0.1)]">PROBOOTH</h1>
            <p className="text-xl text-neutral-500 tracking-[0.4em] uppercase mb-16">The Ultimate Photobooth Engine</p>
            <button 
              onClick={() => setStep("PACKAGE_SELECT")} 
              className="bg-white text-black px-24 py-10 rounded-full font-black text-4xl hover:scale-110 hover:shadow-white/20 hover:shadow-2xl active:scale-95 transition-all shadow-xl"
            >
              START
            </button>
          </div>
        )}

        {step === "PACKAGE_SELECT" && (
          <div className="text-center w-full max-w-5xl animate-in fade-in slide-in-from-bottom-12">
            <h2 className="text-6xl font-black mb-16 italic tracking-tight uppercase">Select Session</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[4, 6, 8].map(n => (
                <button 
                  key={n} 
                  onClick={() => startPackage(n)} 
                  className="group relative bg-neutral-900/50 backdrop-blur-2xl border border-white/5 p-16 rounded-[4rem] hover:border-white transition-all overflow-hidden"
                >
                  <div className="absolute -right-10 -bottom-10 text-white/5 text-[15rem] font-black group-hover:text-white/10 transition-colors">{n}</div>
                  <div className="text-9xl font-black text-neutral-600 group-hover:text-white transition-colors relative z-10">{n}</div>
                  <div className="text-sm uppercase font-black tracking-widest text-neutral-500 relative z-10">Photos Included</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep("IDLE")} className="mt-16 text-neutral-500 hover:text-white flex items-center gap-2 mx-auto uppercase text-xs tracking-widest transition-all"><RotateCcw size={16} /> Back to Welcome</button>
          </div>
        )}

        {(step === "READY" || step === "COUNTDOWN" || step === "FLASH") && (
          <div className="w-full h-full max-w-5xl flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,1)]" />
                <h3 className="text-2xl font-black italic">PHASE {capturedPhotos.length + 1} OF {maxPhotos}</h3>
              </div>
              <button onClick={() => setStep("IDLE")} className="text-neutral-500 hover:text-white uppercase font-black text-xs tracking-[0.3em]">Cancel</button>
            </div>
            <div className="relative flex-1 bg-neutral-900 rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] border-4 border-white/5">
              <video 
                autoPlay playsInline muted 
                className="w-full h-full object-cover grayscale-[0.3] contrast-[1.1]"
                ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {step === "READY" && (
                <div className="absolute bottom-12 inset-x-0 flex justify-center">
                  <button onClick={() => { setCountdown(3); setStep("COUNTDOWN"); }} className="group relative w-28 h-28 flex items-center justify-center">
                    <div className="absolute inset-0 bg-white rounded-full scale-100 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-2 bg-black/10 rounded-full border-4 border-black/20" />
                  </button>
                </div>
              )}
              {step === "COUNTDOWN" && <div className="absolute inset-0 flex items-center justify-center text-[22rem] font-black italic animate-in zoom-in duration-300 pointer-events-none">{countdown}</div>}
              {step === "FLASH" && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}
            </div>
          </div>
        )}

        {step === "DESIGN" && (
          <div className="w-full h-full flex flex-col md:flex-row gap-10 overflow-hidden animate-in fade-in slide-in-from-right-12">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
              {/* Pool of photos */}
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-900/60 backdrop-blur-3xl rounded-[3.5rem] p-10 border border-white/5">
                <div className="flex justify-between items-end mb-10">
                  <div>
                    <h2 className="text-4xl font-black italic mb-2 tracking-tight">SHOT GALLERY</h2>
                    <p className="text-neutral-500 text-sm tracking-wide">Drag your favorite moments into the frame.</p>
                  </div>
                  {/* Layout Toggle */}
                  <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    <button onClick={() => setLayout("GRID")} className={`px-6 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all ${layout === "GRID" ? "bg-white text-black" : "text-neutral-500"}`}><LayoutGrid size={14} /> Grid</button>
                    <button onClick={() => setLayout("STRIP")} className={`px-6 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all ${layout === "STRIP" ? "bg-white text-black" : "text-neutral-500"}`}><Columns size={14} /> Strip</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 scrollbar-hide">
                  {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
                </div>
              </div>

              {/* Composition */}
              <div className="w-full md:w-[350px] lg:w-[420px] flex flex-col shrink-0">
                <div className={`bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden transition-all duration-700 ${layout === "STRIP" ? "max-h-full overflow-y-auto scrollbar-hide" : "aspect-[3/4]"}`}>
                  <div className="text-black font-black text-center text-[10px] tracking-[0.5em] border-b-2 border-black/5 pb-8 mb-6 uppercase italic opacity-30">The ProBooth Series</div>
                  
                  <div className={`grid gap-4 ${layout === "GRID" ? (maxPhotos <= 4 ? "grid-cols-2" : "grid-cols-2") : "grid-cols-1"}`}>
                    {frameSlots.map((src, i) => (
                      <DroppableSlot key={i} id={`slot-${i}`} photoSrc={src} isStrip={layout === "STRIP"} onClear={() => {
                        const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                      }} />
                    ))}
                  </div>

                  <div className="text-black text-[9px] text-center pt-8 opacity-20 font-mono tracking-widest uppercase">Certified Studio Capture // {new Date().getFullYear()}</div>
                </div>
                <button 
                  onClick={finalizeDesign} 
                  disabled={frameSlots.every(s => !s)} 
                  className="mt-8 w-full bg-indigo-600 disabled:opacity-20 py-8 rounded-[2rem] font-black text-2xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  FINALIZE <ChevronRight />
                </button>
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="w-44 aspect-[3/2] rounded-2xl overflow-hidden border-4 border-indigo-500 shadow-2xl scale-110 rotate-2 ring-12 ring-indigo-500/10">
                    <img src={capturedPhotos.find(p => p.id === activeId)?.src} className="w-full h-full object-cover" alt="Dragging" />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {step === "SAVING" && (
          <div className="flex flex-col items-center gap-8 animate-in fade-in">
            <div className="relative">
              <Loader2 className="w-24 h-24 animate-spin text-white opacity-20" />
              <Camera className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={32} />
            </div>
            <h2 className="text-4xl font-black italic tracking-widest">SAVING MEMORIES</h2>
          </div>
        )}

        {step === "RESULT" && (
          <div className="text-center flex flex-col items-center p-6 w-full max-w-5xl animate-in zoom-in duration-700">
            <div className={`grid gap-4 mb-16 ${layout === "GRID" ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-4"}`}>
              {frameSlots.filter(s => !!s).map((src, i) => (
                <div key={i} onClick={() => setSelectedPhoto(src!)} className="relative aspect-[3/4] bg-neutral-900 rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl cursor-zoom-in hover:scale-105 transition-all duration-300">
                  <img src={src} className="w-full h-full object-cover" alt="Final" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity"><Maximize2 /></div>
                </div>
              ))}
            </div>
            <div className="bg-white p-10 rounded-[4rem] shadow-2xl mb-10 ring-8 ring-white/10">
              <QRCodeSVG value={`https://be-ptb-production.up.railway.app/view/${sessionId}`} size={280} level="H" includeMargin />
            </div>
            <div className="flex items-center gap-3 text-emerald-400 mb-6 bg-emerald-400/5 px-8 py-3 rounded-full border border-emerald-400/10 text-xs font-black uppercase tracking-widest italic">Digital Vault Secured</div>
            <h2 className="text-6xl font-black mb-16 italic tracking-tight">SCAN TO DOWNLOAD</h2>
            <button onClick={() => setStep("IDLE")} className="text-neutral-500 hover:text-white transition-all font-black tracking-[0.5em] uppercase text-sm border-b-2 border-white/5 pb-2">Start Again</button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl p-12 flex items-center justify-center animate-in fade-in duration-500" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center pointer-events-none">
            <img src={selectedPhoto} className="max-w-full max-h-full object-contain rounded-[3rem] shadow-[0_0_100px_rgba(255,255,255,0.1)] border-2 border-white/10" alt="Fullscreen" />
            <button className="absolute top-0 right-0 p-10 text-white/20 pointer-events-auto hover:text-white transition-colors"><X size={64} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
