/**
 * QRCameraScanner — fullscreen mobile kamera scanner.
 * Kamera belakang default, bisa switch ke kamera depan.
 * Menggunakan jsQR untuk decode.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, SwitchCamera, ScanLine, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QRCameraScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | scanning | error
  const [facingMode, setFacingMode] = useState('environment'); // environment = belakang
  const [jsQRLoaded, setJsQRLoaded] = useState(!!window.jsQR);

  // Load jsQR sekali
  useEffect(() => {
    if (window.jsQR) { setJsQRLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    script.onload = () => setJsQRLoaded(true);
    script.onerror = () => setStatus('error');
    document.head.appendChild(script);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR?.(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    if (code?.data) {
      stopCamera();
      onResult(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [onResult, stopCamera]);

  const startCamera = useCallback(async (facing) => {
    stopCamera();
    setStatus('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('scanning');
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setStatus('error');
    }
  }, [stopCamera, scanFrame]);

  useEffect(() => {
    if (!jsQRLoaded) return;
    startCamera(facingMode);
    return stopCamera;
  }, [jsQRLoaded, facingMode]);

  const switchCamera = () => {
    setFacingMode(f => f === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video fullscreen */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark overlay with scan window */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top dark */}
        <div className="absolute top-0 left-0 right-0 h-[20%] bg-black/55" />
        {/* Middle row: left dark + scan box + right dark */}
        <div className="absolute left-0 right-0 flex" style={{ top: '20%', height: '55%' }}>
          <div className="flex-1 bg-black/55" />
          <div className="w-64 h-full relative flex-shrink-0">
            {/* Corner marks */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
            {/* Scan line animation */}
            {status === 'scanning' && (
              <div
                className="absolute left-2 right-2 h-0.5 bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]"
                style={{ animation: 'scanline 2s ease-in-out infinite' }}
              />
            )}
          </div>
          <div className="flex-1 bg-black/55" />
        </div>
        {/* Bottom dark */}
        <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-black/55" />
      </div>

      {/* Scan line CSS */}
      <style>{`
        @keyframes scanline {
          0% { top: 8px; }
          50% { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
      `}</style>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe pt-4 pb-3">
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-white font-semibold text-sm drop-shadow">Scan QR Patroli</p>
        <button
          onClick={switchCamera}
          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom hint */}
      <div className="relative z-10 mt-auto pb-safe pb-8 flex flex-col items-center gap-2 px-4">
        <p className="text-white/80 text-xs text-center drop-shadow">
          {facingMode === 'environment' ? '📷 Kamera Belakang' : '🤳 Kamera Depan'} — Arahkan QR ke dalam kotak hijau
        </p>
      </div>

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <ScanLine className="w-8 h-8 text-green-400 animate-pulse" />
            <p className="text-white text-sm">Memuat kamera...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-white text-center text-sm">Kamera tidak dapat diakses.<br />Pastikan izin kamera sudah diberikan.</p>
          <div className="flex gap-3">
            <Button size="sm" onClick={() => startCamera(facingMode)} className="bg-green-500 hover:bg-green-600 gap-2">
              <RefreshCw className="w-4 h-4" /> Coba Lagi
            </Button>
            <Button size="sm" variant="outline" onClick={() => { stopCamera(); onClose(); }} className="border-white/30 text-white bg-transparent hover:bg-white/10">
              Tutup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}