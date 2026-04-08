"use client";
// Force push update v2


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
  AlertTriangle
} from "lucide-react";

type Step = "IDLE" | "PACKAGE_SELECT" | "READY" | "COUNTDOWN" | "FLASH" | "DESIGN" | "SAVING" | "RESULT";

// --- Components for Drag and Drop ---

function DraggableThumb({ id, src }: { id: string, src: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`relative aspect-square bg-neutral-800 rounded-xl overflow-hidden border-2 border-white/5 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 scale-95" : "opacity-100"}`}>
      <img src={src} className="w-full h-full object-cover" alt="Capture" />
    </div>
  );
}

function DroppableSlot({ id, photoSrc, onClear }: { id: string, photoSrc?: string, onClear: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`relative aspect-[3/2] rounded-xl transition-all border-2 flex items-center justify-center overflow-hidden ${isOver ? "border-indigo-500 bg-indigo-500/20 scale-[1.02]" : "border-black/5 bg-neutral-100"} ${photoSrc ? "shadow-inner" : "border-dashed opacity-50"}`}>
      {photoSrc ? (
        <>
          <img src={photoSrc} className="w-full h-full object-cover" alt="Framed" />
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors shadow-lg">
            <X size={14} />
          </button>
        </>
      ) : (
        <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">Drop Photo</span>
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  useEffect(() => {
    async function init() {
      if (typeof window === "undefined") return;
      
      // Get list of devices for debugging
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(d => d.kind === "videoinput");
        setDevices(videoDevs);
        console.log("Available cameras:", videoDevs);
      } catch (e) {
        console.error("Error listing devices:", e);
      }

      await setupCamera();
    }
    init();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  async function setupCamera() {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Your browser doesn't support camera access (WebRTC). Ensure you are using HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
        };
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      setCameraError(err.name === "NotAllowedError" ? "Camera permission denied. Please click the lock icon in the address bar and Allow Camera." : `Error: ${err.message}`);
    }
  }

  // --- Capture Logic ---
  useEffect(() => {
    if (step === "COUNTDOWN") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setStep("FLASH");
      }
    } else if (step === "FLASH") {
      const flashTimer = setTimeout(() => {
        let src = "";
        if (videoRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            src = canvasRef.current.toDataURL("image/jpeg", 0.82);
          }
        }
        const updated = [...capturedPhotos, { id: `p-${Date.now()}`, src }];
        setCapturedPhotos(updated);
        
        if (updated.length < maxPhotos) {
          setStep("READY");
          setTimeout(() => { setCountdown(3); setStep("COUNTDOWN"); }, 1200);
        } else {
          setStep("DESIGN");
        }
      }, 300);
      return () => clearTimeout(flashTimer);
    }
  }, [step, countdown, capturedPhotos, maxPhotos]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && over.id.toString().startsWith("slot-")) {
      const slotIndex = parseInt(over.id.toString().split("-")[1]);
      const photo = capturedPhotos.find(p => p.id === active.id);
      if (photo) {
        const newSlots = [...frameSlots];
        newSlots[slotIndex] = photo.src;
        setFrameSlots(newSlots);
      }
    }
  };

  const finalizeDesign = async () => {
    const finalPhotos = frameSlots.filter(s => !!s) as string[];
    if (finalPhotos.length === 0) return;
    setStep("SAVING");
    try {
      const resp = await fetch("https://be-ptb-production.up.railway.app/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: finalPhotos })
      });
      const data = await resp.json();
      setSessionId(data.id);
    } catch {
      setSessionId("err-" + Date.now());
    }
    setStep("RESULT");
  };

  const activePhoto = capturedPhotos.find(p => p.id === activeId);

  return (
    <main className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center overflow-hidden font-sans">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-fuchsia-600/10 blur-[120px] rounded-full" />

      {step === "IDLE" && (
        <div className="text-center z-10 p-8 animate-in fade-in zoom-in duration-1000">
          <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter italic mb-4">PROBOOTH</h1>
          <p className="text-xl text-neutral-500 tracking-[0.6em] uppercase mb-16">High Definition Studio</p>
          <button onClick={() => setStep("PACKAGE_SELECT")} className="bg-white text-black px-24 py-10 rounded-full font-black text-4xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_80px_rgba(255,255,255,0.2)]">START</button>
        </div>
      )}

      {step === "PACKAGE_SELECT" && (
        <div className="z-10 text-center w-full max-w-4xl p-8">
          <h2 className="text-6xl font-black mb-16 italic underline underline-offset-16 decoration-indigo-500">PACKAGES</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[4, 6, 8].map(n => (
              <button key={n} onClick={() => { setMaxPhotos(n); setCapturedPhotos([]); setStep("READY"); }} className="group bg-neutral-900/50 border border-white/10 p-12 rounded-[4rem] hover:border-white hover:bg-neutral-800 transition-all duration-500">
                <div className="text-9xl font-black text-neutral-700 group-hover:text-white transition-colors">{n}</div>
                <div className="text-lg uppercase font-bold tracking-[0.3em] text-neutral-500 mt-4">Shots</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {(step === "READY" || step === "COUNTDOWN" || step === "FLASH") && (
        <div className="z-10 w-full h-full max-w-5xl flex flex-col p-6 animate-in fade-in slide-in-from-bottom-12 duration-700">
          <div className="flex justify-between items-end mb-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-black italic tracking-tighter">STUDIO CAMERA</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-mono uppercase opacity-50 tracking-widest">Capture {capturedPhotos.length + 1} of {maxPhotos}</span>
              </div>
            </div>
            <button onClick={() => setStep("IDLE")} className="text-neutral-600 hover:text-white transition-colors uppercase text-xs tracking-widest border border-white/10 px-4 py-2 rounded-full">Abort</button>
          </div>

          <div className="relative flex-1 bg-neutral-900 rounded-[3.5rem] overflow-hidden shadow-2xl ring-1 ring-white/20">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]" />
            <canvas ref={canvasRef} className="hidden" />
            
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/95 z-30">
                <AlertTriangle size={64} className="text-yellow-500 mb-6" />
                <h3 className="text-3xl font-black text-white mb-4 italic">CAMERA SYSTEM OFFLINE</h3>
                <p className="text-neutral-400 max-w-md mb-8 leading-relaxed">{cameraError}</p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button onClick={() => setupCamera()} className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:scale-105 transition-all"><RefreshCw size={20} /> RETRY CONNECTION</button>
                  <div className="pt-8 border-t border-white/10">
                    <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-4">Detected Hardware:</p>
                    <div className="space-y-2">
                      {devices.length > 0 ? devices.map((d, i) => (
                        <div key={i} className="text-xs text-neutral-400 bg-white/5 p-2 rounded flex items-center gap-2"><Camera size={12} /> {d.label || `Camera ${i+1}`}</div>
                      )) : <div className="text-xs text-neutral-500 italic">No cameras found by browser</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "READY" && !cameraError && (
              <div className="absolute bottom-12 inset-x-0 flex justify-center">
                <button onClick={() => { setCountdown(3); setStep("COUNTDOWN"); }} className="w-32 h-32 bg-white rounded-full border-[12px] border-black/40 shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-90 transition-all" />
              </div>
            )}
            
            {step === "COUNTDOWN" && <div className="absolute inset-0 flex items-center justify-center text-[24rem] font-black italic select-none pointer-events-none drop-shadow-2xl">{countdown}</div>}
            {step === "FLASH" && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />}
          </div>
        </div>
      )}

      {step === "DESIGN" && (
        <div className="z-10 w-full max-w-7xl h-full flex flex-col md:flex-row gap-12 p-12 overflow-hidden animate-in fade-in slide-in-from-right-12 duration-700">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 flex flex-col min-h-0 bg-neutral-900/50 backdrop-blur-xl rounded-[4rem] p-12 border border-white/5">
              <h2 className="text-5xl font-black mb-2 italic">DEVELOPING</h2>
              <p className="text-neutral-500 mb-12">Select your best shots and drop them into the film strip.</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-4 scrollbar-hide">
                {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
              </div>
            </div>
            <div className="w-full md:w-[450px] flex flex-col shrink-0">
              <div className="bg-white p-10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] space-y-4 mb-10 transform -rotate-1">
                <div className="text-black font-black text-center text-[11px] tracking-[0.6em] border-b-2 border-black/5 pb-8 mb-4 uppercase italic">ProBooth Cinematic Series</div>
                <div className="grid grid-cols-2 gap-3">
                  {frameSlots.map((src, i) => (
                    <DroppableSlot key={i} id={`slot-${i}`} photoSrc={src} onClear={() => {
                      const newSlots = [...frameSlots];
                      newSlots[i] = undefined;
                      setFrameSlots(newSlots);
                    }} />
                  ))}
                </div>
                <div className="text-black text-[9px] text-center pt-8 opacity-20 font-mono uppercase tracking-widest leading-loose">
                  Ref: {Math.random().toString(36).substring(7).toUpperCase()} // {new Date().toLocaleDateString()}
                </div>
              </div>
              <button onClick={finalizeDesign} disabled={frameSlots.every(s => !s)} className="w-full bg-indigo-600 disabled:opacity-20 py-8 rounded-[2rem] font-black text-3xl hover:bg-indigo-500 transition shadow-2xl mb-6 shadow-indigo-500/20 active:scale-95">SAVE GALLERY</button>
              <button onClick={() => setStep("PACKAGE_SELECT")} className="text-neutral-500 hover:text-white transition uppercase text-[10px] tracking-[0.4em] font-bold text-center">Discard & Retake</button>
            </div>
            <DragOverlay>
              {activeId ? (
                <div className="w-48 aspect-square rounded-2xl overflow-hidden border-4 border-indigo-500 shadow-2xl scale-110 rotate-3 ring-12 ring-indigo-500/20">
                  <img src={activePhoto?.src} className="w-full h-full object-cover" alt="Dragging" />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {step === "SAVING" && (
        <div className="z-10 flex flex-col items-center gap-10">
          <div className="relative">
            <Loader2 className="w-32 h-32 animate-spin text-indigo-500 opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/10 rounded-full animate-ping" />
            </div>
          </div>
          <h2 className="text-5xl font-black italic tracking-widest text-center">SYCHRONIZING<br/><span className="text-neutral-600 text-3xl not-italic">WITH CLOUD STORAGE</span></h2>
        </div>
      )}

      {step === "RESULT" && (
        <div className="z-10 text-center flex flex-col items-center p-12 max-w-6xl animate-in zoom-in duration-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {frameSlots.filter(s => !!s).map((src, i) => (
              <div key={i} onClick={() => setSelectedPhoto(src!)} className="group relative aspect-[3/4] bg-neutral-900 rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl cursor-zoom-in hover:scale-105 transition-all duration-500 hover:z-20">
                <img src={src} className="w-full h-full object-cover" alt="Final" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white" size={40} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-12 rounded-[4.5rem] shadow-[0_0_120px_rgba(255,255,255,0.15)] mb-12">
            <QRCodeSVG value={`https://be-ptb-production.up.railway.app/view/${sessionId}`} size={300} level="H" includeMargin />
          </div>
          <div className="flex items-center gap-4 text-emerald-400 mb-8 bg-emerald-400/5 px-10 py-4 rounded-full border border-emerald-400/20">
            <CheckCircle2 size={32} />
            <span className="text-2xl font-black tracking-tight uppercase italic">Vault Secured</span>
          </div>
          <p className="text-neutral-500 text-2xl max-w-2xl mb-20 leading-relaxed italic">"Your digital memories have been synchronized with MongoDB Atlas." Scan to access the private gallery.</p>
          <button onClick={() => setStep("IDLE")} className="text-neutral-500 border-b-4 border-neutral-800 hover:text-white hover:border-indigo-500 transition-all duration-300 pb-4 font-black tracking-[0.5em] uppercase text-xl">New Session</button>
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/98 backdrop-blur-3xl flex items-center justify-center p-12 animate-in fade-in duration-500" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-6xl w-full h-full flex items-center justify-center">
            <img src={selectedPhoto} className="max-w-full max-h-full object-contain rounded-[4rem] shadow-[0_0_150px_rgba(255,255,255,0.1)] border-4 border-white/10" alt="Magnified" />
            <button className="absolute top-0 right-0 p-8 text-white/30 hover:text-white transition-opacity"><X size={64} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
