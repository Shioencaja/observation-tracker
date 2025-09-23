"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Play, Square, Trash2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceQuestionProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function VoiceQuestion({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
}: VoiceQuestionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [transcript, setTranscript] = useState(value || "");
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the onChange callback to prevent infinite loops
  const handleTranscriptChange = useCallback(
    (newTranscript: string) => {
      setTranscript(newTranscript);
      onChange(newTranscript);
    },
    [onChange]
  );

  // Initialize transcript from value and extract audio URL
  useEffect(() => {
    if (value && value !== transcript) {
      setTranscript(value);

      // Check if the value contains an audio URL
      const audioUrlMatch = value.match(/\[Audio: (.*?)\]/);
      if (audioUrlMatch) {
        const audioUrl = audioUrlMatch[1];
        setHasRecording(true);

        // Set up the audio element for playback
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }
      } else if (value.trim()) {
        // If there's text but no audio URL, it might be a text-only response
        setHasRecording(false);
      }
    }
  }, [value]);

  const startRecording = async () => {
    try {
      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Grabación de audio no soportada en este navegador");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        console.warn("WebM with Opus not supported, trying default format");
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });

        // Check if the blob has content
        if (audioBlob.size > 0) {
          try {
            const audioUrl = URL.createObjectURL(audioBlob);

            // Store the audio URL in the transcript
            const newTranscript = transcript + `\n[Audio: ${audioUrl}]`;
            handleTranscriptChange(newTranscript);
            setHasRecording(true);

            // Set the audio source for playback
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
            }
          } catch (error) {
            console.error("Error creating audio URL:", error);
            // Fallback: just add a note about the recording
            const newTranscript =
              transcript +
              `\n[Audio grabado - ${new Date().toLocaleTimeString()}]`;
            handleTranscriptChange(newTranscript);
            setHasRecording(true);
          }
        } else {
          console.warn("No audio data recorded");
          // Fallback: just add a note about the recording attempt
          const newTranscript =
            transcript +
            `\n[Intento de grabación - ${new Date().toLocaleTimeString()}]`;
          handleTranscriptChange(newTranscript);
        }

        // Clean up the stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      let errorMessage = "No se pudo acceder al micrófono.";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Permisos de micrófono denegados. Por favor, permite el acceso al micrófono y recarga la página.";
        } else if (error.name === "NotFoundError") {
          errorMessage =
            "No se encontró ningún micrófono. Verifica que tengas un micrófono conectado.";
        } else if (error.name === "NotSupportedError") {
          errorMessage =
            "Grabación de audio no soportada en este navegador. Intenta con Chrome o Firefox.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      // If no src is set, try to extract it from the transcript
      if (!audioRef.current.src) {
        const audioUrlMatch = transcript.match(/\[Audio: (.*?)\]/);
        if (audioUrlMatch) {
          audioRef.current.src = audioUrlMatch[1];
        }
      }

      if (audioRef.current.src) {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          alert(
            "No se pudo reproducir el audio. El archivo de audio puede haber expirado o ser inválido."
          );
          setIsPlaying(false);
        });
        setIsPlaying(true);
      } else {
        alert("No hay audio grabado para reproducir.");
      }
    } else {
      alert("No hay audio grabado para reproducir.");
    }
  };

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearRecording = () => {
    handleTranscriptChange("");
    setHasRecording(false);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.src = "";
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* Recording Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={disabled}
          >
            <Mic size={16} className="mr-2" />
            Grabar
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={disabled}
          >
            <MicOff size={16} className="mr-2" />
            Parar
          </Button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {hasRecording && (
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <Button
                type="button"
                onClick={playRecording}
                size="sm"
                variant="outline"
                className="border-green-300 text-green-600 hover:bg-green-50"
                disabled={disabled}
              >
                <Play size={16} className="mr-1" />
                Reproducir
              </Button>
            ) : (
              <Button
                type="button"
                onClick={stopPlaying}
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                disabled={disabled}
              >
                <Square size={16} className="mr-1" />
                Parar
              </Button>
            )}

            <Button
              type="button"
              onClick={clearRecording}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              disabled={disabled}
            >
              <Trash2 size={16} className="mr-1" />
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {/* Audio Status Display */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Estado del Audio:</Label>
        <div className="min-h-[60px] p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
          {hasRecording ? (
            <div className="text-sm text-green-700 font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Audio grabado - Usa el botón "Reproducir" para escuchar
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">
              No hay audio grabado. Usa el botón de grabar para añadir audio.
            </div>
          )}
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
