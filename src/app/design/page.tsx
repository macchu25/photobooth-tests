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
  CheckCircle2,
  Share2
} from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";
import { CompositionFrame } from "@/components/CompositionFrame";

function DraggableThumb({ id, src }: { id: string, src: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`relative aspect-[3/2] bg-neutral-800 rounded-xl overflow-hidden border-2 border-white/5 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 scale-95" : "opacity-100 shadow-xl"}`}>
      <img src={src} className="w-full h-full object-cover" alt="Capture" />
    </div>
  );
}



export default function DesignPage() {
  const router = useRouter();
  const { capturedPhotos, frameSlots, setFrameSlots, layout, setLayout, maxPhotos, frameColor, setFrameColor } = usePhotobooth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pickingSlotIndex, setPickingSlotIndex] = useState<number | null>(null);

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
      <div className={`w-full h-full max-w-7xl flex gap-6 md:gap-8 animate-in fade-in duration-500 overflow-visible lg:overflow-hidden ${layout === "STRING" ? "flex-col" : "flex-col lg:flex-row"}`}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>

          {/* GALLERY SECTION - Hidden in STRING layout */}
          {layout !== "STRING" && (
            <div className={`flex flex-col bg-neutral-900/40 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 border border-white/5 overflow-hidden transition-all duration-500 w-full lg:flex-1 h-full`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-indigo-500 rounded-full" />
                  <h2 className="text-xl md:text-2xl font-black italic tracking-tighter">PHOTO VAULT</h2>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  {/* Layout Swatcher */}
                  <div className="flex bg-black/60 p-1 rounded-2xl border border-white/10">
                    <button onClick={() => setLayout("STRIP")} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "STRIP" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}><Columns size={12} /> Strip</button>
                    <button onClick={() => setLayout("POLAROID")} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "POLAROID" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}><Camera size={12} /> Polaroid</button>
                    <button onClick={() => setLayout("POSTER")} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "POSTER" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}><LayoutGrid size={12} /> Poster</button>
                    <button onClick={() => setLayout("WALL")} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "WALL" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}><Heart size={12} /> Wall</button>
                    <button onClick={() => setLayout("STRING")} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase transition-all ${layout === "STRING" ? "bg-indigo-500 text-white" : "text-neutral-500 hover:text-white"}`}><Share2 size={12} /> String</button>
                  </div>

                  {/* Color Swatcher */}
                  <div className="flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/5">
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

              <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 scrollbar-hide py-1`}>
                {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
              </div>
            </div>
          )}

          {/* COMPOSITION SECTION */}
          <div className={`flex shrink-0 transition-all duration-500 ${layout === "STRING" ? "w-full h-fit py-4 flex-col lg:flex-row items-center gap-6 px-10 bg-indigo-500/5 rounded-[3rem] border border-indigo-500/10 mt-2" : "flex-col items-center w-full lg:w-[320px] xl:w-[400px] h-full overflow-y-auto scrollbar-hide pb-20 mt-0"}`}>
            <div className={`flex flex-col items-center ${layout === "STRING" ? "flex-1 w-full" : "w-full"}`}>
              {layout === "STRING" && (
                <div className="flex flex-wrap gap-4 items-center mb-6 bg-black/40 p-3 rounded-2xl border border-white/5 animate-in slide-in-from-top duration-500 scale-90">
                  <div className="flex bg-black/60 p-1 rounded-xl border border-white/10">
                    <button onClick={() => setLayout("STRIP")} className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all text-neutral-500 hover:text-white"><Columns size={12} /> Strip</button>
                    <button onClick={() => setLayout("POLAROID")} className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all text-neutral-500 hover:text-white"><Camera size={12} /> Polaroid</button>
                    <button onClick={() => setLayout("STRING")} className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all bg-indigo-500 text-white"><Share2 size={12} /> String</button>
                  </div>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <div className="flex gap-2">
                    {["white", "black", "#ffebf0", "#e3f2fd", "#f3e5f5"].map(c => (
                      <button key={c} onClick={() => setFrameColor(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full border-2 transition-all ${frameColor === c ? "border-indigo-500 scale-110" : "border-transparent opacity-60 hover:opacity-100"}`} />
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-4 opacity-30 uppercase tracking-[0.2em] font-black text-[9px]">
                {layout === "STRING" ? "Horizontal Workspace" : "Vertical Studio"}
              </div>

              <div className={`${layout === "STRING" ? "w-full overflow-x-auto scrollbar-hide pb-4 flex justify-start lg:pl-10" : "w-full px-4"}`}>
                <CompositionFrame 
                  layout={layout} 
                  frameSlots={frameSlots} 
                  frameColor={frameColor} 
                  maxPhotos={maxPhotos} 
                  onClearSlot={(i) => {
                    const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                  }}
                  onSelectSlot={(i) => setPickingSlotIndex(i)}
                />
              </div>
            </div>
            
            <div className={`shrink-0 space-y-3 w-full max-w-[220px] px-4 transition-all ${layout === "STRING" ? "lg:border-l lg:border-white/10 lg:pl-8 mt-0" : "mt-8"}`}>
              <button 
                onClick={finalizeDesign} 
                disabled={frameSlots.every(s => !s)} 
                className={`w-full bg-indigo-600 disabled:opacity-20 rounded-[1.2rem] font-black hover:bg-indigo-500 transition-all shadow-xl active:scale-95 italic uppercase tracking-wider flex items-center justify-center whitespace-nowrap ${layout === "STRING" ? "py-4 text-sm" : "py-5 text-xl"}`}
              >
                FINALIZE <ChevronRight className="inline ml-1" />
              </button>
              <button onClick={() => router.push("/capture")} className="w-full text-neutral-600 hover:text-white uppercase text-[8px] font-black tracking-[0.2em] text-center py-1 flex items-center justify-center gap-2">
                <RotateCcw size={10} /> RETAKE
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

      {/* PHOTO PICKER MODAL */}
      {pickingSlotIndex !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPickingSlotIndex(null)} />
          <div className="bg-neutral-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl p-8 relative shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-wider">Select Photo for Slot {pickingSlotIndex + 1}</h3>
              <button onClick={() => setPickingSlotIndex(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
              {capturedPhotos.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => {
                    const next = [...frameSlots];
                    next[pickingSlotIndex] = p.src;
                    setFrameSlots(next);
                    setPickingSlotIndex(null);
                  }}
                  className="aspect-[3/2] rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-500 cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
                >
                  <img src={p.src} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
