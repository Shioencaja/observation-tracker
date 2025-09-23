"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mic, Play, Square, Trash2, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface VoiceQuestionWithStorageProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function VoiceQuestionWithStorage({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
}: VoiceQuestionWithStorageProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [previousAudioUrl, setPreviousAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio URL from value
  useEffect(() => {
    if (value && value.includes("[Audio:")) {
      const audioUrlMatch = value.match(/\[Audio: (.*?)\]/);
      if (audioUrlMatch) {
        const url = audioUrlMatch[1];
        // Store current URL as previous before updating
        setPreviousAudioUrl(audioUrl);
        setAudioUrl(url);
        setHasRecording(true);

        // Test if the URL is accessible
        testAudioUrl(url);
      }
    } else {
      setPreviousAudioUrl(audioUrl);
      setAudioUrl(null);
      setHasRecording(false);
    }
  }, [value, audioUrl]);

  const testAudioUrl = async (url: string) => {
    try {
      await fetch(url, { method: "HEAD" });
      // URL is accessible if response is ok
    } catch {
      // URL is not accessible
    }
  };

  const deletePreviousRecording = async (url: string) => {
    try {
      // Extract filename from URL
      const urlParts = url.split("/");
      const filename = urlParts[urlParts.length - 1];

      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from("voice-recordings")
        .remove([filename]);

      if (error) {
        console.error("Error deleting previous recording:", error);
        // Don't throw error - just log it, as the new recording is more important
      } else {
        console.log("✅ Previous recording deleted:", filename);
      }
    } catch (error) {
      console.error("Error deleting previous recording:", error);
      // Don't throw error - just log it
    }
  };

  const startRecording = async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check for MediaRecorder support
      if (!MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        throw new Error("Audio recording not supported");
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        if (audioBlob.size > 0) {
          // Create temporary URL for immediate playback
          const tempUrl = URL.createObjectURL(audioBlob);
          setAudioUrl(tempUrl);
          setHasRecording(true);

          // Upload to Supabase Storage
          await uploadToStorage(audioBlob);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          alert(
            "Permisos de micrófono denegados. Por favor, permite el acceso al micrófono."
          );
        } else if (error.name === "NotFoundError") {
          alert("No se encontró micrófono. Por favor, conecta un micrófono.");
        } else if (error.name === "NotSupportedError") {
          alert("Grabación de audio no soportada en este navegador.");
        } else {
          alert("Error al acceder al micrófono: " + error.message);
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const uploadToStorage = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);

      // Delete previous recording if it exists
      if (previousAudioUrl) {
        await deletePreviousRecording(previousAudioUrl);
        setPreviousAudioUrl(null);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `voice-${id}-${timestamp}.webm`;

      // Check if bucket exists first
      const { data: buckets, error: bucketsError } =
        await supabase.storage.listBuckets();
      if (bucketsError) {
        throw new Error(`Error listing buckets: ${bucketsError.message}`);
      }

      const voiceRecordingsBucket = buckets.find(
        (bucket) => bucket.name === "voice-recordings"
      );
      if (!voiceRecordingsBucket) {
        throw new Error(
          "Bucket 'voice-recordings' not found. Please create it first."
        );
      }

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("voice-recordings")
        .upload(filename, audioBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-recordings").getPublicUrl(filename);

      // Test the public URL
      await testAudioUrl(publicUrl);

      // Update the value with the public URL
      const newValue = `[Audio: ${publicUrl}]`;
      onChange(newValue);

      // Update local state
      setAudioUrl(publicUrl);
    } catch (error) {
      console.error("Error uploading audio:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert("Error al subir la grabación: " + errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const playRecording = async () => {
    if (!audioUrl || disabled) return;

    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        } else {
          // Test if the audio can be loaded
          const canPlay = await new Promise((resolve) => {
            const testAudio = new Audio();
            testAudio.oncanplaythrough = () => resolve(true);
            testAudio.onerror = () => resolve(false);
            testAudio.src = audioUrl;
            testAudio.load();

            // Timeout after 5 seconds
            setTimeout(() => resolve(false), 5000);
          });

          if (canPlay) {
            await audioRef.current.play();
            setIsPlaying(true);
          } else {
            alert(
              "No se puede reproducir el audio. Verifica que la URL sea correcta."
            );
          }
        }
      } catch (error) {
        console.error("Playback error:", error);
        alert(
          "Error al reproducir el audio: " +
            (error instanceof Error ? error.message : "Unknown error")
        );
      }
    }
  };

  const clearRecording = async () => {
    if (disabled) return;

    // Delete current recording from storage if it exists
    if (audioUrl) {
      await deletePreviousRecording(audioUrl);
    }

    setAudioUrl(null);
    setHasRecording(false);
    setRecordingTime(0);
    onChange("");

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <Label htmlFor={id} className="text-sm font-medium">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* Audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
          }}
          onError={(e) => {
            console.error("Audio playback error:", e);
            setIsPlaying(false);
          }}
          preload="metadata"
          controls
        />
      )}

      {/* Recording Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            disabled={disabled || isUploading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Mic className="h-4 w-4" />
            {hasRecording ? "Regrabar" : "Grabar"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Parar ({formatTime(recordingTime)})
          </Button>
        )}

        {hasRecording && (
          <>
            <Button
              type="button"
              onClick={playRecording}
              disabled={disabled || isUploading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isPlaying ? "Parar" : "Reproducir"}
            </Button>

            <Button
              type="button"
              onClick={clearRecording}
              disabled={disabled || isUploading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar
            </Button>
          </>
        )}

        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Subiendo...
          </div>
        )}
      </div>

      {/* Status Display */}
      {hasRecording && (
        <div className="text-sm text-green-700 font-medium flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Audio grabado - Usa el botón "Reproducir" para escuchar
        </div>
      )}

      {/* Instructions */}
      <p className="text-xs text-gray-500">
        Haz clic en "Grabar" para comenzar la grabación. El audio se subirá
        automáticamente a la nube.
      </p>
    </div>
  );
}
