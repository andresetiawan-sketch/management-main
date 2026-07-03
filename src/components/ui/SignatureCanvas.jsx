import { useRef, useEffect, useState } from 'react';
import { Button } from './button';
import { RotateCcw } from 'lucide-react';

/**
 * SignatureCanvas - digital signature pad
 * Props:
 *   label       - label string
 *   value       - base64 dataURL string (current saved signature)
 *   onChange    - callback(dataURL: string | null)
 */
export default function SignatureCanvas({ label = 'Tanda Tangan', value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const lastPos = useRef(null);

  // Load existing signature
  useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawing(true);
      };
      img.src = value;
    }
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawing(true);
  };

  const endDraw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    setDrawing(false);
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
    onChange(null);
  };

  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-medium text-gray-600">{label}</p>}
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full touch-none cursor-crosshair"
          style={{ height: 120 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasDrawing && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">
            Tanda tangan di sini
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
      >
        <RotateCcw className="w-3 h-3" /> Hapus
      </button>
    </div>
  );
}