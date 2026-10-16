'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { resolveFileUrl } from '@/lib/api-client';

export default function StationQr({ value, logoUrl, label, onReady }: { value: string; logoUrl?: string | null; label: string; onReady?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  const [error, setError] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let active = true;
    let readinessSent = false;
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    setError(false);
    const finishRendering = () => {
      if (!active || readinessSent) return;
      readinessSent = true;
      onReadyRef.current?.();
    };

    void QRCode.toCanvas(canvas, value, { errorCorrectionLevel: 'H', margin: 2, width: 480 })
      .then(() => {
        if (!active) return;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        if (!logoUrl) {
          finishRendering();
          return;
        }
        const imageUrl = resolveFileUrl(logoUrl);
        if (!imageUrl) {
          finishRendering();
          return;
        }
        const image = new Image();
        image.crossOrigin = 'anonymous';
        const isLocalhost = typeof window !== 'undefined'
          && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const fallbackImageUrl = isLocalhost && logoUrl.startsWith('/uploads/')
          ? `https://api.schoolbase.live${logoUrl}`
          : null;
        let triedFallback = false;
        image.onload = () => {
          if (!active) return;
          const context = canvas.getContext('2d');
          if (!context) {
            finishRendering();
            return;
          }
          const center = canvas.width / 2;
          const badgeSize = canvas.width * 0.24;
          const padding = canvas.width * 0.025;
          const logoSize = badgeSize - padding * 2;
          context.fillStyle = '#ffffff';
          const scale = Math.min(logoSize / image.naturalWidth, logoSize / image.naturalHeight);
          const width = image.naturalWidth * scale;
          const height = image.naturalHeight * scale;
          context.save();
          context.beginPath();
          context.arc(center, center, badgeSize / 2, 0, Math.PI * 2);
          context.fill();
          context.clip();
          context.drawImage(image, center - width / 2, center - height / 2, width, height);
          context.restore();
          finishRendering();
        };
        image.onerror = () => {
          if (fallbackImageUrl && !triedFallback) {
            triedFallback = true;
            image.src = fallbackImageUrl;
            return;
          }
          setError(true);
          finishRendering();
        };
        image.src = imageUrl;
      })
      .catch(() => {
        setError(true);
        finishRendering();
      });

    return () => { active = false; };
  }, [logoUrl, value]);

  return (
    <div className="flex w-full max-w-[260px] flex-col items-center gap-2">
      <div className="station-qr-frame relative aspect-square w-full">
        <canvas ref={canvasRef} role="img" aria-label={label} className="absolute inset-0 h-full w-full" />
      </div>
      {error ? <p role="status" className="text-xs text-amber-800">Code generated; school logo could not be displayed.</p> : null}
    </div>
  );
}
