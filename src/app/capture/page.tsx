"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePhotobooth } from "@/context/PhotoboothContext";
import { AlertTriangle, AlertCircle } from "lucide-react";

export default function CapturePage() {
  const router = useRouter();
  const { maxPhotos, capturedPhotos, setCapturedPhotos } = usePhotobooth();
  
  const [countdown, setCountdown] = useState(0);
  const [isFlash, setIsFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stepIsActive, setStepIsActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setStepIsActive(true);
    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err: any) { setCameraError(err.message); }
    }
    setup();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && videoRef.current && !cameraError && stepIsActive && capturedPhotos.length < maxPhotos) {
      if (capturedPhotos.length > 0 || sessionStarted) triggerCapture();
    }
  }, [countdown]);

  const [sessionStarted, setSessionStarted] = useState(false);

  const triggerCapture = async () => {
    setIsFlash(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && videoRef.current) {
      canvasRef.current!.width = videoRef.current.videoWidth;
      canvasRef.current!.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const src = canvasRef.current!.toDataURL("image/jpeg", 0.85);
      const newPhotos = [...capturedPhotos, { id: `p-${Date.now()}`, src }];
      setCapturedPhotos(newPhotos);
      setTimeout(() => {
        setIsFlash(false);
        if (newPhotos.length < maxPhotos) { setCountdown(3); }
        else { router.push("/design"); }
      }, 500);
    }
  };

  return (
    <main className="fixed inset-0 bg-black text-white p-6 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full flex justify-between items-center mb-4 px-4 font-black italic text-neutral-500 tracking-widest uppercase shrink-0 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>SESSION // {capturedPhotos.length + 1} / {maxPhotos}</span>
          </div>
          <button onClick={() => router.push("/")} className="underline opacity-50">Exit</button>
        </div>

        <div className="relative flex-1 w-full bg-neutral-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/5">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[0.1]" />
          <canvas ref={canvasRef} className="hidden" />
          
          {cameraError && (
            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-8 text-center z-50">
              <AlertTriangle className="text-yellow-500 mb-4" size={48} />
              <h3 className="text-2xl font-black mb-4 uppercase italic">Camera Offline</h3>
              <button onClick={() => window.location.reload()} className="bg-white text-black px-10 py-3 rounded-full font-black text-xs">RETRY</button>
            </div>
          )}

          {!cameraError && countdown === 0 && !sessionStarted && (
            <div className="absolute bottom-10 inset-x-0 flex justify-center">
              <button onClick={() => { setSessionStarted(true); setCountdown(3); }} className="w-24 h-24 bg-white rounded-full border-[8px] border-black/30 shadow-2xl hover:scale-110 active:scale-95 transition-all" />
            </div>
          )}

          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[20rem] font-black italic select-none">
              {countdown}
            </div>
          )}

          {isFlash && <div className="absolute inset-0 bg-white z-[60] animate-out fade-out duration-500" />}
        </div>
      </div>
    </main>
  );
}
