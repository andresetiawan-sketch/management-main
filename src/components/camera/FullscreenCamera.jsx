/**
 * FullscreenCamera — kamera fullscreen untuk ambil foto.
 * Kamera belakang default, bisa switch ke kamera depan.
 * onCapture(dataUrl) dipanggil saat foto diambil.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, SwitchCamera, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FullscreenCamera({ onCapture, onClose, title = 'Ambil Foto' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [captured, setCaptured] = useState(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing) => {
    stopCamera();
    setStatus('loading');
    setCaptured(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera(facingMode);
    return stopCamera;
  }, [facingMode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  const confirmPhoto = () => {
    if (captured) {
      onCapture(captured);
    }
  };

  const switchCamera = () => {
    setFacingMode(f => f === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video or Captured preview */}
      {captured ? (
        <img src={captured} alt="Preview" className="absolute inset-0 w-full h-full object-contain bg-black" />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe pt-4 pb-3 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-white font-semibold text-sm drop-shadow">{title}</p>
        {!captured && (
          <button
            onClick={switchCamera}
            className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        )}
        {captured && <div className="w-10" />}
      </div>

      {/* Camera mode label */}
      {!captured && status === 'ready' && (
        <div className="absolute top-16 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <span className="text-white/70 text-xs bg-black/30 px-3 py-1 rounded-full">
            {facingMode === 'environment' ? '📷 Kamera Belakang' : '🤳 Kamera Depan'}
          </span>
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-10 mt-auto pb-safe pb-8 bg-gradient-to-t from-black/70 to-transparent pt-8">
        {!captured ? (
          <div className="flex items-center justify-center gap-8">
            {/* Shutter button */}
            <button
              disabled={status !== 'ready'}
              onClick={capturePhoto}
              className="w-18 h-18 rounded-full border-4 border-white bg-white/20 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              style={{ width: 72, height: 72 }}
            >
              <div className="w-14 h-14 rounded-full bg-white" style={{ width: 56, height: 56 }} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 px-6">
            <Button
              variant="outline"
              onClick={retake}
              className="flex-1 border-white/40 text-white bg-white/10 hover:bg-white/20 gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Foto Ulang
            </Button>
            <Button
              onClick={confirmPhoto}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
            >
              <Camera className="w-4 h-4" /> Gunakan Foto
            </Button>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {status === 'loading' && !captured && (
        <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Camera className="w-8 h-8 text-white animate-pulse" />
            <p className="text-white text-sm">Memuat kamera...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && !captured && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-white text-center text-sm">Kamera tidak dapat diakses.<br />Pastikan izin kamera sudah diberikan.</p>
          <div className="flex gap-3">
            <Button size="sm" onClick={() => startCamera(facingMode)} className="bg-white text-black gap-2">
              <RefreshCw className="w-4 h-4" /> Coba Lagi
            </Button>
            <Button size="sm" variant="outline" onClick={() => { stopCamera(); onClose(); }} className="border-white/30 text-white bg-transparent">
              Tutup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}