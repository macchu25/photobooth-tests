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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setCameraError(err.message);
      }
    }
    setup();

    return () => {
      if (videoRef.current?.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCaptureFlow = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && videoRef.current && !cameraError && stepIsActive) {
      // flash and take photo
      triggerCapture();
    }
  }, [countdown]);

  // We need a way to know if we just started
  const [stepIsActive, setStepIsActive] = useState(false);
  useEffect(() => { setStepIsActive(true); }, []);

  const triggerCapture = async () => {
    if (!stepIsActive) return;
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
        if (newPhotos.length < maxPhotos) {
          setCountdown(3);
        } else {
          router.push("/design");
        }
      }, 500);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-6 px-4 font-black italic text-neutral-500 tracking-widest uppercase">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,1)]" />
            <span>Capturing {capturedPhotos.length + 1} of {maxPhotos}</span>
          </div>
          <button onClick={() => router.push("/")} className="text-sm underline">Exit</button>
        </div>

        <div className="relative w-full aspect-video bg-neutral-900 rounded-[4rem] overflow-hidden shadow-2xl border-4 border-white/5">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[0.2]" />
          <canvas ref={canvasRef} className="hidden" />
          
          {cameraError && (
            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-8 text-center z-50">
              <AlertTriangle className="text-yellow-500 mb-4" size={64} />
              <h3 className="text-3xl font-black mb-4">CAMERA OFFLINE</h3>
              <p className="text-neutral-400 mb-8">{cameraError}</p>
              <button onClick={() => window.location.reload()} className="bg-white text-black px-10 py-4 rounded-full font-black">RETRY CONNECTION</button>
            </div>
          )}

          {!cameraError && countdown === 0 && capturedPhotos.length === 0 && (
            <div className="absolute bottom-12 inset-x-0 flex justify-center">
              <button onClick={startCaptureFlow} className="w-32 h-32 bg-white rounded-full border-[12px] border-black/30 shadow-2xl hover:scale-105 active:scale-95 transition-all" />
            </div>
          )}

          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[25rem] font-black italic animate-in zoom-in duration-300 pointer-events-none">
              {countdown}
            </div>
          )}

          {isFlash && <div className="absolute inset-0 bg-white z-[60] animate-out fade-out duration-500" />}
        </div>
      </div>
    </main>
  );
}
