"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type PhotoboothContextType = {
  maxPhotos: number;
  setMaxPhotos: (n: number) => void;
  capturedPhotos: { id: string; src: string }[];
  setCapturedPhotos: (photos: { id: string; src: string }[]) => void;
  frameSlots: (string | undefined)[];
  setFrameSlots: (slots: (string | undefined)[]) => void;
  layout: "GRID" | "STRIP" | "POLAROID" | "POSTER" | "WALL";
  setLayout: (l: "GRID" | "STRIP" | "POLAROID" | "POSTER" | "WALL") => void;
  frameColor: string;
  setFrameColor: (c: string) => void;
  resetSession: () => void;
};

const PhotoboothContext = createContext<PhotoboothContextType | undefined>(undefined);

export function PhotoboothProvider({ children }: { children: ReactNode }) {
  const [maxPhotos, setMaxPhotos] = useState<number>(4);
  const [capturedPhotos, setCapturedPhotos] = useState<{ id: string; src: string }[]>([]);
  const [frameSlots, setFrameSlots] = useState<(string | undefined)[]>([]);
  const [layout, setLayout] = useState<"GRID" | "STRIP" | "POLAROID" | "POSTER" | "WALL">("GRID");
  const [frameColor, setFrameColor] = useState<string>("white");

  const resetSession = () => {
    setCapturedPhotos([]);
    setFrameSlots([]);
    setLayout("GRID");
    setFrameColor("white");
  };

  return (
    <PhotoboothContext.Provider value={{ 
      maxPhotos, setMaxPhotos, 
      capturedPhotos, setCapturedPhotos, 
      frameSlots, setFrameSlots, 
      layout, setLayout, 
      frameColor, setFrameColor,
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
