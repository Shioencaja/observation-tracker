# Supabase Storage Setup for Voice Recordings

## Overview

This guide shows how to set up Supabase Storage to store voice recordings so they can be accessed from any device.

## Step 1: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `voice-recordings`
   - **Public**: ✅ **Yes** (so audio files can be accessed via URL)
   - **File size limit**: `50MB` (adjust as needed)
   - **Allowed MIME types**: `audio/webm,audio/wav,audio/mp3`

## Step 2: Set Up RLS Policies

Create Row Level Security policies for the storage bucket:

### Policy 1: Allow authenticated users to upload

```sql
CREATE POLICY "Allow authenticated users to upload voice recordings" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'voice-recordings'
  AND auth.role() = 'authenticated'
);
```

### Policy 2: Allow authenticated users to read

```sql
CREATE POLICY "Allow authenticated users to read voice recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'voice-recordings'
  AND auth.role() = 'authenticated'
);
```

### Policy 3: Allow users to delete their own files

```sql
CREATE POLICY "Allow users to delete their own voice recordings" ON storage.objects
FOR DELETE USING (
  bucket_id = 'voice-recordings'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 3: Update Your Code

### Option A: Replace VoiceQuestion Component

Replace the import in your question renderer:

```tsx
// Old
import VoiceQuestion from "@/components/questions/VoiceQuestion";

// New
import VoiceQuestionWithStorage from "@/components/questions/VoiceQuestionWithStorage";
```

### Option B: Update Existing VoiceQuestion

If you prefer to update the existing component, add these functions:

```tsx
const uploadToStorage = async (audioBlob: Blob) => {
  try {
    setIsUploading(true);

    const timestamp = Date.now();
    const filename = `voice-${id}-${timestamp}.webm`;

    const { data, error } = await supabase.storage
      .from("voice-recordings")
      .upload(filename, audioBlob, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("voice-recordings").getPublicUrl(filename);

    onChange(`[Audio: ${publicUrl}]`);
  } catch (error) {
    console.error("Error uploading audio:", error);
    alert("Error al subir la grabación");
  } finally {
    setIsUploading(false);
  }
};
```

## Step 4: Test the Setup

1. **Record a voice note** in your application
2. **Check Supabase Storage** - you should see the file in the `voice-recordings` bucket
3. **Copy the public URL** and test it in another browser/device
4. **Verify playback** works on different devices

## Benefits of This Approach

✅ **Cross-device access** - Audio files work on any device
✅ **Persistent storage** - Files don't disappear on refresh
✅ **Shareable URLs** - Can be shared with team members
✅ **Scalable** - Supabase handles the infrastructure
✅ **Secure** - RLS policies control access
✅ **CDN delivery** - Fast loading from global edge locations

## File URL Format

After upload, your audio files will have URLs like:

```
https://your-project.supabase.co/storage/v1/object/public/voice-recordings/voice-question-123-1703123456789.webm
```

## Storage Costs

- **Free tier**: 1GB storage, 2GB bandwidth/month
- **Pro tier**: $0.021/GB storage, $0.09/GB bandwidth
- **Voice files**: Typically 100KB-1MB each

## Troubleshooting

### Upload fails

- Check RLS policies are correct
- Verify bucket is public
- Check file size limits

### Playback fails

- Verify public URL is accessible
- Check CORS settings
- Ensure audio format is supported

### Permission denied

- User must be authenticated
- Check RLS policies
- Verify bucket permissions

## Migration from Blob URLs

If you have existing blob URL data, you can migrate it:

```tsx
const migrateBlobToStorage = async (blobUrl: string) => {
  try {
    // Fetch the blob
    const response = await fetch(blobUrl);
    const blob = await response.blob();

    // Upload to storage
    await uploadToStorage(blob);

    // Clean up blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Migration failed:", error);
  }
};
```
