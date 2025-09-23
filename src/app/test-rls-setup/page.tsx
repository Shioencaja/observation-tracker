"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  Trash2,
} from "lucide-react";

export default function TestRLSSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const [isTesting, setIsTesting] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setDebugLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testRLSSetup = async () => {
    setIsTesting(true);
    setError(null);
    setDebugLogs([]);

    try {
      addLog("🔍 Testing RLS setup for voice-recordings bucket...");

      if (authLoading) {
        addLog("⏳ Authentication still loading...");
        return;
      }

      if (!user) {
        throw new Error("No authenticated user found. Please log in first.");
      }

      addLog(`👤 Testing as: ${user.email} (${user.id})`);

      // Test 1: List buckets
      addLog("📦 Testing bucket listing...");
      const { data: buckets, error: bucketsError } =
        await supabase.storage.listBuckets();

      if (bucketsError) {
        addLog(`❌ Bucket listing failed: ${bucketsError.message}`);
        throw new Error(`Bucket listing failed: ${bucketsError.message}`);
      }

      addLog(`✅ Found ${buckets.length} buckets`);
      addLog(`📋 Buckets: ${buckets.map((b) => b.name).join(", ")}`);

      // Check for voice-recordings bucket
      const voiceRecordingsBucket = buckets.find(
        (bucket) => bucket.name === "voice-recordings"
      );

      if (!voiceRecordingsBucket) {
        addLog("❌ voice-recordings bucket not found");
        throw new Error("voice-recordings bucket not found");
      }

      addLog(
        `✅ voice-recordings bucket found: ${JSON.stringify(
          voiceRecordingsBucket,
          null,
          2
        )}`
      );

      // Test 2: List files in bucket
      addLog("📁 Testing file listing...");
      const { data: files, error: filesError } = await supabase.storage
        .from("voice-recordings")
        .list("", { limit: 10 });

      if (filesError) {
        addLog(`❌ File listing failed: ${filesError.message}`);
        addLog(`❌ Error details: ${JSON.stringify(filesError, null, 2)}`);
        throw new Error(`File listing failed: ${filesError.message}`);
      }

      addLog(`✅ File listing successful. Found ${files.length} files`);
      if (files.length > 0) {
        addLog(`📄 Files: ${files.map((f) => f.name).join(", ")}`);
      }

      // Test 3: Upload a test file
      addLog("📤 Testing file upload...");
      const testBlob = new Blob(["test audio content"], { type: "audio/webm" });
      const testFilename = `test-${Date.now()}.webm`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("voice-recordings")
        .upload(testFilename, testBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        addLog(`❌ Upload failed: ${uploadError.message}`);
        addLog(
          `❌ Upload error details: ${JSON.stringify(uploadError, null, 2)}`
        );
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      addLog(`✅ Upload successful: ${JSON.stringify(uploadData, null, 2)}`);

      // Test 4: Get public URL
      addLog("🔗 Testing public URL generation...");
      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-recordings").getPublicUrl(testFilename);

      addLog(`✅ Public URL: ${publicUrl}`);

      // Test 5: Test file access
      addLog("🔍 Testing file access...");
      try {
        const response = await fetch(publicUrl, { method: "HEAD" });
        if (response.ok) {
          addLog(`✅ File accessible via public URL (${response.status})`);
        } else {
          addLog(`⚠️ File not accessible via public URL (${response.status})`);
        }
      } catch (fetchError) {
        addLog(
          `⚠️ File access test failed: ${
            fetchError instanceof Error ? fetchError.message : "Unknown error"
          }`
        );
      }

      // Test 6: Delete test file
      addLog("🗑️ Testing file deletion...");
      const { error: deleteError } = await supabase.storage
        .from("voice-recordings")
        .remove([testFilename]);

      if (deleteError) {
        addLog(`⚠️ Delete failed: ${deleteError.message}`);
      } else {
        addLog(`✅ Test file deleted successfully`);
      }

      addLog("🎉 RLS setup test completed successfully!");
    } catch (err) {
      console.error("❌ RLS setup test failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      addLog(`❌ FINAL ERROR: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RLS Setup Test
          </h1>
          <p className="text-gray-600">
            Test the voice-recordings bucket RLS policies and permissions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>RLS Setup Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={testRLSSetup}
              disabled={isTesting || authLoading}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing RLS Setup...
                </>
              ) : authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Authentication...
                </>
              ) : (
                "Test RLS Setup"
              )}
            </Button>

            {/* Authentication Status */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">
                Authentication Status:
              </h4>
              <div className="text-sm text-blue-700">
                {authLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : user ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Logged in as: {user.email}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Not logged in - Please log in first
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-1">Error:</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Debug Logs */}
            {debugLogs.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Debug Logs:</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
                  {debugLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">
                Instructions:
              </h4>
              <ol className="text-sm text-yellow-700 space-y-1">
                <li>
                  1. Run the SQL scripts in your Supabase SQL Editor first
                </li>
                <li>2. Make sure you're logged in to the application</li>
                <li>3. Click "Test RLS Setup" to verify everything works</li>
                <li>
                  4. If this test passes, voice recording should work in the app
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
