import { generateReactHelpers } from "@uploadthing/react";

export const { uploadFiles } = generateReactHelpers({
  url: `${import.meta.env.VITE_SERVER_URL}/api/uploadthing`,
});
