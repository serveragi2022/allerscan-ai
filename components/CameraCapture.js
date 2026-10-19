"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

function describeCameraError(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. Please upload a photo instead.";
    case "NotReadableError":
      return "The camera is in use by another app. Close it and try again, or upload a photo instead.";
    default:
      return "The camera could not be started. Please upload a photo instead.";
  }
}

export default function CameraCapture({ onCapture, onCancel, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError("This browser does not support live camera capture. Please upload a photo instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) onError(describeCameraError(err));
      }
    }
    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // onError is stable enough for a one-time start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          onError("The photo could not be captured. Please try again or upload a photo.");
          return;
        }
        onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-navy-900">
      <div className="relative aspect-[4/3] w-full">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          aria-label="Live camera preview"
        />
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white" role="status">
            Starting camera…
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 bg-navy-900 p-3">
        <button type="button" onClick={capture} disabled={!ready} className="btn-primary">
          <Camera className="h-4 w-4" aria-hidden="true" />
          Capture photo
        </button>
        <button type="button" onClick={onCancel} className="btn bg-white/10 text-white hover:bg-white/20">
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </div>
  );
}
