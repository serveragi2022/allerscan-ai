"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import CameraCapture from "./CameraCapture";
import { formatBytes } from "@/lib/image-validation";

// One image slot: empty state with camera/upload buttons, or a preview with
// retake / replace / remove. The parent owns the processed image.
export default function ImagePreview({ id, label, hint, image, busy, disabled, onFile, onClear }) {
  const uploadRef = useRef(null);
  const captureRef = useRef(null);
  const [liveCamera, setLiveCamera] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    setCoarse(window.matchMedia?.("(pointer: coarse)").matches ?? false);
  }, []);

  function openCamera() {
    setCameraMessage("");
    // Phones and tablets: the native camera via a capture input gives the best
    // quality. Desktops: live preview with getUserMedia.
    if (coarse || !navigator.mediaDevices?.getUserMedia) {
      captureRef.current?.click();
    } else {
      setLiveCamera(true);
    }
  }

  function handleInput(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (file) onFile(file);
  }

  const inputProps = {
    type: "file",
    accept: "image/jpeg,image/png,image/webp",
    className: "sr-only",
    tabIndex: -1,
    onChange: handleInput,
    disabled,
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1 text-sm font-semibold text-navy-900">
        {label}
      </p>
      {hint && <p className="mb-2 text-xs text-navy-600">{hint}</p>}

      <input {...inputProps} ref={uploadRef} aria-labelledby={`${id}-label`} data-testid={`${id}-upload`} />
      <input {...inputProps} ref={captureRef} capture="environment" aria-label={`${label}: take photo`} />

      {liveCamera ? (
        <CameraCapture
          onCapture={(file) => {
            setLiveCamera(false);
            onFile(file);
          }}
          onCancel={() => setLiveCamera(false)}
          onError={(msg) => {
            setLiveCamera(false);
            setCameraMessage(msg);
          }}
        />
      ) : image ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.previewUrl}
            alt={`${label} preview`}
            className="max-h-80 w-full bg-slate-100 object-contain"
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-3">
            <span className="mr-auto text-xs text-navy-600">
              {image.width}×{image.height} · {formatBytes(image.blob.size)}
            </span>
            <button type="button" onClick={openCamera} disabled={disabled} className="btn-secondary min-h-[40px] px-3">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Retake
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={disabled}
              className="btn-secondary min-h-[40px] px-3"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Replace
            </button>
            <button type="button" onClick={onClear} disabled={disabled} className="btn-secondary min-h-[40px] px-3">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
          <ImagePlus className="h-8 w-8 text-brand-700" aria-hidden="true" />
          <p className="text-sm text-navy-700" role={busy ? "status" : undefined}>
            {busy ? "Preparing image…" : "JPG, PNG or WebP. Photos are resized on your device before upload."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={openCamera} disabled={disabled || busy} className="btn-primary">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Take photo
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={disabled || busy}
              className="btn-secondary"
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Upload image
            </button>
          </div>
        </div>
      )}

      {cameraMessage && (
        <p role="alert" className="mt-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-950 ring-1 ring-orange-200">
          {cameraMessage}{" "}
          <button type="button" className="font-semibold underline" onClick={() => uploadRef.current?.click()}>
            Upload a photo
          </button>
        </p>
      )}
    </div>
  );
}
