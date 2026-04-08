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
  DragStartEvent,
  DragOverlay
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { 
  X,
  Camera,
  LayoutGrid,
  Columns,
  ChevronRight,
  RotateCcw
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
        <Camera size={16} className="opacity-10" />
      )}
    </div>
  );
}

export default function DesignPage() {
  const router = useRouter();
  const { capturedPhotos, frameSlots, setFrameSlots, layout, setLayout, maxPhotos } = usePhotobooth();
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
    } catch {
      router.push(`/result/err-${Date.now()}`);
    }
  };

  if (isSaving) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-8">
        <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-4xl font-black italic tracking-widest uppercase">Saving Memories</h2>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-8 lg:p-12 overflow-y-auto">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-12 animate-in fade-in slide-in-from-right-12">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="flex-1 flex flex-col bg-neutral-900/50 backdrop-blur-3xl rounded-[4rem] p-12 border border-white/5">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-5xl font-black italic mb-2">CUSTOMIZE</h2>
                <p className="text-neutral-500 text-sm tracking-wide">Select your photos and arrange them in the strip.</p>
              </div>
              <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                <button onClick={() => setLayout("GRID")} className={`px-6 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all ${layout === "GRID" ? "bg-white text-black" : "text-neutral-500"}`}><LayoutGrid size={14} /> Grid</button>
                <button onClick={() => setLayout("STRIP")} className={`px-6 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all ${layout === "STRIP" ? "bg-white text-black" : "text-neutral-500"}`}><Columns size={14} /> Strip</button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
            </div>
          </div>

          <div className="w-full lg:w-[420px] flex flex-col shrink-0">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col relative transition-all duration-700">
              <div className="text-black font-black text-center text-[10px] tracking-[0.5em] border-b-2 border-black/5 pb-8 mb-8 uppercase italic opacity-40">ProBooth Studio Layout</div>
              <div className={`grid gap-4 ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
                {frameSlots.map((src, i) => (
                  <DroppableSlot key={i} id={`slot-${i}`} photoSrc={src} isStrip={layout === "STRIP"} onClear={() => {
                    const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                  }} />
                ))}
              </div>
              <div className="text-black text-[9px] text-center pt-8 opacity-20 font-mono tracking-widest uppercase italic">Verified Studio Composition</div>
            </div>
            <button onClick={finalizeDesign} disabled={frameSlots.every(s => !s)} className="mt-10 w-full bg-indigo-600 disabled:opacity-20 py-10 rounded-[2.5rem] font-black text-2xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-4">FINALIZE <ChevronRight size={32} /></button>
            <button onClick={() => router.push("/capture")} className="mt-4 text-neutral-500 hover:text-white uppercase text-xs tracking-widest text-center">Retake Photos</button>
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="w-48 aspect-[3/2] rounded-2xl overflow-hidden border-4 border-indigo-500 shadow-2xl scale-110">
                <img src={capturedPhotos.find(p => p.id === activeId)?.src} className="w-full h-full object-cover" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </main>
  );
}
