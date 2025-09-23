"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VoiceRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: string;
  name?: string;
}

interface VoiceQuestionProps {
  question: {
    id: string;
    name: string;
    description?: string | null;
  };
  response: VoiceRecording[] | string;
  canAddObservations: boolean;
  onResponseChange: (
    questionId: string,
    value: VoiceRecording[] | string
  ) => void;
}

export default function VoiceQuestion({
  question,
  response,
  canAddObservations,
  onResponseChange,
}: VoiceQuestionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const recordingDurationRef = useRef<number>(0);

  // Initialize recordings from response
  useEffect(() => {
    if (Array.isArray(response)) {
      // Check if this is loaded from database (has base64) or from memory (has blob)
      const processedRecordings = response.map((recording: any) => {
        if (recording.base64 && !recording.blob) {
          // Convert base64 back to blob for playback
          const byteCharacters = atob(recording.base64.split(",")[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "audio/webm" });
          const url = URL.createObjectURL(blob);

          return {
            ...recording,
            blob,
            url,
          };
        }
        return recording;
      });
      setRecordings(processedRecordings);
    } else if (typeof response === "string" && response) {
      try {
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) {
          // Process base64 recordings from database
          const processedRecordings = parsed.map((recording: any) => {
            if (recording.base64 && !recording.blob) {
              const byteCharacters = atob(recording.base64.split(",")[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: "audio/webm" });
              const url = URL.createObjectURL(blob);

              return {
                ...recording,
                blob,
                url,
              };
            }
            return recording;
          });
          setRecordings(processedRecordings);
        }
      } catch {
        // If parsing fails, treat as empty array
        setRecordings([]);
      }
    } else {
      setRecordings([]);
    }
  }, [response]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Clean up audio URLs
      recordings.forEach((recording) => {
        if (recording.url) {
          URL.revokeObjectURL(recording.url);
        }
      });
    };
  }, []);

  const startRecording = async () => {
    if (!canAddObservations) return;

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Use the ref value which won't be reset until after this callback
        const finalDuration = recordingDurationRef.current;

        const newRecording: VoiceRecording = {
          id: Date.now().toString(),
          blob: audioBlob,
          url: audioUrl,
          duration: finalDuration,
          timestamp: new Date().toISOString(),
        };

        const updatedRecordings = [...recordings, newRecording];
        setRecordings(updatedRecordings);
        onResponseChange(question.id, updatedRecordings);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingDurationRef.current = 0;

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingTime(recordingDurationRef.current);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const playRecording = (recordingId: string) => {
    const audio = audioRefs.current[recordingId];
    if (audio) {
      if (isPlaying === recordingId) {
        audio.pause();
        setIsPlaying(null);
      } else {
        // Stop any currently playing audio
        Object.values(audioRefs.current).forEach((a) => {
          if (a && !a.paused) {
            a.pause();
          }
        });

        audio.currentTime = 0;
        audio.play();
        setIsPlaying(recordingId);
      }
    }
  };

  const deleteRecording = (recordingId: string) => {
    if (!canAddObservations) return;

    const updatedRecordings = recordings.filter((r) => r.id !== recordingId);
    setRecordings(updatedRecordings);
    onResponseChange(question.id, updatedRecordings);

    // Clean up URL
    const recording = recordings.find((r) => r.id === recordingId);
    if (recording?.url) {
      URL.revokeObjectURL(recording.url);
    }

    // Stop playing if this recording was playing
    if (isPlaying === recordingId) {
      setIsPlaying(null);
    }
  };

  const downloadRecording = (recording: VoiceRecording) => {
    const link = document.createElement("a");
    link.href = recording.url;
    link.download = `grabacion_${recording.timestamp.split("T")[0]}_${
      recording.id
    }.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Recording Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <Button
              type="button"
              onClick={startRecording}
              disabled={!canAddObservations}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic size={16} className="mr-2" />
              Grabar
            </Button>
          ) : (
            <Button
              type="button"
              onClick={stopRecording}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              <Square size={16} className="mr-2" />
              Detener
            </Button>
          )}
        </div>

        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">
              Grabando... {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Grabaciones ({recordings.length})
          </h4>
          <div className="space-y-2">
            {recordings.map((recording) => (
              <Card key={recording.id} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => playRecording(recording.id)}
                        className="flex-shrink-0"
                      >
                        {isPlaying === recording.id ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </Button>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          Grabación {recording.id.slice(-4)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(recording.timestamp)} •{" "}
                          {formatTime(recording.duration)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadRecording(recording)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecording(recording.id)}
                          disabled={!canAddObservations}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Hidden audio element for playback */}
                  <audio
                    ref={(el) => {
                      audioRefs.current[recording.id] = el;
                    }}
                    src={recording.url}
                    onEnded={() => setIsPlaying(null)}
                    onPause={() => setIsPlaying(null)}
                    preload="metadata"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recordings.length === 0 && !isRecording && (
        <div className="text-center py-8 text-gray-500">
          <Mic size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay grabaciones aún</p>
          <p className="text-xs">Haz clic en "Grabar" para comenzar</p>
        </div>
      )}
    </div>
  );
}
