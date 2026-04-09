"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverlay
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { 
  X,
  Camera,
  LayoutGrid,
  Columns,
  ChevronRight,
  RotateCcw,
  Loader2,
  Heart,
  CheckCircle2
} from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";

function DraggableThumb({ id, src }: { id: string, src: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`relative aspect-[3/2] bg-neutral-800 rounded-xl overflow-hidden border-2 border-white/5 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 scale-95" : "opacity-100 shadow-xl"}`}>
      <img src={src} className="w-full h-full object-cover" alt="Capture" />
    </div>
  );
}

function DroppableSlot({ id, photoSrc, onClear, isStrip, maxPhotos }: { id: string, photoSrc?: string, onClear?: () => void, isStrip?: boolean, maxPhotos: number }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  // Scale size based on count to fit mobile/pc screens
  const stripClass = maxPhotos > 4 ? "aspect-[3/2] h-[60px] md:h-[80px]" : "aspect-[3/2] h-[100px] md:h-[120px]";
  const gridClass = "aspect-square w-full";

  return (
    <div ref={setNodeRef} className={`relative transition-all border-2 flex items-center justify-center overflow-hidden shrink-0 ${isStrip ? stripClass : gridClass} ${isOver ? "border-indigo-500 bg-indigo-500/10" : "border-white/5 bg-black/20"} ${photoSrc ? "shadow-lg border-white/10" : "border-dashed opacity-20"}`}>
      {photoSrc ? (
        <>
          <img src={photoSrc} className="w-full h-full object-cover" alt="Framed" />
          {onClear && (
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors">
              <X size={10} />
            </button>
          )}
        </>
      ) : (
        <Camera size={14} className="opacity-10" />
      )}
    </div>
  );
}

