"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Video, X } from "lucide-react";
import type { MediaItem } from "@/types/api";
import { useToast } from "@/components/ui/toast";

export function MediaUploader({
  media,
  onChange,
}: {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          showToast("error", data.error || `Failed to upload ${file.name}`);
          continue;
        }
        onChange([...media, data.media]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeMedia(item: MediaItem) {
    onChange(media.filter((m) => m.id !== item.id));
    await fetch(`/api/media/${item.id}`, { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-muted py-8 text-center hover:border-primary/50"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">Images or videos, up to 200MB</p>
      </div>

      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted">
              {item.type === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Video className="h-6 w-6" />
                  <span className="px-1 text-[10px] truncate max-w-full">{item.filename}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeMedia(item)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
