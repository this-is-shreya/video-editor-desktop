import axios from "axios";

export async function transcribeAudio(audioBlob, setSubtitleMessage) {
  try {
    const formData = new FormData();

    formData.append("audio", audioBlob, "audio.webm");
//     console.log("AUDIO BLOB:", {
//   blob: audioBlob,
//   type: audioBlob?.type,
//   size: audioBlob?.size,
//   constructor: audioBlob?.constructor?.name,
// });

    const response = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/api/transcribe`,

      formData,

      {
        withCredentials: true,
      },
    );

    console.log(response);

    const jobId = response.data.jobId;
    console.log(jobId)
    if (!jobId) {
      console.log("entered here")
      throw new Error("Could not generate subtitles");
    }
    return pollTranscript(jobId, setSubtitleMessage);
  } catch (error) {
    console.log("TRANSCRIBE ERROR");
  console.log("status:", error.response?.status);
  console.log("data:", error.response?.data);
  console.log("headers:", error.response?.headers);
  console.log("message:", error.message);

    throw new Error(error);
  }
}

async function pollTranscript(jobId, setSubtitleMessage) {
  while (true) {
    try {
      // console.log("entered here3")

      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/transcribe/${jobId}`,
        {
          withCredentials: true,
        },
      );
      const job = response.data;
      // console.log("job is: ", job);
      if (job.status === "completed") {
        return job.transcript;
      }

      if (job.status === "failed") {
        // console.log("entered here4")

        throw new Error(job.error);
      }

      setSubtitleMessage((prev) => ({ ...prev, progress: job.progress }));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      // console.log("entered here5")

      throw new Error(error);
    }
  }
}

export async function getBlobFromUrl(blobUrl) {
  const response = await fetch(blobUrl);
  return await response.blob();
}

export async function getAiEdits(screenBlob, cameraBlob, editType) {
  try {
    const formData = new FormData();

    formData.append("screen", screenBlob, "screen.webm");
    if(cameraBlob != null) {
      formData.append("camera", cameraBlob, "camera.webm");
    }

    formData.append("editType", editType);
    
    const response = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/ai/editor`,

      formData,

      {
        withCredentials: true,
      },
    );

    console.log(response);
  } catch (error) {
    console.log("entered here2")

    throw new Error(error);
  }
}