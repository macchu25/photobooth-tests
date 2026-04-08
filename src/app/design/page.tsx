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
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white gap-8">
        <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-4xl font-black italic tracking-widest uppercase">Saving Memories</h2>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center p-6 md:p-10 overflow-hidden">
      <div className="w-full h-full max-w-7xl flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-right-12 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="flex-1 flex flex-col bg-neutral-900/50 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/5 overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-3xl font-black italic leading-none">GALLERY</h2>
              <div className="flex bg-black p-1 rounded-xl border border-white/10 scale-90">
                <button onClick={() => setLayout("GRID")} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all ${layout === "GRID" ? "bg-white text-black" : "text-neutral-500"}`}><LayoutGrid size={12} /> Grid</button>
                <button onClick={() => setLayout("STRIP")} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all ${layout === "STRIP" ? "bg-white text-black" : "text-neutral-500"}`}><Columns size={12} /> Strip</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-2 scrollbar-hide py-2">
              {capturedPhotos.map(p => <DraggableThumb key={p.id} id={p.id} src={p.src} />)}
            </div>
          </div>

          <div className="w-full lg:w-[350px] xl:w-[400px] flex flex-col shrink-0 h-full overflow-hidden">
            <div className="flex-1 bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">
              <div className="text-black font-black text-center text-[10px] tracking-[0.4em] border-b border-black/10 pb-4 mb-4 uppercase italic opacity-30 leading-none shrink-0">Studio Layout</div>
              <div className={`grid gap-3 overflow-y-auto pr-1 scrollbar-hide ${layout === "GRID" ? "grid-cols-2" : "grid-cols-1"}`}>
                {frameSlots.map((src, i) => (
                  <DroppableSlot key={i} id={`slot-${i}`} photoSrc={src} isStrip={layout === "STRIP"} onClear={() => {
                    const n = [...frameSlots]; n[i] = undefined; setFrameSlots(n);
                  }} />
                ))}
              </div>
              <div className="text-black text-[8px] text-center pt-4 opacity-20 font-mono tracking-widest uppercase shrink-0">Studio Composition</div>
            </div>
            <div className="mt-6 shrink-0">
              <button onClick={finalizeDesign} disabled={frameSlots.every(s => !s)} className="w-full bg-indigo-600 disabled:opacity-20 py-6 rounded-[1.5rem] font-black text-xl hover:bg-indigo-500 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 italic italic tracking-wider">FINALIZE <ChevronRight /></button>
              <button onClick={() => router.push("/capture")} className="w-full mt-3 text-neutral-500 hover:text-white uppercase text-[9px] font-black tracking-widest text-center">Retake Photos</button>
            </div>
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
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
