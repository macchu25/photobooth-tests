"use client";
// Photobooth v3 - Ultra Responsive & Cinematic

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
  RotateCcw
} from "lucide-react";

type Step = "IDLE" | "PACKAGE_SELECT" | "READY" | "COUNTDOWN" | "FLASH" | "DESIGN" | "SAVING" | "RESULT";

// --- Drag & Drop Components ---

function DraggableThumb({ id, src }: { id: string, src: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`relative aspect-[3/2] bg-neutral-800 rounded-xl overflow-hidden border-2 border-white/5 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 scale-95" : "opacity-100 shadow-xl"}`}>
      <img src={src} className="w-full h-full object-cover" alt="Capture" />
    </div>
  );
}

function DroppableSlot({ id, photoSrc, onClear }: { id: string, photoSrc?: string, onClear: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`relative aspect-[3/2] rounded-2xl transition-all border-2 flex items-center justify-center overflow-hidden ${isOver ? "border-indigo-500 bg-indigo-500/20" : "border-white/10 bg-black/40"} ${photoSrc ? "shadow-2xl" : "border-dashed opacity-40"}`}>
      {photoSrc ? (
        <>
          <img src={photoSrc} className="w-full h-full object-cover" alt="Framed" />
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors">
            <X size={14} />
          </button>
        </>
      ) : (
        <Camera size={24} className="opacity-10" />
      )}
    </div>
  );
}

