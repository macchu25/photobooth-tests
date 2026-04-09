"use client";

import React from "react";
import { DroppableSlot } from "./DroppableSlot";
import { Heart } from "lucide-react";

interface FrameProps {
  layout: string;
  frameSlots: (string | undefined)[];
  frameColor: string;
  maxPhotos: number;
  onClearSlot?: (index: number) => void;
  onSelectSlot?: (index: number) => void;
  isResult?: boolean;
  footerLabel?: string;
}

export function CompositionFrame({ layout, frameSlots, frameColor, maxPhotos, onClearSlot, onSelectSlot, isResult, footerLabel }: FrameProps) {
  return (
    <div 
      className={`
        p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col relative items-center shrink-0 transition-all duration-500 overflow-hidden h-fit
        ${layout === "STRIP" ? "min-h-[720px] w-[200px] md:w-[240px]" : ""}
        ${layout === "POSTER" ? "min-h-[700px] w-[200px] md:w-[260px]" : ""}
        ${layout === "POLAROID" || layout === "WALL" ? "min-h-[900px] w-[220px] md:w-[320px]" : ""}
        ${layout === "STRING" ? "min-h-[400px] w-fit min-w-[300px] max-w-full" : ""}
      `} 
      style={{ backgroundColor: frameColor }}
    >
      <div className={`
        ${layout === "STRIP" ? "flex flex-col gap-4 py-8" : ""}
        ${layout === "POLAROID" ? "relative w-full h-full overflow-visible" : ""}
        ${layout === "POSTER" ? "flex flex-col gap-4 items-center py-4 flex-1 justify-center" : ""}
        ${layout === "WALL" ? "grid grid-cols-2 gap-x-2 gap-y-10 pt-4" : ""}
        ${layout === "STRING" ? "relative w-full h-full flex flex-row gap-12 px-20 py-20 min-w-max items-center justify-center" : ""}
        w-full items-center scrollbar-hide shrink-0
      `}>
        {layout === "STRING" && <div className="absolute top-1/2 left-0 w-full h-px bg-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-0" />}
        
        {frameSlots.map((src, i) => {
          let customStyle: React.CSSProperties = {};
          const shadow = frameColor === "black" ? "shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "shadow-lg";
          
          if (layout === "POLAROID") {
            customStyle = {
              backgroundColor: 'white',
              padding: '12px 12px 48px 12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              transform: 'rotate(-2deg)',
              width: '100%',
              aspectRatio: '1/1.2'
            };
          }

          if (layout === "POSTER") {
            const rotations = [-2, 1, -1.5, 2];
            customStyle = {
              transform: `rotate(${rotations[i % rotations.length]}deg)`,
              backgroundColor: 'white',
              padding: '6px 6px 18px 6px',
              width: '95px'
            };
          }

          if (layout === "STRING") {
            const offsets = [5, -10, 8, -5, 12, -8];
            const rotations = [-3, 2, -1, 4, -2, 3];
            const rotate = rotations[i % rotations.length];
            
            return (
              <div 
                key={i} 
                className="relative z-10 transition-all duration-700"
                style={{ transform: `translateY(${offsets[i % offsets.length]}px) rotate(${rotate}deg)` }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-8 bg-[#8d6e63]/80 backdrop-blur-sm rounded-sm z-20 shadow-sm border-x border-white/10" />
                <div className="w-[130px] md:w-[165px] bg-white p-1.5 shadow-md">
                  <DroppableSlot 
                    id={`slot-${i}`} 
                    photoSrc={src} 
                    maxPhotos={maxPhotos} 
                    onClear={onClearSlot ? () => onClearSlot(i) : undefined} 
                    onSelect={onSelectSlot ? () => onSelectSlot(i) : undefined}
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={i} style={customStyle} className={`
              ${["POLAROID", "POSTER", "WALL"].includes(layout) ? `relative border border-neutral-100 ${shadow}` : ""}
              transition-transform duration-300
            `}>
              {layout === "WALL" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded shadow-sm z-20 w-4 h-8 bg-neutral-800" />
              )}
              <DroppableSlot 
                id={`slot-${i}`} 
                photoSrc={src} 
                isStrip={layout === "STRIP"} 
                maxPhotos={maxPhotos} 
                onClear={onClearSlot ? () => onClearSlot(i) : undefined} 
                onSelect={onSelectSlot ? () => onSelectSlot(i) : undefined}
              />
              {layout === "POSTER" && i % 2 === 0 && (
                <div className="absolute top-2 right-2 text-red-500 opacity-50"><Heart size={14} fill="currentColor" /></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`text-[6px] text-center pt-3 opacity-10 font-mono tracking-widest uppercase shrink-0 w-full ${frameColor === "black" ? "text-white" : "text-black"}`}>
        {footerLabel || "Verified Shot Gallery"}
      </div>
    </div>
  );
}
