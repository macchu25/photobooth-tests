"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  closestCenter
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { 
  Trash2, 
  GripVertical, 
  Printer, 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  X,
  Maximize2
} from "lucide-react";

type Step = "IDLE" | "PACKAGE_SELECT" | "READY" | "COUNTDOWN" | "FLASH" | "DESIGN" | "SAVING" | "RESULT";

// --- Components for Drag and Drop ---

function DraggableThumb({ id, src }: { id: string, src: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      {...attributes} 
      {...listeners}
      className={`relative aspect-square bg-neutral-800 rounded-lg overflow-hidden border-2 border-white/5 hover:border-indigo-500 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <img src={src} className="w-full h-full object-cover" alt="Capture" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
    </div>
  );
}

function DroppableSlot({ id, photoSrc, onClear }: { id: string, photoSrc?: string, onClear: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef}
      className={`relative aspect-[3/2] rounded-lg transition-all border-2 flex items-center justify-center overflow-hidden
        ${isOver ? "border-indigo-500 bg-indigo-500/20 scale-[1.02]" : "border-black/5 bg-neutral-100"}
        ${photoSrc ? "shadow-inner" : "border-dashed opacity-50"}
      `}
    >
      {photoSrc ? (
        <>
          <img src={photoSrc} className="w-full h-full object-cover" alt="Framed" />
          <button 
            onClick={(e) => { e.stopPropagation(); onClear(); }} 
            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">Drop Photo Here</span>
      )}
    </div>
  );
}

// --- Main Application ---

export default function Photobooth() {
  const [step, setStep] = useState<Step>("IDLE");
  const [countdown, setCountdown] = useState(3);
  const [capturedPhotos, setCapturedPhotos] = useState<{id: string, src: string}[]>([]);
  const [frameSlots, setFrameSlots] = useState<(string | undefined)[]>([undefined, undefined, undefined, undefined]);
  const [maxPhotos, setMaxPhotos] = useState<number>(4);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null); // For Modal
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err: any) {
        setCameraError(err.message);
      }
    }
    setupCamera();
  }, []);

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
            src = canvasRef.current.toDataURL("image/jpeg", 0.8);
          }
        }
        const updated = [...capturedPhotos, { id: `p-${Date.now()}`, src }];
        setCapturedPhotos(updated);
        
        if (updated.length < maxPhotos) {
          setStep("READY");
          setTimeout(() => { setCountdown(3); setStep("COUNTDOWN"); }, 1000);
        } else {
          setStep("DESIGN");
        }
      }, 300);
      return () => clearTimeout(flashTimer);
    }
  }, [step, countdown, capturedPhotos, maxPhotos]);

  // --- DnD Event Handlers ---
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
    if (finalPhotos.length === 0) return alert("Please add at least one photo to the frame!");

    setStep("SAVING");
    try {
      const response = await fetch("https://be-ptb-production.up.railway.app/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: finalPhotos })
      });
      const data = await response.json();
      setSessionId(data.id);
      setStep("RESULT");
    } catch (err) {
      setSessionId("local-" + Date.now());
      setStep("RESULT");
    }
  };

  const activePhoto = capturedPhotos.find(p => p.id === activeId);

  return (
    <main className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-fuchsia-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

      {step === "IDLE" && (
        <div className="text-center z-10 p-8">
          <h1 className="text-8xl md:text-[14rem] font-black tracking-tighter transition-all">PROBOOTH</h1>
          <p className="text-xl text-neutral-500 tracking-[0.5em] uppercase mb-12">Luxury Photo Unit</p>
          <button onClick={() => setStep("PACKAGE_SELECT")} className="bg-white text-black px-16 py-8 rounded-full font-black text-3xl hover:scale-110 active:scale-95 transition-all">START SESSION</button>
        </div>
      )}

      {step === "PACKAGE_SELECT" && (
        <div className="z-10 text-center w-full max-w-4xl p-8">
          <h2 className="text-5xl font-black mb-16">CHOOSE PACKAGE</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[4, 6, 8].map(n => (
              <button key={n} onClick={() => { setMaxPhotos(n); setCapturedPhotos([]); setStep("READY"); }} className="group bg-white/5 border border-white/10 p-12 rounded-[3.5rem] hover:border-indigo-500 hover:bg-white/10 transition-all">
                <div className="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-600 group-hover:from-indigo-400 group-hover:to-fuchsia-400">{n}</div>
                <div className="text-lg uppercase font-bold tracking-[0.2em] text-neutral-500 group-hover:text-white mt-4">Captures</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {(step === "READY" || step === "COUNTDOWN" || step === "FLASH") && (
        <div className="z-10 w-full h-full max-w-6xl flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-2xl font-bold tracking-widest opacity-40 uppercase italic">Live // Feed {capturedPhotos.length + 1} / {maxPhotos}</span>
            <button onClick={() => setStep("IDLE")} className="text-neutral-500 hover:text-white transition">Exit</button>
          </div>
          <div className="relative flex-1 bg-neutral-900 rounded-[3rem] overflow-hidden border border-white/10">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {step === "READY" && (
              <div className="absolute bottom-12 inset-x-0 flex justify-center">
                <button onClick={() => { setCountdown(3); setStep("COUNTDOWN"); }} className="w-28 h-28 bg-white rounded-full border-[10px] border-black/30 shadow-2xl hover:scale-105 active:scale-95 transition-all" />
              </div>
            )}
            {step === "COUNTDOWN" && <div className="absolute inset-0 flex items-center justify-center text-[20rem] font-black">{countdown}</div>}
            {step === "FLASH" && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />}
          </div>
        </div>
      )}

      {step === "DESIGN" && (
        <div className="z-10 w-full max-w-7xl h-full flex flex-col md:flex-row gap-8 p-12 overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            
            {/* Left: Pool of Captured Photos */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/5 backdrop-blur-md rounded-[3rem] p-10 border border-white/5">
              <h2 className="text-4xl font-black mb-2">PHOTO POOL</h2>
              <p className="text-neutral-500 mb-10">Drag your favorite shots into the frame of the right.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 scrollbar-hide">
                {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
              </div>
            </div>

            {/* Right: The Frame */}
            <div className="w-full md:w-[400px] flex flex-col shrink-0">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl space-y-4 mb-8">
                <div className="text-black font-black text-center text-[10px] tracking-[0.5em] border-b-2 border-dashed border-black/10 pb-6 mb-2 uppercase opacity-50">Studio Series Frame</div>
                
                <div className="space-y-3">
                  {frameSlots.map((src, i) => (
                    <DroppableSlot 
                      key={i} 
                      id={`slot-${i}`} 
                      photoSrc={src} 
                      onClear={() => {
                        const newSlots = [...frameSlots];
                        newSlots[i] = undefined;
                        setFrameSlots(newSlots);
                      }}
                    />
                  ))}
                </div>

                <div className="text-black text-[9px] text-center pt-6 opacity-30 font-mono italic uppercase tracking-tighter">
                  Authenticated ProBooth // {new Date().toLocaleTimeString()}
                </div>
              </div>
              
              <button 
                onClick={finalizeDesign} 
                disabled={frameSlots.every(s => !s)}
                className="w-full bg-indigo-600 disabled:opacity-30 py-6 rounded-2xl font-black text-2xl hover:bg-indigo-500 transition shadow-xl mb-4"
              >
                FINISH DESIGN
              </button>
              <button onClick={() => setStep("PACKAGE_SELECT")} className="text-neutral-500 hover:text-white transition uppercase text-xs tracking-widest">Retake Session</button>
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="w-40 aspect-square rounded-lg overflow-hidden border-4 border-indigo-500 shadow-2xl scale-[1.1] rotate-3">
                  <img src={activePhoto?.src} className="w-full h-full object-cover" alt="Dragging" />
                </div>
              ) : null}
            </DragOverlay>

          </DndContext>
        </div>
      )}

      {step === "SAVING" && (
        <div className="z-10 flex flex-col items-center gap-6">
          <Loader2 className="w-24 h-24 animate-spin text-white opacity-40" />
          <h2 className="text-4xl font-black tracking-widest">UPLOADING TO ATLAS...</h2>
        </div>
      )}

      {step === "RESULT" && (
        <div className="z-10 text-center flex flex-col items-center p-12">
          {/* 4 Photos Grid (Small) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 max-w-5xl">
            {frameSlots.filter(s => !!s).map((src, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedPhoto(src!)}
                className="group relative aspect-[3/4] bg-neutral-900 rounded-3xl overflow-hidden border-4 border-white shadow-2xl cursor-zoom-in hover:scale-105 transition-all duration-500"
              >
                <img src={src} className="w-full h-full object-cover" alt="Final" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white" size={32} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl mb-12 animate-in zoom-in duration-700">
            <QRCodeSVG value={`https://be-ptb-production.up.railway.app/view/${sessionId}`} size={240} level="H" includeMargin />
          </div>
          
          <div className="flex items-center gap-3 text-green-500 mb-4 bg-green-500/10 px-6 py-2 rounded-full border border-green-500/20">
            <CheckCircle2 size={24} />
            <span className="text-xl font-bold tracking-tight uppercase">Session Securely Stored</span>
          </div>
          
          <h2 className="text-6xl font-black mb-2">SCAN & DOWNLOAD</h2>
          <p className="text-neutral-500 text-lg max-w-lg mb-16 italic">Your memories are ready. Scan the code to access your digital gallery.</p>
          
          <button onClick={() => setStep("IDLE")} className="text-neutral-400 border-b border-white/20 hover:text-white hover:border-white transition-all pb-2 font-black tracking-[0.3em] uppercase">New Experience</button>
        </div>
      )}

      {/* --- PHOTO MODAL --- */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <img src={selectedPhoto} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl" alt="Magnified" />
            <button className="absolute top-0 right-0 p-4 text-white/50 hover:text-white transition">
              <X size={48} />
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
