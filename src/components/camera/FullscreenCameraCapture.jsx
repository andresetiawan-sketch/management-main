import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/cloudflareClient';

/**
 * FullscreenCameraCapture
 * Props:
 *   label       - string label for the button
 *   onCapture   - callback(url: string) after upload
 *   previewUrl  - existing image URL to show
 *   disabled    - boolean
 */
export default function FullscreenCameraCapture({ label = 'Ambil Foto', onCapture, previewUrl, disabled }) {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null); // blob URL for preview
  const [uploading, setUploading] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = useCallback(async (facing) => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (e) {
      alert('Tidak dapat mengakses kamera: ' + e.message);
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      setCaptured(null);
    }
  }, [open]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const flipCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (stream) stream.getTracks().forEach(t => t.stop());
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    setStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blobUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(blobUrl);
    // Stop camera preview
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const retake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  const confirm = async () => {
    if (!captured) return;
    setUploading(true);
    try {
      // Convert dataURL to File
      const res = await fetch(captured);
      const blob = await res.blob();
      const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onCapture(file_url);
      setOpen(false);
    } catch (e) {
      alert('Gagal upload foto: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Trigger */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-red-400 bg-gray-50 hover:bg-red-50 text-sm text-gray-600 hover:text-red-700 transition-all w-full justify-center disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          {label}
        </button>
        {previewUrl && (
          <div className="relative">
            <img src={previewUrl} alt="Foto" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">Foto tersimpan</span>
          </div>
        )}
      </div>

      {/* Fullscreen Camera Overlay */}
      {open && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          {/* Video or Captured */}
          <div className="flex-1 relative overflow-hidden">
            {!captured ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={captured} alt="Captured" className="w-full h-full object-contain" />
            )}

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white">
                <X className="w-5 h-5" />
              </button>
              <span className="text-white text-sm font-medium">{label}</span>
              {!captured && (
                <button onClick={flipCamera} className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white">
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
              {captured && <div className="w-10" />}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="bg-black p-6 pb-8 flex items-center justify-center gap-6">
            {!captured ? (
              <button
                onClick={capture}
                className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-400" />
              </button>
            ) : (
              <>
                <button
                  onClick={retake}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-700 text-white text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" /> Ulangi
                </button>
                <button
                  onClick={confirm}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {uploading ? 'Mengupload...' : 'Gunakan Foto'}
                </button>
              </>
            )}
          </div>

          {/* Hidden canvas */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </>
  );
}