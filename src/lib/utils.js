import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// camera = 1
// screen = 2
// text = 3
// image = 4
// audio = 5
// effect = 6

export const emailTypes = Object.freeze({
    BULK_EMAIL:"Bulk email",
    SINGLE_EMAIL:"Single email"
})

const ffmpeg = new FFmpeg();

export async function splitAudioFast(
  blobUrl,
  setIsSplittingAudio,
  filename = "audio.wav",
) {
  let inputName, outputName;

  try {
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }

    if (!blobUrl) {
      throw new Error("No video source found");
    }

    setIsSplittingAudio(true);

    const videoData = await fetchFile(blobUrl);

    // Unique names to avoid FS conflicts
    const id = Date.now();
    inputName = blobUrl.includes("webm")
      ? `input_${id}.webm`
      : `input_${id}.mp4`;

    outputName = `output_${id}.wav`;

    await ffmpeg.writeFile(inputName, videoData);

    await ffmpeg.exec([
      "-i",
      inputName,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "44100",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);

    const blob = new Blob([data.buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } catch (error) {
    console.log("FFmpeg error:", error);
  } finally {
    // Safe cleanup
    try {
      if (inputName) await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      if (outputName) await ffmpeg.deleteFile(outputName);
    } catch {}

    setIsSplittingAudio(false);
  }
}
export async function combineAndDownload(
  blobs,
  toast,
  filename = "export.webm",
) {
  const finalBlob = await combine(blobs, toast);
    // download
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Export completed!", { duration: 3000 });
    return finalBlob;
}

export async function combine(blobs, toast) {
  let videoName, audioName, outputName;
  toast.success("Combining video and audio, please wait...", { duration: 3000 });
  try {
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }

    if (!blobs.video || !blobs.audio) {
      throw new Error("Missing video or audio blob");
    }

    const id = Date.now();

    videoName = `video_${id}.webm`;
    audioName = `audio_${id}.webm`;
    outputName = `output_${id}.webm`;
console.log("Video blob size:", blobs.video.size);
console.log("Audio blob size:", blobs.audio.size);
    // write blobs
    await ffmpeg.writeFile(videoName, await fetchFile(blobs.video));
    await ffmpeg.writeFile(audioName, await fetchFile(blobs.audio));
    const watermark = await fetchFile("/watermark.png");
    console.log("fetched: ", watermark)
    await ffmpeg.writeFile("watermark.png", watermark);
    toast.success("Merging video and audio, please wait...", { duration: 3000 });
    // 🔥 WEBM merge (NO re-encoding)
    await ffmpeg.exec([
      "-i",
      videoName,
      "-i",
      audioName,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-shortest",
      outputName,
    ]);
    // await ffmpeg.exec([
    //   "-i",
    //   videoName,
    //   "-i",
    //   audioName,
    //   "-i",
    //   "watermark.png",

    //   "-filter_complex",
    //   "overlay=W-w-30:H-h-30",

    //   "-map",
    //   "0:v:0",
    //   "-map",
    //   "1:a:0",

    //   "-c:v",
    //   "libvpx",
    //   "-deadline",
    //   "realtime",
    //   "-cpu-used",
    //   "8", // 0 (best/slowest) to 16 (fastest); 6-8 is a good speed/quality tradeoff
    //   "-b:v",
    //   "2M", // explicit bitrate avoids libvpx's slower default rate-control passes
    //   "-c:a",
    //   "copy",

    //   "-shortest",
    //   outputName,
    // ]);
    const data = await ffmpeg.readFile(outputName);

    const finalBlob = new Blob([data.buffer], {
      type: "video/webm",
    });
    return finalBlob;
  } catch (error) {
    console.log("FFmpeg merge error:", error);
    toast.error("Export failed. Please try again later.", { duration: 3000 });
    throw error;
  } finally {
    try {
      if (videoName) await ffmpeg.deleteFile(videoName);
    } catch {}
    try {
      if (audioName) await ffmpeg.deleteFile(audioName);
    } catch {}
    try {
      if (outputName) await ffmpeg.deleteFile(outputName);
    } catch {}
  }
}
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
