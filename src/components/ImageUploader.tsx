'use client';

import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
  value?: string;       // Supabase Storage public URL
  onChange: (url: string | undefined) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1200;

function resizeToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > MAX_WIDTH) { height = Math.round(height * MAX_WIDTH / width); width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) { setError('Image must be under 5 MB.'); return; }
    setUploading(true);
    try {
      const blob = await resizeToBlob(file);
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) { setError('Upload failed. Please try again.'); return; }
      const { url } = await res.json() as { url: string };
      onChange(url);
    } catch {
      setError('Failed to process image.');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Question image preview" className="max-h-48 rounded-[6px] object-contain border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)]" />
        <button type="button" onClick={() => onChange(undefined)}
          className="self-start px-4 h-9 text-sm font-bold border-[2px] border-pr-dark rounded-[4px] shadow-[0_2px_8px_rgba(0,0,0,.3)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={`flex flex-col items-center justify-center gap-2 min-h-[120px] rounded-[8px] border-[3px] border-dashed transition-colors touch-manipulation ${dragging ? 'border-pr-pink bg-[#17171b]' : 'border-pr-dark hover:bg-gray-50'} ${uploading ? 'opacity-50' : ''}`}
      >
        <span className="text-2xl">{uploading ? '⏳' : '🖼️'}</span>
        <span className="text-sm font-bold text-gray-500">{uploading ? 'Uploading...' : 'Tap or drop to add image'}</span>
        <span className="text-xs text-gray-400">Max 5 MB</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
    </div>
  );
}
