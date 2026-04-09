"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus, X } from "lucide-react";

interface DroppableSlotProps {
  id: string;
  photoSrc?: string;
  onClear?: () => void;
  onSelect?: () => void;
  isStrip?: boolean;
  maxPhotos: number;
}

export function DroppableSlot({ id, photoSrc, onClear, onSelect, isStrip, maxPhotos }: DroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  const stripClass = maxPhotos > 4 ? "aspect-[3/2] h-[50px] md:h-[70px]" : "aspect-[3/2] h-[80px] md:h-[100px]";
  const gridClass = "aspect-square w-full";

  return (
    <div 
      ref={setNodeRef} 
      onClick={() => !photoSrc && onSelect?.()}
      className={`relative transition-all border-2 flex items-center justify-center overflow-hidden shrink-0 group ${!photoSrc ? "cursor-pointer" : ""} ${isStrip ? stripClass : gridClass} ${isOver ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]" : "border-white/5 bg-black/20"} ${photoSrc ? "shadow-lg border-white/10" : "border-dashed opacity-40 hover:opacity-100 hover:border-white/20 hover:bg-white/5"}`}
    >
      {photoSrc ? (
        <>
          <img src={photoSrc} className="w-full h-full object-cover animate-in fade-in duration-300" alt="Framed" />
          {onClear && (
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100">
              <X size={10} />
            </button>
          )}
        </>
      ) : (
        <div className={`transition-transform duration-300 ${isOver ? "scale-150" : "group-hover:scale-125"}`}>
          <Plus size={16} className={isOver ? "text-indigo-500" : "text-white/40 group-hover:text-white"} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}
