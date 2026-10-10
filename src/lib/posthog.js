import posthog from "posthog-js";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  person_profiles: "identified_only", // optional but cleaner
  capture_pageview: true, // auto track page views
  session_recording: {
    maskAllInputs: false, // set true if sensitive data
  },
});

export default posthog;
