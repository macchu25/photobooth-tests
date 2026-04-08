"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type PhotoboothContextType = {
  maxPhotos: number;
  setMaxPhotos: (n: number) => void;
  capturedPhotos: { id: string; src: string }[];
  setCapturedPhotos: (photos: { id: string; src: string }[]) => void;
  frameSlots: (string | undefined)[];
  setFrameSlots: (slots: (string | undefined)[]) => void;
  layout: "GRID" | "STRIP";
  setLayout: (l: "GRID" | "STRIP") => void;
  resetSession: () => void;
};

const PhotoboothContext = createContext<PhotoboothContextType | undefined>(undefined);

export function PhotoboothProvider({ children }: { children: ReactNode }) {
  const [maxPhotos, setMaxPhotos] = useState<number>(4);
  const [capturedPhotos, setCapturedPhotos] = useState<{ id: string; src: string }[]>([]);
  const [frameSlots, setFrameSlots] = useState<(string | undefined)[]>([]);
  const [layout, setLayout] = useState<"GRID" | "STRIP">("GRID");

  const resetSession = () => {
    setCapturedPhotos([]);
    setFrameSlots([]);
  };

  return (
    <PhotoboothContext.Provider value={{ 
      maxPhotos, setMaxPhotos, 
      capturedPhotos, setCapturedPhotos, 
      frameSlots, setFrameSlots, 
      layout, setLayout, 
      resetSession 
    }}>
      {children}
    </PhotoboothContext.Provider>
  );
}

export function usePhotobooth() {
  const context = useContext(PhotoboothContext);
  if (!context) throw new Error("usePhotobooth must be used within a PhotoboothProvider");
  return context;
}
