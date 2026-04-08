"use client";

import { useEffect, useRef, useState } from "react";

type Step = "IDLE" | "READY" | "COUNTDOWN" | "FLASH" | "RESULT";

export default function Photobooth() {
  const [step, setStep] = useState<Step>("IDLE");
  const [countdown, setCountdown] = useState(3);
  const [photos, setPhotos] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Fallback mock image just in case
  const mockImage = "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1920&auto=format&fit=crop";

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setCameraError(err.message || "Failed to access camera");
      }
    }
    setupCamera();
  }, []);

  const startSession = () => {
    setStep("READY");
  };

  const startCapture = () => {
    setStep("COUNTDOWN");
    setCountdown(3);
  };

  // Handle Countdown
  useEffect(() => {
    if (step === "COUNTDOWN") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setStep("FLASH");
        setTimeout(() => {
          if (videoRef.current && canvasRef.current && !cameraError) {
            const width = videoRef.current.videoWidth || 1920;
            const height = videoRef.current.videoHeight || 1080;
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              canvasRef.current.width = width;
              canvasRef.current.height = height;
              // Draw the current video frame to the canvas
              ctx.drawImage(videoRef.current, 0, 0, width, height);
              // Get the image data
              const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
              setPhotos([dataUrl]);
            }
          } else {
            // Fallback to mock image if no camera
            setPhotos([mockImage]);
          }
          setStep("RESULT");
        }, 300); // flash duration
      }
    }
  }, [step, countdown]);


  const retake = () => {
    setPhotos([]);
    setStep("READY");
  };

  const finish = () => {
    setPhotos([]);
    setStep("IDLE");
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans overflow-hidden select-none relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center">
        <div className="absolute w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-indigo-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-fuchsia-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      </div>

      {/* IDLE/WELCOME SCREEN */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 z-10 ${step === "IDLE" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-20 pointer-events-none"}`}>
        <div className="text-center space-y-6 flex flex-col items-center w-full px-4">
          <div className="inline-block relative">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-neutral-200 to-neutral-500 pb-4">
              PROBOOTH
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-fuchsia-500 blur-2xl opacity-20 -z-10 rounded-full" />
          </div>
          <p className="text-xl md:text-2xl text-neutral-400 font-light tracking-[0.3em] uppercase max-w-2xl text-center">
            Premium Cinematic Experience
          </p>
          
          <button 
            onClick={startSession}
            className="mt-16 group relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-fuchsia-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse" />
            <div className="relative px-12 py-6 bg-black rounded-full flex items-center gap-4 border border-white/10 group-hover:bg-neutral-900 transition duration-300">
               <span className="text-2xl font-bold tracking-wider text-white uppercase group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-fuchsia-400 transition-colors">Tap To Start</span>
               <svg className="w-8 h-8 text-white group-hover:translate-x-2 transition transform group-hover:text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
               </svg>
            </div>
          </button>
        </div>
      </div>

      {/* CAMERA VIEWFINDER & COUNTDOWN */}
      <div className={`absolute inset-0 flex flex-col transition-all duration-1000 z-20 p-8 md:p-12 ${step === "READY" || step === "COUNTDOWN" || step === "FLASH" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold tracking-widest text-white/50">PROBOOTH // STUDIO READY</h2>
            <button onClick={finish} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 transition backdrop-blur-md">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Viewfinder Main */}
        <div className="relative flex-1 rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.05)] bg-neutral-900 group">
             {/* Live Camera Feed */}
             <div className="absolute inset-0 bg-neutral-800">
                <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-105"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {cameraError && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/80 z-20">
                     <p className="text-xl font-semibold text-red-500 mb-2">Camera Error</p>
                     <p className="text-neutral-300 text-sm">{cameraError}</p>
                     <p className="text-neutral-400 text-xs mt-4 max-w-sm">Please ensure your phone or camera is connected and allowed in browser settings.</p>
                   </div>
                )}
             </div>
             
             {/* Crosshairs & Grid Lines for Pro Feel */}
             <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12 pointer-events-none opacity-40">
                 <div className="flex justify-between w-full">
                     <div className="w-16 h-16 border-t-[3px] border-l-[3px] border-white/80 rounded-tl-3xl" />
                     <div className="w-16 h-16 border-t-[3px] border-r-[3px] border-white/80 rounded-tr-3xl" />
                 </div>
                 
                 {/* Center crosshair */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 opacity-20 border border-white flex items-center justify-center rounded-full">
                        <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                 </div>

                 <div className="flex justify-between w-full">
                     <div className="w-16 h-16 border-b-[3px] border-l-[3px] border-white/80 rounded-bl-3xl" />
                     <div className="w-16 h-16 border-b-[3px] border-r-[3px] border-white/80 rounded-br-3xl" />
                 </div>
             </div>

             {/* UI Elements depending on state */}
             {step === "READY" && (
                 <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                     <button onClick={startCapture} className="group/btn relative outline-none">
                        <div className="absolute -inset-4 bg-white/20 rounded-full blur-md group-hover/btn:bg-white/30 transition-all duration-300" />
                        <div className="relative w-24 h-24 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center group-hover/btn:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                            <div className="w-20 h-20 border-[4px] border-black/80 rounded-full flex items-center justify-center">
                                <div className="w-1 h-1 bg-black/50 rounded-full" />
                            </div>
                        </div>
                     </button>
                 </div>
             )}

             {step === "COUNTDOWN" && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                     <span 
                         key={countdown} 
                         className="text-[15rem] font-black tracking-tighter text-white drop-shadow-[0_0_80px_rgba(255,255,255,0.8)]"
                         style={{ animation: 'popIn 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                     >
                         {countdown}
                     </span>
                 </div>
             )}
        </div>
      </div>

      {/* FLASH EFFECT */}
      <div className={`fixed inset-0 bg-white z-50 transition-opacity duration-150 pointer-events-none ${step === "FLASH" ? "opacity-100" : "opacity-0"}`} />

      {/* RESULT / REVIEW SCREEN */}
      <div className={`absolute inset-0 flex flex-col z-30 p-8 md:p-12 transition-all duration-1000 ${step === "RESULT" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-20 pointer-events-none"}`}>
          <div className="flex-1 flex flex-col lg:flex-row gap-12 items-center justify-center max-w-7xl mx-auto w-full">
              
              {/* Photo Display */}
              <div className="relative w-full lg:w-2/3 aspect-[4/3] md:aspect-[3/2] bg-neutral-900 rounded-[2rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(255,255,255,0.1)] border-[12px] border-white">
                  <img src={photos[0]} className="w-full h-full object-cover" alt="Captured" />
                  
                  {/* Watermark */}
                  <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-lg px-5 py-2.5 rounded-xl text-white font-mono text-sm border border-white/10 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        PROBOOTH // {new Date().toLocaleDateString()}
                  </div>
              </div>

              {/* Actions */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6 bg-black/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5">
                  <h3 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">Looking Good!</h3>
                  <p className="text-neutral-400 text-lg leading-relaxed mb-4">Print your photo, save it to your phone via QR, or retake another one.</p>

                  <button className="relative overflow-hidden group bg-white text-black px-8 py-5 rounded-2xl font-bold text-xl flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all">
                      <div className="absolute inset-0 w-0 bg-neutral-200 transition-all duration-[300ms] ease-out group-hover:w-full" />
                      <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span className="relative z-10">Print Photo</span>
                  </button>

                  <button className="bg-neutral-800 text-white border border-neutral-700 hover:border-neutral-500 px-8 py-5 rounded-2xl font-bold text-xl flex items-center gap-4 hover:bg-neutral-700 transition-all">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Save / Share QR
                  </button>

                  <div className="h-px w-full bg-neutral-800 my-4" />

                  <div className="flex gap-4">
                      <button onClick={retake} className="group/retake flex-1 bg-transparent hover:bg-white text-white hover:text-black border border-neutral-600 hover:border-white px-6 py-4 rounded-xl font-medium transition-all flex justify-center items-center gap-2">
                          <svg className="w-5 h-5 group-hover/retake:-rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Retake
                      </button>
                      <button onClick={finish} className="flex-1 bg-transparent hover:bg-red-500 text-red-400 hover:text-white border border-neutral-600 hover:border-red-500 px-6 py-4 rounded-xl font-medium transition-all flex justify-center items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      </div>

    </main>
  );
}
