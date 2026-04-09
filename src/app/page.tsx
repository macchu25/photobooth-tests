"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { usePhotobooth } from "@/context/PhotoboothContext";
import { useEffect, useRef } from "react";

export default function WelcomePage() {
  const router = useRouter();
  const { resetSession } = usePhotobooth();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Background camera
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("BG Camera error:", err);
      }
    }
    setupCamera();
  }, []);

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-40">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover blur-3xl scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      <div className="relative z-10 text-center animate-in fade-in zoom-in duration-1000">
        <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter italic mb-4 drop-shadow-2xl">PROBOOTH</h1>
        <p className="text-xl text-neutral-500 tracking-[0.6em] uppercase mb-16">Cinematic Studio Experience</p>
        <button 
          onClick={() => router.push("/package")} 
          className="mx-auto bg-white text-black px-24 py-10 rounded-full font-black text-4xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_80px_rgba(255,255,255,0.2)] flex items-center gap-4"
        >
          START <ChevronRight size={48} />
        </button>
      </div>
    </main>
  );
}
