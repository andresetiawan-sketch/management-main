import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

export default function QRCodeCanvas({ text, size = 150, showLogo = false, dataAttr = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    const canvas = canvasRef.current;

    // errorCorrectionLevel H = 30% damage tolerance → cukup untuk logo 20% tengah
    QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    }, (err) => {
      if (err || !showLogo) return;
      // Overlay logo di tengah setelah QR selesai di-render
      const ctx = canvas.getContext('2d');
      const logoSize = Math.round(size * 0.22);
      const logoX = Math.round((size - logoSize) / 2);
      const logoY = Math.round((size - logoSize) / 2);
      const padding = 4;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // White rounded background behind logo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const r = 6;
        const bx = logoX - padding, by = logoY - padding;
        const bw = logoSize + padding * 2, bh = logoSize + padding * 2;
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        ctx.lineTo(bx + r, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();
        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
      };
      img.src = LOGO_URL;
    });
  }, [text, size, showLogo]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded" data-qr={dataAttr} />;
}