export default function Photobooth() {
  const [step, setStep] = useState<Step>("IDLE");
  const [countdown, setCountdown] = useState(3);
  const [capturedPhotos, setCapturedPhotos] = useState<{id: string, src: string}[]>([]);
  const [frameSlots, setFrameSlots] = useState<(string | undefined)[]>([undefined, undefined, undefined, undefined]);
  const [maxPhotos, setMaxPhotos] = useState<number>(4);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setupCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function setupCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (err: any) {
      console.error(err);
      setCameraError(err.name === "NotAllowedError" ? "Camera permission denied." : err.message);
    }
  }

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
    <main className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      {/* Background Live Feed (Blurry) */}
      <div className="absolute inset-0 z-0 opacity-40">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover blur-2xl scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 md:p-10">
        
        {step === "IDLE" && (
          <div className="text-center animate-in fade-in zoom-in duration-1000 flex flex-col items-center">
            <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter italic mb-4 drop-shadow-2xl">PROBOOTH</h1>
            <p className="text-lg text-neutral-400 tracking-[0.5em] uppercase mb-12">Cinematic Studio Experience</p>
            <button 
              onClick={() => setStep("PACKAGE_SELECT")} 
              className="bg-white text-black px-12 py-5 rounded-full font-black text-2xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center gap-3"
            >
              START SESSION <ChevronRight />
            </button>
          </div>
        )}

        {step === "PACKAGE_SELECT" && (
          <div className="text-center w-full max-w-5xl animate-in fade-in slide-in-from-bottom-8">
            <h2 className="text-4xl md:text-6xl font-black mb-12 italic">CHOOSE YOUR PACKAGE</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[4, 6, 8].map(n => (
                <button 
                  key={n} 
                  onClick={() => { setMaxPhotos(n); setCapturedPhotos([]); setStep("READY"); }} 
                  className="group bg-black/60 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] hover:border-white transition-all"
                >
                  <div className="text-7xl font-black group-hover:text-indigo-400 mb-2">{n}</div>
                  <div className="text-sm uppercase font-bold tracking-widest text-neutral-500">Captures</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep("IDLE")} className="mt-12 text-neutral-500 hover:text-white uppercase text-xs tracking-widest flex items-center gap-2 mx-auto"><RotateCcw size={14} /> Back</button>
          </div>
        )}

        {(step === "READY" || step === "COUNTDOWN" || step === "FLASH") && (
          <div className="w-full h-full max-w-4xl flex flex-col animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-4 px-4 font-black italic text-neutral-500 tracking-widest">
              <span>LIVE VIEW // {capturedPhotos.length + 1} / {maxPhotos}</span>
              <button onClick={() => setStep("IDLE")} className="text-sm underline">EXIT</button>
            </div>
            <div className="relative flex-1 bg-neutral-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/5">
              <video 
                src="" /* The background one is enough if we just use a second view */
                autoPlay playsInline muted 
                className="w-full h-full object-cover"
                ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {cameraError && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center">
                  <AlertTriangle className="text-yellow-500 mb-4" size={48} />
                  <p className="text-xl font-bold mb-4">{cameraError}</p>
                  <button onClick={setupCamera} className="bg-white text-black px-8 py-3 rounded-full font-bold">RETRY CAMERA</button>
                </div>
              )}

              {step === "READY" && !cameraError && (
                <div className="absolute bottom-10 inset-x-0 flex justify-center">
                  <button onClick={() => { setCountdown(3); setStep("COUNTDOWN"); }} className="w-24 h-24 bg-white rounded-full border-[8px] border-black/30 shadow-2xl hover:scale-110 active:scale-90 transition-all" />
                </div>
              )}
              {step === "COUNTDOWN" && <div className="absolute inset-0 flex items-center justify-center text-[18rem] md:text-[25rem] font-black italic drop-shadow-2xl">{countdown}</div>}
              {step === "FLASH" && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}
            </div>
          </div>
        )}

        {step === "DESIGN" && (
          <div className="w-full h-full max-w-6xl flex flex-col md:flex-row gap-8 overflow-hidden animate-in fade-in slide-in-from-right-8 p-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
              <div className="flex-1 flex flex-col min-h-0 bg-black/60 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/5">
                <h2 className="text-3xl font-black mb-1 italic">CUSTOMIZE</h2>
                <p className="text-neutral-500 text-sm mb-8">Drag shots into the film frame on the right.</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 scrollbar-hide">
                  {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
                </div>
              </div>
              <div className="w-full md:w-[320px] lg:w-[380px] flex flex-col shrink-0">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl space-y-3 mb-6">
                  <div className="text-black font-black text-center text-[9px] tracking-[0.5em] border-b border-black/5 pb-4 mb-2 uppercase opacity-40 italic">Film Strip Editor</div>
                  <div className="space-y-3">
                    {frameSlots.map((src, i) => (
                      <DroppableSlot key={i} id={`slot-${i}`} photoSrc={src} onClear={() => {
                        const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                      }} />
                    ))}
                  </div>
                </div>
                <button onClick={finalizeDesign} disabled={frameSlots.every(s => !s)} className="w-full bg-indigo-600 disabled:opacity-30 py-6 rounded-[1.5rem] font-black text-2xl hover:bg-indigo-500 transition-all shadow-xl active:scale-95">GO TO GALLERY</button>
              </div>
              <DragOverlay>
                {activeId ? (
                  <div className="w-40 aspect-square rounded-xl overflow-hidden border-4 border-indigo-500 shadow-2xl scale-110 rotate-3">
                    <img src={capturedPhotos.find(p => p.id === activeId)?.src} className="w-full h-full object-cover" alt="Dragging" />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {step === "SAVING" && (
          <div className="flex flex-col items-center gap-8 animate-pulse text-center">
            <Loader2 className="w-20 h-20 animate-spin" />
            <h2 className="text-4xl font-black italic tracking-widest">SAVING MEMORIES...</h2>
          </div>
        )}

        {step === "RESULT" && (
          <div className="text-center flex flex-col items-center p-6 w-full max-w-5xl animate-in zoom-in duration-700">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {frameSlots.filter(s => !!s).map((src, i) => (
                <div key={i} onClick={() => setSelectedPhoto(src!)} className="relative aspect-[3/4] bg-neutral-900 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl cursor-zoom-in hover:scale-105 transition-all">
                  <img src={src} className="w-full h-full object-cover" alt="Final" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"><Maximize2 /></div>
                </div>
              ))}
            </div>
            <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl mb-10 overflow-hidden">
              <QRCodeSVG value={`https://be-ptb-production.up.railway.app/view/${sessionId}`} size={240} level="H" includeMargin />
            </div>
            <div className="flex items-center gap-3 text-emerald-400 mb-6 bg-emerald-400/10 px-6 py-2 rounded-full border border-emerald-400/20 text-sm font-black italic uppercase">Stored in MongoDB Atlas</div>
            <h2 className="text-5xl font-black mb-16 italic">SCAN TO DOWNLOAD</h2>
            <button onClick={() => setStep("IDLE")} className="text-neutral-500 hover:text-white transition-all font-black tracking-[0.4em] uppercase text-sm border-b border-white/10 pb-2">Finish Session</button>
          </div>
        )}
      </div>

      {/* Modal View */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/98 p-10 flex items-center justify-center animate-in fade-in" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl border-2 border-white/10" alt="Large View" />
          <button className="absolute top-8 right-8 text-white/40"><X size={48} /></button>
        </div>
      )}
    </main>
  );
}