export default function DesignPage() {
  const router = useRouter();
  const { capturedPhotos, frameSlots, setFrameSlots, layout, setLayout, maxPhotos, frameColor, setFrameColor } = usePhotobooth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
    setIsSaving(true);
    try {
      const r = await fetch("https://be-ptb-production.up.railway.app/api/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: final })
      });
      const d = await r.json();
      router.push(`/result/${d.id}`);
    } catch { router.push(`/result/err-${Date.now()}`); }
  };

  if (isSaving) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white gap-8 z-[100]">
        <Loader2 className="w-16 h-16 animate-spin text-indigo-500" />
        <h2 className="text-3xl font-black italic tracking-widest uppercase animate-pulse">Saving Memories</h2>
      </div>
    );
  }

  return (
    <main className="min-h-screen lg:fixed lg:inset-0 bg-[#050505] text-white flex flex-col items-center p-4 md:p-8 lg:p-10 overflow-x-hidden overflow-y-auto lg:overflow-hidden font-sans">
      <div className="w-full h-full max-w-7xl flex flex-col lg:flex-row gap-6 md:gap-8 animate-in fade-in duration-500 overflow-visible lg:overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          
          {/* GALLERY - Top on mobile, Left on PC */}
          <div className="w-full lg:flex-1 flex flex-col bg-neutral-900/50 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 border border-white/5 overflow-hidden min-h-[300px] lg:min-h-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
              <h2 className="text-xl md:text-2xl font-black italic tracking-tighter">GALLERY</h2>
              
              <div className="flex flex-wrap gap-4 items-center">
                {/* Layout Swatcher */}
                <div className="flex bg-black p-1 rounded-xl border border-white/10 scale-75 md:scale-95">
                  <button onClick={() => setLayout("GRID")} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "GRID" ? "bg-white text-black" : "text-neutral-500"}`}><LayoutGrid size={12} /> Grid</button>
                  <button onClick={() => setLayout("STRIP")} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "STRIP" ? "bg-white text-black" : "text-neutral-500"}`}><Columns size={12} /> Strip</button>
                  <button onClick={() => setLayout("POLAROID")} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "POLAROID" ? "bg-white text-black" : "text-neutral-500"}`}><Camera size={12} /> Polaroid</button>
                  <button onClick={() => setLayout("POSTER")} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "POSTER" ? "bg-white text-black" : "text-neutral-500"}`}><CheckCircle2 size={12} /> Poster</button>
                  <button onClick={() => setLayout("WALL")} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "WALL" ? "bg-white text-black" : "text-neutral-500"}`}><Heart size={12} /> Wall</button>
                </div>

                {/* Color Swatcher */}
                <div className="flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/5 scale-75 md:scale-95">
                  {["white", "black", "#ffebf0", "#e3f2fd", "#f3e5f5"].map(c => (
                    <button 
                      key={c} 
                      onClick={() => setFrameColor(c)} 
                      style={{ backgroundColor: c }} 
                      className={`w-6 h-6 rounded-full border-2 transition-all ${frameColor === c ? "border-indigo-500 scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 scrollbar-hide py-1">
              {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
            </div>
          </div>

          {/* COMPOSITION - Bottom on mobile, Right on PC */}
          <div className="w-full lg:w-[320px] xl:w-[400px] flex flex-col shrink-0 h-fit lg:h-full overflow-visible lg:overflow-hidden pb-8 lg:pb-0">
            <div className={`flex-1 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col relative overflow-y-auto lg:overflow-hidden items-center shrink-0 transition-colors duration-500 min-h-[500px]`} style={{ backgroundColor: frameColor }}>
              <div className={`font-black text-center text-[8px] tracking-[0.4em] border-b pb-4 mb-4 uppercase italic opacity-30 leading-none shrink-0 w-full ${frameColor === "black" ? "text-white border-white/10" : "text-black border-black/5"}`}>Studio Print Edition</div>
              
              <div className={`
                ${layout === "GRID" ? "grid grid-cols-2 gap-2" : ""}
                ${layout === "STRIP" ? "flex flex-col gap-2" : ""}
                ${layout === "POLAROID" ? "relative w-full h-[600px] overflow-visible" : ""}
                ${layout === "POSTER" ? "flex flex-col gap-6 items-center py-4" : ""}
                ${layout === "WALL" ? "grid grid-cols-2 gap-x-4 gap-y-12 pt-8" : ""}
                w-full items-center scrollbar-hide
              `}>
                {frameSlots.map((src, i) => {
                  let customStyle: React.CSSProperties = {};
                  const shadow = "shadow-[0_10px_30px_rgba(0,0,0,0.15)]";

                  if (layout === "POLAROID") {
                    // Spread them out more organically
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
                      width: '150px',
                      height: '180px',
                      padding: '6px 6px 24px 6px',
                      backgroundColor: 'white',
                    };
                  }
                  if (layout === "POSTER") {
                    const rotations = [1, -1, 1.5, -1.5, 2];
                    customStyle = {
                      transform: `rotate(${rotations[i % rotations.length]}deg)`,
                      width: '220px',
                      padding: '10px 10px 40px 10px',
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
                      transition-transform duration-300
                    `}>
                      {layout === "WALL" && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-8 bg-neutral-800 rounded z-20 shadow-sm" />
                      )}
                      <DroppableSlot 
                        id={`slot-${i}`} 
                        photoSrc={src} 
                        isStrip={layout === "STRIP"} 
                        maxPhotos={maxPhotos} 
                        onClear={() => {
                          const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                        }} 
                      />
                      {layout === "POSTER" && i % 2 === 0 && (
                        <div className="absolute top-2 right-2 text-red-500 opacity-50"><Heart size={14} fill="currentColor" /></div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={`text-[7px] text-center pt-4 opacity-10 font-mono tracking-widest uppercase shrink-0 w-full ${frameColor === "black" ? "text-white" : "text-black"}`}>Verified Shot Gallery</div>
            </div>
            
            <div className="mt-6 shrink-0 space-y-3">
              <button 
                onClick={finalizeDesign} 
                disabled={frameSlots.every(s => !s)} 
                className="w-full bg-indigo-600 disabled:opacity-20 py-5 rounded-[1.2rem] font-black text-lg hover:bg-indigo-500 transition-all shadow-xl active:scale-95 italic uppercase tracking-wider"
              >
                FINALIZE <ChevronRight className="inline ml-1" />
              </button>
              <button onClick={() => router.push("/capture")} className="w-full text-neutral-600 hover:text-white uppercase text-[8px] font-black tracking-widest text-center py-2 flex items-center justify-center gap-2">
                <RotateCcw size={10} /> Retake
              </button>
            </div>
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="w-32 aspect-[3/2] rounded-xl overflow-hidden border-2 border-indigo-500 shadow-2xl scale-110">
                <img src={capturedPhotos.find(p => p.id === activeId)?.src} className="w-full h-full object-cover" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
