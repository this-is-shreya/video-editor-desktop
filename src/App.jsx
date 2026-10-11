import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import ZoomBox from "./ZoomBox";
import TrackElement from "./TrackElement";
import Layer from "./Layer";
import RecordRTC from "recordrtc";
import SidebarButton from "./Sidebar";
import {
  Play,
  Pause,
  Trash2,
  Scissors,
  Palette,
  ZoomIn,
  Settings,
  Download,
  ImageIcon,
  ArrowBigLeft,
  TextIcon,
  Repeat,
  File,
  Trash,
  Undo,
  Redo,
  StarIcon,
  Save,
  Sparkles,
  X,
  CrownIcon,
  CaptionsIcon,
  CameraIcon,
  ArrowUpLeft,
  MousePointer,
  LogOutIcon,
} from "lucide-react";
import IconButton from "./IconButton";
import "./lib/posthog";
import posthog from "./lib/posthog";
import {
  drawBasicText,
  drawBlurReveal,
  drawKineticWords,
  drawMarkerHighlight,
  drawParticleBurst,
  drawScrambleText,
  drawShatterExplode,
  drawTypewriter,
  drawTypingGradient,
  drawWordSlam,
  textTypes,
} from "./lib/text";
import {
  drawBlockWipe,
  drawClockWipeReveal,
  drawFadeIn,
  drawFilmBurn,
  drawFlashWhite,
  drawPixelDissolveReveal,
  drawRadialReveal,
  drawRGBGlitch,
  drawSlideWipe,
  drawTransition,
  drawVenetianBlindsReveal,
  transitionTypes,
} from "./lib/transitions";
import toast, { Toaster } from "react-hot-toast";
import SpotlightBox from "./Spotlight";
import Joyride from "./Joyride";
// import FeatureDialog from "./FeatureDialog";
import { combine, combineAndDownload, splitAudioFast } from "./lib/utils";
import { uploadFiles } from "./lib/uploadthing";
import {
  calculateScale,
  drawBlobPopCard,
  drawCinematicBars,
  drawConfettiTitleCard,
  drawCuteScrapbookCard,
  drawGithubLowerThird,
  drawGlassCard,
  drawLetterBlurFocusCard,
  drawLinkedInLowerThird,
  drawLowerThirdLine,
  drawLowerThirdSlide,
  drawNeonFrameCard,
  drawParticleBurstCard,
  drawPinkBubbleCard,
  drawRetroScanCard,
  drawSpotlightReveal,
  lowerThirdTypes,
  titleCardTypes,
} from "./lib/elements";
import {
  addToIndexedDB,
  clearIndexedDB,
  getFromIndexedDB,
} from "./lib/indexedDB";
import { FX_NAMES, initFXRenderer, initOGLTiltRenderer, renderFilmDamage, renderFX, renderOldFilm, renderPolaroid, renderTiltedVideo, renderVHS } from "./lib/ogl";
import './App.css'
import { useApp } from "./AppContext";
import LoginDialog from "./LoginDialog";
import PricingCard from "./PricingCard";
import { removeVideoBackground } from "./lib/background";
import SubtitleEditor from "./SubtitleEditor";
import { transcribeAudio } from "./lib/subtitle";
import CursorPanel from "./CursorPanel";
import RecordPanel from "./RecordPanel";
import { loadCursorStyle, saveCursorStyle } from "./lib/cursor/overlay";
import {
  getScreenMapping,
  getCursorCamera,
  drawCursorForCamera,
} from "./lib/cursor/cursorCamera";
import { drawCursorZoomFrame } from "./lib/cursor/zoomFrame";
import { cursorSegmentsToZooms, overlapsExisting, cursorTrackToOverlay } from "./lib/cursor/convert";

const App = () => {
  const { user, refreshUser, logout } = useApp();
  const canvasRef = useRef(null);
  const videoRefs = useRef({});
  const imageRefs = useRef({});
  const watermarkRef = useRef(null);
  const rafRef = useRef(null);
  const timelineLastTimeRef = useRef(null);
  const renderLastTimeRef = useRef(null);
  const undoArray = useRef([]);
  const pointer = useRef(0);
  const MAX_UNDO_ARRAY_LENGTH = 20;
  const [cursorStyle, setCursorStyle] = useState(loadCursorStyle);
  useEffect(() => saveCursorStyle(cursorStyle), [cursorStyle]);
  const [cursorTracks, setCursorTracks] = useState({});
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // start inside first clip
  const [playheadPosition, setPlayHeadPosition] = useState(0);
  const activeVideoIdRef = useRef(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [zoomSelected, setZoomSelected] = useState(null);
  const [zooms, setZooms] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [originalTranscript, setOriginalTranscript] = useState([]);
  const [displaySubtitles, setDisplaySubtitles] = useState(false);
  const [subtitlePosition, setSubtitlePosition] = useState("bottom");
  const [subtitlesGenerationMessage, setSubtitlesGenerationMessage] = useState({message:"", progress:0});
  const isSubtitleGeneratingRef = useRef(false);
  const FILLER_WORDS = new Set([
    "um",
    "uh",
    "erm",
    "hmm",
    "like",
    "actually",
    "basically",
    "literally",
    "you know",
    "i mean",
  ]);
  const [isCrop, setIsCrop] = useState(false);
  const [isSplittingAudio, setIsSplittingAudio] = useState(false);
  const [activeOption, setActiveOption] = useState("files");
  const [isExport, setIsExport] = useState(false);
  const isBackgroundRemoval = useRef(false);
  const [bgRemovalVideoEndTime, setBgRemovalVideoEndTime] = useState(0);
  const [backgroundRemovalMessage, setBackgroundRemovalMessage] = useState("");
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [trackSelector, setTrackSelector] = useState(null);
  const [exportBlob, setExportBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareableLink, setShareableLink] = useState("");
  const [selection, setSelection] = useState({
    type: "titleCard",
    variant: titleCardTypes.RETRO_SCAN_CARD,
  });
  const isZoomChainingRef = useRef(false);
  const [selectedTilt, setSelectedTilt] = useState("tiltnone");
  const [selectedVideoEffect, setSelectedVideoEffect] = useState("whip");
  const [speedValue, setSpeedValue] = useState(selectedElement?.speed || 1);
  // trackSelector = { file, position }
  const [textAnimation, setTextAnimation] = useState(textTypes.BLUR_REVEAL);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const SCALE = 10;
  const [hasSavedData, setHasSavedData] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const isNotPaidUser =
    user === null ||
    user.isLoggedIn === null ||
    !user.isLoggedIn ||
    user.isPaid === null ||
    !user.isPaid;
  // console.log(user)
  // const DISPLAY_WIDTH = 720;
  // const DISPLAY_HEIGHT = 405;
  // const CANVAS_WIDTH = 1920;
  // const CANVAS_HEIGHT = 1080;
  // const PIXEL_RATIO = 2; // or window.devicePixelRatio
  // const renderScaleX = CANVAS_WIDTH / DISPLAY_WIDTH;
  // const renderScaleY = CANVAS_HEIGHT / DISPLAY_HEIGHT;
  const {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    renderScaleX,
    renderScaleY,
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT,
  } = calculateScale(aspectRatio);
  const startTour = useRef(false);
  const tourName = useRef("hasVisitedIntroTour");
  const [steps, setSteps] = useState([
    {
      element: ".preview",
      popover: {
        title: "Preview",
        description: "This is your video preview.",
      },
    },
    {
      element: ".timeline",
      popover: {
        title: "Timeline",
        description: "Arrange clips here.",
      },
    },
    {
      element: ".navbar",
      popover: {
        title: "Navbar",
        description: "All your editing tools.",
      },
    },
  ]);

  const SUBTITLE_STYLES = {
    whiteNoBg: { text: "#FFF", stroke: "#000", bg: null },
    yellowNoBg: { text: "#FFD400", stroke: "#000", bg: null },
    whiteOnBlack: { text: "#FFF", stroke: null, bg: "#000" },
    blackOnWhite: { text: "#111", stroke: null, bg: "#FFF" },
    highlightBg: {
      activeBg: "#f119d9",
      activeText: "#fff",
      text: "#FFF",
      stroke: "#000",
      lineBg: null,
      styleType: "highlight",
    }, // yellow box on active word
    highlightNoBg: {
      activeBg: null,
      activeText: "#192cf1",
      text: "#FFF",
      stroke: "#000",
      lineBg: null,
      styleType: "highlight",
    }, // active word just turns yellow
  };
  const [subtitleStyle, setSubtitleStyle] = useState(
    SUBTITLE_STYLES.blackOnWhite,
  );

  const WORDS_PER_LINE = 5;

  // Build once (e.g. inside a useMemo keyed on `transcript`) — NOT every frame.
  function buildSubtitleChunks(transcript, size = WORDS_PER_LINE) {
    const visibleWords = transcript.filter((w) => !w.isFiller && !w.deleted);
    const chunks = [];
    for (let i = 0; i < visibleWords.length; i += size) {
      chunks.push(visibleWords.slice(i, i + size));
    }
    return chunks;
  }

  const subtitleChunks = useMemo(
    () => buildSubtitleChunks(transcript),
    [transcript],
  );

  const startElementTour = (newElement) => {
    if (localStorage.getItem("hasVisitedElementTour") === "true") return;

    const elementSelector = `[id="${newElement.id}"]`;
    // console.log(">> now for ", elementSelector);

    const waitForElement = setInterval(() => {
      if (document.querySelector(elementSelector)) {
        clearInterval(waitForElement);

        setSteps([
          {
            element: elementSelector,
            popover: {
              title: "Select an element",
              description: "Click on the element to select it.",
            },
          },
          {
            element: elementSelector,
            popover: {
              title: "Deselect an element",
              description: "Double click on the element to deselect it.",
            },
          },
        ]);

        tourName.current = "hasVisitedElementTour";

        setTimeout(() => {
          startTour.current = true;
        }, 100);
      }
    }, 100);
  };
  const backgrounds = [
    "1.jpg",
    "2.jpg",
    "3.jpg",
    "4.jpeg",
    "5.jpeg",
    "6.jpg",
    "7.jpeg",
    "8.jpeg",
    "9.jpeg",
    "10.jpeg",
    "11.jpg",
    "12.jpg",
    "13.jpg",
    "14.jpg",
    "15.jpg",
    "16.jpg",
    "17.jpg",
    "18.jpg",
    "19.jpg",
    "20.jpg",
  ];
  // const tilts = {
  //   tilt1: { rotateX: 6, rotateY: -32, scale: 0.88 },
  //   tilt2: { rotateX: -45, rotateY: 70, scale: 0.82 },
  //   tilt3: { rotateX: 16, rotateY: -32, scale: 0.88 },
  //   tilt4: { rotateX: -15, rotateY: 42, scale: 0.83 },
  // };
  const tilts = {
    // cinematic slight left perspective
    tilt1: {
      rotateX: 0.04,
      rotateY: -0.42,
      scale: 1,
      depth: 0.12,
    },

    // aggressive dramatic angle
    tilt2: {
      rotateX: -0.12,
      rotateY: 0.72,
      scale: 1,
      depth: 0.22,
    },

    // subtle shots.so style
    tilt3: {
      rotateX: 0.08,
      rotateY: -0.28,
      scale: 1,
      depth: 0.08,
    },

    // right-side cinematic
    tilt4: {
      rotateX: -0.06,
      rotateY: 0.38,
      scale: 1,
      depth: 0.14,
    },
  };
  useEffect(() => {
    // posthog
    posthog.capture("desktop", {data: user});
    initOGLTiltRenderer(CANVAS_WIDTH, CANVAS_HEIGHT);
    initFXRenderer();
    const img = new Image();
    img.src = "watermark.png";
    img.onload = () => {
      watermarkRef.current = img;
    };
    // check auth status
    (async () => {
      await refreshUser();
    })();
  }, []);
  const [elements, setElements] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [transitionType, setTransitionType] = useState(
    transitionTypes.BLOCK_WIPE,
  );
  const scrollRef = useRef(null);
  const audioRefs = useRef({});
  const projectFetched = useRef(false);
  const [canvasBg, setCanvasBg] = useState(null);

  let maxTime = useMemo(() => {
    return Math.max(
      ...elements.map((el) => el.end),
      ...zooms.map((z) => z.end),
      0,
    );
  }, [elements, zooms]);

  // bg image
  const bgImageRef = useRef(null);

  useEffect(() => {
    if (!canvasBg) {
      bgImageRef.current = null;
    }

    const img = new Image();
    img.src = canvasBg;
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, [canvasBg]);

  const addSpotlight = (duration = 4, effectType = null) => {
    const element = elements.find(
      (el) =>
        el.track === 6 && el.start <= currentTime && el.end >= currentTime,
    );
    if (element) {
      toast.error("Cannot overlap elements!");
      return;
    }
    const newElement = {
      id: Date.now(),
      source: null,
      start: currentTime,
      end: currentTime + duration,
      trimLeft: 0,
      trimRight: 0,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      crop: null,
      cropDraft: null,
      track: 6,
      effect: effectType,
      volume: 100,
      style: null,
    };
    // console.log(effectType);

    setElements((prev) => [...prev, newElement]);
    handleUndoRedo({ elements: [...elements, newElement], zooms });
  };

  const handleSplit = () => {
    if (!selectedElement) {
      toast.error("Select an element to split!");
      return;
    }
    if (selectedElement.track != 5 && selectedElement.track > 2) {
      toast.error("Only video and audio elements can be split!");
      return;
    }
    if (
      selectedElement.start >= playheadPosition / SCALE ||
      selectedElement.end <= playheadPosition / SCALE
    ) {
      toast.error("Playhead must be within the selected element to split!");
      return;
    }
    // console.log("speed", selectedElement.speed);
    if (selectedElement.speed !== 1) {
      toast.error("Please set speed to 1 before splitting");
      return;
    }
    const splitTime = playheadPosition / SCALE;
    let firstPart, secondPart;

    setElements((prevElements) => {
      const newElements = [];
      prevElements.forEach((el) => {
        if (el.id === selectedElement.id) {
          firstPart = {
            ...el,
            end: splitTime,
            trimRight: el.trimRight + (el.end - splitTime),
            effect: el.effect ? el.effect : null,
          };
          secondPart = {
            ...el,
            id: Math.max(...prevElements.map((e) => e.id)) + 1,
            start: splitTime,
            trimLeft: el.trimLeft + (splitTime - el.start),
            effect: null,
          };
          newElements.push(firstPart, secondPart);
          setSelectedElement(secondPart);
          handleCursorZoomAdjustment({operation:"split", splitTime:splitTime, video:{original: selectedElement, first: firstPart, second: secondPart}})
        } else {
          newElements.push(el);
        }
      });
      handleUndoRedo({ elements: newElements, zooms });
      return newElements;
    });
    setTransitions((prev) => prev.filter((el) => el.id !== selectedElement.id));
  };

  const getShareableLink = async (blob) => {
    try {
      if (blob == null || !blob) {
        toast.error("No export found! Please export your video first.");
        return;
      }
      const finalBlob = await combine(blob, toast);
      finalBlob.name = Date.now() + "-rookieclip-export.webm";

      const uploadRes = await uploadFiles("videoUploader", {
        files: [finalBlob],
        onUploadProgress: (event) => {
          setUploadProgress(event.progress);
        },
      });
      const url =
        "https://rookieclip.com/share/" + uploadRes[0].ufsUrl.split("/f/")[1];
      // console.log("url:" + url)
      setShareableLink(url);
      setIsUploading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleShare = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      await getShareableLink(exportBlob);
    } catch (err) {
      console.error(err);
    }
  };
  const getVideoDuration = (url) => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;

      video.onloadedmetadata = () => {
        if (video.duration === Infinity) {
          // Force duration calculation
          video.currentTime = 1e101;

          video.ontimeupdate = () => {
            video.ontimeupdate = null;
            resolve(video.duration);
            video.currentTime = 0;
          };
        } else {
          resolve(video.duration);
        }
      };
    });
  };

  const getAudioDuration = (url) => {
    return new Promise((resolve, reject) => {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = url;

      audio.onloadedmetadata = () => {
        if (audio.duration === Infinity || isNaN(audio.duration)) {
          // Force duration calculation for weird blobs
          audio.currentTime = 1e101;

          audio.ontimeupdate = () => {
            audio.ontimeupdate = null;
            resolve(audio.duration);
            audio.currentTime = 0;
          };
        } else {
          resolve(audio.duration);
        }
      };

      audio.onerror = () => {
        reject(new Error("Failed to load audio metadata"));
      };
    });
  };
  const handleImport = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const formattedFiles = selectedFiles.map((file) => ({
      id: Date.now() + Math.random(), // simple unique ID
      file,
      name: file.name,
      type: file.type,
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...formattedFiles]);
    e.target.value = "";
  };
  const addElementToTrack = async (file, trackNumber, start, end) => {
    const blobUrl = file.preview ? file.preview : URL.createObjectURL(file);
    let duration = 5; // default for images
    if (file.type?.startsWith("video/")) {
      // 🔥 Get duration BEFORE adding
      duration = await getVideoDuration(blobUrl);
    } else if (file.type?.startsWith("audio/")) {
      duration = await getAudioDuration(blobUrl);
    }
    const newStart = start;
    const newEnd = end ? end : start + duration;

    // 🔥 Check overlap
    const overlapping = elements.some(
      (el) =>
        el.track === trackNumber && newStart < el.end && newEnd > el.start,
    );

    if (overlapping) {
      // alert("❌ Cannot add — clip overlaps existing element.");
      toast.error("Cannot add — clip overlaps existing element.");
      return;
    }

    const newElement = {
      id: Date.now(),
      source: blobUrl,
      start: newStart,
      end: newEnd,
      trimLeft: 0,
      trimRight: 0,
      x: 0,
      y: 0,
      width: trackNumber === 1 ? 720 / 2 : 720,
      height: trackNumber === 1 ? 405 / 2 : 405,
      crop: null,
      cropDraft: null,
      track: trackNumber,
      effect: null,
      volume: 100,
      style: null,
      filePath: file.path,
      speed: 1,
      hideDisplay:false
    };

    setElements((prev) => {
      const updated = [...prev, newElement];
      handleUndoRedo({ elements: updated, zooms });
      return updated;
    });

    return newElement.id;
    // console.log("adding", newElement, file);
  };

const handleRecordingFinished = async ({ screenBlob, cameraBlob, cursor, nativeScreen }) => {
  // find the last time
    const endTime = elements.length
      ? Math.max(...elements.map(el => el.end))
      : 0;
    const startAt = endTime; // timeline position of the new clips (use maxTime to append instead)
    let videoId;
    try {
      if (screenBlob) {
        const url = URL.createObjectURL(screenBlob);
        videoId = await addElementToTrack({ preview: url }, 2, startAt, startAt + (await getVideoDuration(url)));
        // Native capture has no cursor in the pixels -> draw the styled cursor for the whole clip.
        // (In the Chromium fallback the real cursor is in the video, so only the double-click segments get one.)
        if (nativeScreen && cursor?.track?.samples?.length) {
          setCursorTracks((prev) => ({ ...prev, [url]: cursorTrackToOverlay(cursor.track, cursor.durationMs) }));
        }
      }
     if (cameraBlob) {
        const url = URL.createObjectURL(cameraBlob);
        await addElementToTrack({ preview: url }, 1, startAt, startAt + (await getVideoDuration(url)));
      }
      let added = 0;
      if (screenBlob && cursor?.segments?.length) {
        const newZooms = cursorSegmentsToZooms(cursor.segments, { offsetSec: startAt, scale: 1.2 }, videoId).filter(
          (z) => !overlapsExisting(zooms, z.start, z.end),
        );
        added = newZooms.length;
        if (added) setZooms((prev) => [...prev, ...newZooms]);
      }
      const hasCursor = added || (nativeScreen && cursor?.track?.samples?.length);
      toast.success(hasCursor ? "Recording added with cursor data" : "Recording added to the timeline");
      setActiveOption(hasCursor ? "cursor" : "files");
    } catch (e) {
      console.error(e);
      toast.error("Could not add the recording to the timeline");
    }
  };

function speedCursorZooms(
    zooms,
    video,
    newSpeed
) {
    return zooms.map(z => {

        if (
            z.type !== "cursor" ||
            z.parentVideoId !== video.id
        ) return z;

        const relStart =
            z.originalStart / newSpeed;

        const relEnd =
            z.originalEnd / newSpeed;

        return {
            ...z,
            start: video.start + relStart,
            end: video.start + relEnd
        };
    });
}

function trimCursorZooms(video, newStart, newEnd) {
  // console.log("newstart is ", newStart, "newend is ", newEnd, video)
  setZooms((prevZooms) =>
    prevZooms
      .filter((z) => {
        if (
          z.type !== "cursor" ||
          z.parentVideoId !== video.id
        ) {
          return true;
        }

        return z.end > newStart && z.start < newEnd;
      })
      .map((z) => {
        if (
          z.type !== "cursor" ||
          z.parentVideoId !== video.id
        ) {
          return z;
        }

        return {
          ...z,
          start: Math.max(z.start, newStart),
          end: Math.min(z.end, newEnd),
        };
      })
  );
}
function splitCursorZooms(zooms, videoData, splitTime) {
    const result = [];

    zooms.forEach(z => {

        if (
            z.type !== "cursor" ||
            z.parentVideoId !== videoData.original.id
        ) {
            result.push(z);
            return;
        }

        if (z.end <= splitTime) {
            result.push({
                ...z,
                parentVideoId: videoData.first.id
            });
        }

        else if (z.start >= splitTime) {
            result.push({
                ...z,
                parentVideoId: videoData.second.id
            });
        }

        else {
            result.push({
                ...z,
                end: splitTime,
                parentVideoId: videoData.first.id
            });

            result.push({
                ...z,
                id: Date.now() + Math.random(),
                start: splitTime,
                parentVideoId: videoData.second.id
            });
        }
    });

    handleUndoRedo({elements: elements, zooms})
    return result;
}
function handleCursorZoomAdjustment({
    operation,
    video,
    splitTime,
    trimStart,
    trimEnd,
    speed,
    deletedIds
}) {
    setZooms(prev => {
        let updated = [...prev];
        console.log(prev)
        switch(operation) {

            case "delete":
                updated = updated.filter(
                    z =>
                        z.type !== "cursor" ||
                        !deletedIds.includes(z.parentVideoId)
                );
                break;

            case "split":
                updated = splitCursorZooms(
                    updated,
                    video,
                    splitTime
                );
                break;

            case "trim":
                updated = trimCursorZooms(
                    updated,
                    video,
                    trimStart,
                    trimEnd
                );
                break;

            case "speed":
                updated = speedCursorZooms(
                    updated,
                    video,
                    speed
                );
                break;
        }

        return updated;
    });
}
  const handleDeleteFile = (id) => {
    setFiles((prev) => {
      const fileToDelete = prev.find((f) => f.id === id);

      if (fileToDelete?.preview) {
        URL.revokeObjectURL(fileToDelete.preview);
      }

      return prev.filter((f) => f.id !== id);
    });
  };
  const handleDrop = async (e, trackNumber) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("video/")) return;

    const trackRect = e.currentTarget.getBoundingClientRect();
    const blobUrl = URL.createObjectURL(file);

    // 🔥 Get duration BEFORE adding
    const duration = await getVideoDuration(blobUrl);

    // 🔥 Calculate drop time based on mouse position
    const offsetX = e.clientX - trackRect.left;

    const dropTime = offsetX / SCALE; // SCALE = pixels per second

    // const newStart = dropTime;
    // const newEnd = dropTime + duration;

    // // 🔥 Check overlap
    // const overlapping = elements.some(
    //   (el) =>
    //     el.track === trackNumber && newStart < el.end && newEnd > el.start,
    // );

    // if (overlapping) {
    //   alert("❌ Cannot add — clip overlaps existing element.");
    //   return;
    // }

    // // 🔥 Add element
    // const newElement = {
    //   id: Date.now(),
    //   source: blobUrl,
    //   start: newStart,
    //   end: newEnd,
    //   trimLeft: 0,
    //   trimRight: 0,
    //   x: 0,
    //   y: 0,
    //   width: DISPLAY_WIDTH,
    //   height: DISPLAY_HEIGHT,
    //   crop: null,
    //   cropDraft: null,
    //   track: trackNumber,
    //   effect: null,
    //   volume: 100,
    //   style: null,
    // };

    // setElements((prev) => [...prev, newElement]);
    await addElementToTrack(file, trackNumber, dropTime, dropTime + duration);
  };

  const handleDropImage = async (e, trackNumber) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const blobUrl = URL.createObjectURL(file);
    const trackRect = e.currentTarget.getBoundingClientRect();

    // 🔥 Calculate drop time based on mouse position
    const offsetX = e.clientX - trackRect.left;

    const dropTime = offsetX / SCALE; // SCALE = pixels per second

    const newStart = dropTime;
    const newEnd = dropTime + 5;

    // // 🔥 Check overlap
    // const overlapping = elements.some(
    //   (el) =>
    //     el.track === trackNumber && newStart < el.end && newEnd > el.start,
    // );

    // if (overlapping) {
    //   alert("❌ Cannot add — clip overlaps existing element.");
    //   return;
    // }

    // // 🔥 Add element
    // const newElement = {
    //   id: Date.now(),
    //   source: blobUrl,
    //   start: newStart,
    //   end: newEnd,
    //   trimLeft: 0,
    //   trimRight: 0,
    //   x: 0,
    //   y: 0,
    //   width: DISPLAY_WIDTH,
    //   height: DISPLAY_HEIGHT,
    //   crop: null,
    //   cropDraft: null,
    //   track: trackNumber,
    //   effect: null,
    //   volume: 100,
    //   style: null,
    // };

    // setElements((prev) => [...prev, newElement]);
    await addElementToTrack(file, trackNumber, newStart, newEnd);
  };

  const handleDropAudio = async (e, trackNumber) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("audio/")) return;

    const blobUrl = URL.createObjectURL(file);
    const trackRect = e.currentTarget.getBoundingClientRect();

    // 🔥 Get duration BEFORE adding
    const duration = await getAudioDuration(blobUrl);

    // 🔥 Calculate drop time based on mouse position
    const offsetX = e.clientX - trackRect.left;

    const dropTime = offsetX / SCALE; // SCALE = pixels per second

    // const newStart = dropTime;
    // const newEnd = dropTime + duration;

    // // 🔥 Check overlap
    // const overlapping = elements.some(
    //   (el) =>
    //     el.track === trackNumber && newStart < el.end && newEnd > el.start,
    // );

    // if (overlapping) {
    //   alert("❌ Cannot add — clip overlaps existing element.");
    //   return;
    // }

    // // 🔥 Add element
    // const newElement = {
    //   id: Date.now(),
    //   source: blobUrl,
    //   start: newStart,
    //   end: newEnd,
    //   trimLeft: 0,
    //   trimRight: 0,
    //   x: 0,
    //   y: 0,
    //   width: DISPLAY_WIDTH,
    //   height: DISPLAY_HEIGHT,
    //   crop: null,
    //   cropDraft: null,
    //   track: trackNumber,
    //   effect: null,
    //   volume: 100,
    //   style: null,
    //   file: file,
    // };

    // setElements((prev) => [...prev, newElement]);
    await addElementToTrack(file, trackNumber, dropTime, dropTime + duration);
  };
  const addText = () => {
    const newStart = playheadPosition / SCALE;
    const newEnd = newStart + 5;
    const overlapping = elements.some(
      (el) => el.track === 3 && newStart < el.end && newEnd > el.start,
    );

    if (overlapping) {
      // alert("❌ Cannot add — text overlaps existing element.");
      toast.error("Cannot add — text overlaps existing element.");
      return;
    }

    // 🔥 Add element
    const newElement = {
      id: Date.now(),
      source: null,
      start: newStart,
      end: newEnd,
      trimLeft: 0,
      trimRight: 0,
      x: 100,
      y: 100,
      width: 300,
      height: 50,
      crop: null,
      cropDraft: null,
      track: 3,
      effect: null,
      volume: 0,
      style: { fontFamily: "Arial", color: "white" },
      text: "Hello There!",
      textAnimation: textAnimation,
    };

    setElements((prev) => [...prev, newElement]);
    handleUndoRedo({ elements: [...elements, newElement], zooms });
  };
  /* ---------------- CURRENT ELEMENT ---------------- */

  const currentElements = useMemo(() => {
    return (
      elements.filter(
        (el) => currentTime >= el.start && currentTime <= el.end,
      ) || null
    );
  }, [currentTime, elements]);

  const timelineWidth =
    maxTime == 0 ? `${300 * SCALE}px` : `${(maxTime + 500) * SCALE}px`;

  /* ---------------- EXPORT ---------------- */

  const recorderRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioDestinationRef = useRef(null);

  const audioNodesRef = useRef({});

  function initAudio() {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();

      audioContextRef.current = ctx;
      audioDestinationRef.current = dest;
    }
  }

  function connectVideoAudio(videoEl, id, volume = 100) {
    initAudio();

    const audioContext = audioContextRef.current;
    const audioDestination = audioDestinationRef.current;
    // if (isExport) videoEl.muted = true;

    if (audioNodesRef.current[id]) return;
    try {
      const source = audioContext.createMediaElementSource(videoEl);

      const gainNode = audioContext.createGain();

      gainNode.gain.value = volume / 100;

      // videoEl.muted = true; // prevent double audio

      source.connect(gainNode);
      gainNode.connect(audioContext.destination); // preview
      gainNode.connect(audioDestination); // export

      audioNodesRef.current[id] = { source, gainNode };
    } catch (error) {
      return;
    }
  }

  const syncAudioTracks = () => {
    elements.forEach((el) => {
      if (el.track !== 5) return;

      const audio = audioRefs.current[el.id];
      if (!audio) return;

      const isActive = currentTime >= el.start && currentTime <= el.end;

      if (isActive) {
        const desired = el.trimLeft + (currentTime - el.start);

        // 🔥 IMPORTANT: prevent constant seeking
        if (Math.abs(audio.currentTime - desired) > 0.15) {
          audio.currentTime = desired;
        }

        if (isPlaying && audio.paused) {
          audio.play().catch(() => {});
        }

        if (!isPlaying && !audio.paused) {
          audio.pause();
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
    });
  };
  const connectAudioTrack = (audio, id, volume = 100) => {
    initAudio();

    const audioContext = audioContextRef.current;
    const audioDestination = audioDestinationRef.current;

    if (audioNodesRef.current[id]) return;

    try {
      const source = audioContext.createMediaElementSource(audio);
      const gainNode = audioContext.createGain();

      gainNode.gain.value = volume / 100;

      source.connect(gainNode);

      gainNode.connect(audioContext.destination); // preview
      gainNode.connect(audioDestination); // 🔥 export (THIS WAS MISSING)

      audioNodesRef.current[id] = { source, gainNode };
    } catch (e) {}
  };
  async function startExport(canvas) {
    initAudio();

    const audioContext = audioContextRef.current;
    const audioDestination = audioDestinationRef.current;

    await audioContext.resume();

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillRect(0, 0, 1, 1); // wake canvas

    // const canvasStream = canvas.captureStream(30);

    // const combinedStream = new MediaStream([
    //   ...canvasStream.getVideoTracks(),
    //   ...audioDestination.stream.getAudioTracks(),
    // ]);

    // recorderRef.current = new RecordRTC(combinedStream, {
    //   type: "video",
    //   mimeType: "video/webm;codecs=vp9",
    //   bitsPerSecond: 10_000_000,
    // });

    // recorderRef.current.startRecording();

    const canvasStream = canvas.captureStream(30);
    const audioStream = audioDestination.stream;

    // 🎥 video recorder
    videoRecorderRef.current = new RecordRTC(canvasStream, {
      type: "video",
      mimeType: "video/webm;codecs=vp9",
      bitsPerSecond: 10_000_000,
    });

    // 🔊 audio recorder
    audioRecorderRef.current = new RecordRTC(audioStream, {
      type: "audio",
      mimeType: "audio/webm",
    });

    // start both
    videoRecorderRef.current.startRecording();
    audioRecorderRef.current.startRecording();
  }
  const downloadExport = async () => {
    // const url = URL.createObjectURL(exportBlob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = "export.webm";
    // a.click();
    // posthog.capture("export_completed");
    // setTimeout(() => URL.revokeObjectURL(url), 1000);
    await combineAndDownload(exportBlob, toast);
  };
  async function stopExport() {
    if (!videoRecorderRef.current || !audioRecorderRef.current) return;
    await new Promise((resolve) => {
      videoRecorderRef.current.stopRecording(resolve);
    });

    await new Promise((resolve) => {
      audioRecorderRef.current.stopRecording(resolve);
    });

    const videoBlob = videoRecorderRef.current.getBlob();
    const audioBlob = audioRecorderRef.current.getBlob();
    // console.log("all blobs: ", videoBlob, audioBlob)
    // if (!recorderRef.current) return;
    // await new Promise((resolve) => {
    //   recorderRef.current.stopRecording(resolve);
    // });

    // const blob = recorderRef.current.getBlob();
    // setExportBlob(blob);
    setExportBlob({ video: videoBlob, audio: audioBlob });

    // recorderRef.current = null;
    // 🔥 Stop tracks
    // recorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    videoRecorderRef.current.stream
      ?.getTracks()
      .forEach((track) => track.stop());
    audioRecorderRef.current.stream
      ?.getTracks()
      .forEach((track) => track.stop());
    // audioDestinationRef.current?.stream
    // ?.getTracks()
    // .forEach((track) => track.stop());

    videoRecorderRef.current = null;
    audioRecorderRef.current = null;
    // recorderRef.current = null;
    timelineLastTimeRef.current = null;

    return { video: videoBlob, audio: audioBlob };
  }

  async function cancelExport() {
    // if (!recorderRef.current) return;
    if (!videoRecorderRef.current || !audioRecorderRef.current) return;

    setIsExport(false);
    setIsPlaying(false);

    try {
      await new Promise((resolve) => {
        videoRecorderRef.current.stopRecording(resolve);
      });

      await new Promise((resolve) => {
        audioRecorderRef.current.stopRecording(resolve);
      });
    } catch (err) {
      console.log("Stop error:", err);
    }

    // stop tracks
    // const internalStream = recorderRef.current?.stream;
    // internalStream?.getTracks().forEach((t) => t.stop());
    videoRecorderRef.current.stream
      ?.getTracks()
      .forEach((track) => track.stop());
    audioRecorderRef.current.stream
      ?.getTracks()
      .forEach((track) => track.stop());
    // audioDestinationRef.current?.stream?.getTracks().forEach((t) => t.stop());

    // reset recorder
    // recorderRef.current = null;
    videoRecorderRef.current = null;
    audioRecorderRef.current = null;
    // 🔥 reset timeline completely
    timelineLastTimeRef.current = null;
    setCurrentTime(0);
    setPlayHeadPosition(0);

    console.log("Export cancelled cleanly");
  }
  async function exportTimeline() {
    try {
      if (currentTime > maxTime) {
        // alert("Please seek to 0 to start export");
        toast.error("Please seek to 0 to start export");
        return;
      }
      if (elements.length === 0) {
        // alert("Add some elements to export!");
        toast.error("Add some elements to export!");
        return;
      }
      setIsPlaying(false);
      timelineLastTimeRef.current = null;
      setCurrentTime(0);
      setPlayHeadPosition(0);
      setIsExport(true);

      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      setIsPlaying(true);
      drawFrame(performance.now(), true);
      posthog.capture("export_started");
      await startExport(canvasRef.current);
    } catch (error) {
      posthog.capture("export_failed", {
        error: error,
      });
    }
  }
  async function captureVideo() {
    try {
      if (elements.length === 0) {
        // alert("Add some elements to export!");
        toast.error("Add a video element to remove background!");
        return;
      }
      setBgRemovalVideoEndTime(selectedElement.end);
      setIsPlaying(false);
      timelineLastTimeRef.current = null;
      setCurrentTime(selectedElement.start);
      setPlayHeadPosition(selectedElement.start);
      isBackgroundRemoval.current = true;

      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      setBackgroundRemovalMessage("Capturing Video. Please wait...");
      setIsPlaying(true);
      drawFrame(performance.now(), true);
      posthog.capture("background_removal_started");
      await startExport(canvasRef.current);
    } catch (error) {
      posthog.capture("background_removal_failed", {
        error: error,
      });
    }
  }
  async function captureVideoForTranscript() {
    try {
      const ele = elements.find(
        (ele) => ele.track === 1 || ele.track === 2 || ele.track === 5,
      );
      if (ele.length === 0) {
        // alert("Add some elements to export!");
        toast.error(
          "Add a video or audio on the timeline before generating subtitles!",
        );
        return;
      }
      setIsPlaying(false);
      timelineLastTimeRef.current = null;
      setCurrentTime(0);
      setPlayHeadPosition(0);

      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      isSubtitleGeneratingRef.current = true;
      setSubtitlesGenerationMessage({message: "Capturing Audio. Please wait...", progress:0});
      setIsPlaying(true);
      drawFrame(performance.now(), true);
      posthog.capture("subtitle_generation_started");
      await startExport(canvasRef.current);
    } catch (error) {
      posthog.capture("subtitle_generation_failed", {
        error: error,
      });
    }
  }
  // Watch for the end automatically
  useEffect(() => {
    if (
      isSubtitleGeneratingRef.current &&
      currentTime >= maxTime
    ) {
      const finalize = async () => {
        const blob = await stopExport();
        setIsPlaying(false);
        setSubtitlesGenerationMessage({message:"Processing audio", progress: 0})
        try {
          const transcription = await transcribeAudio(blob.audio, setSubtitlesGenerationMessage);
          const transcript = transcription.words.map((word, index) => ({
            id: index + 1,
            text: word.word,
            start: word.start,
            end: word.end,
            isFiller: FILLER_WORDS.has(word.word.trim().toLowerCase()),
          }));

          setOriginalTranscript(transcript);
          setTranscript(transcript);
          isSubtitleGeneratingRef.current = false;
          setSubtitlesGenerationMessage({
            message: "",
            progress: 0,
          });
        } catch (error) {
          isSubtitleGeneratingRef.current = false;
          setSubtitlesGenerationMessage({
            message: "",
            progress: 0,
          });
          toast.error("Could not generate subtitles")
        }
        
      };
      finalize();
    }
  }, [currentTime, maxTime, isSubtitleGeneratingRef.current]); // Runs every time currentTime changes

  // extension
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage("EDITOR_READY", "*");

      // ✅ store the id returned
      toast.success("Fetching your recording...");
    }

    const handleMessage = async (event) => {
      if (!event.origin.startsWith("chrome-extension://")) return;

      if (event.data.type === "RECORDING_DATA") {
        const { screen, camera, mouseData } = event.data;
        // console.log("Received recording data:", { screen, camera, mouseData });

        const screenUrl = screen ? URL.createObjectURL(screen) : null;
        const cameraUrl = camera ? URL.createObjectURL(camera) : null;
        setZooms(mouseData?.data || []);
        if (screenUrl) {
          await addElementToTrack(
            { preview: screenUrl },
            2,
            0,
            await getVideoDuration(screenUrl),
          );
        }

        if (cameraUrl) {
          await addElementToTrack(
            { preview: cameraUrl },
            1,
            0,
            await getVideoDuration(cameraUrl),
          );
        }

        toast.success("Recording loaded!");
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);
  // Watch for the end automatically
  useEffect(() => {
    if (isExport && currentTime >= maxTime) {
      const finalize = async () => {
        await stopExport();
        setIsPlaying(false);
        // alert("Done!");
      };
      finalize();
    }
  }, [currentTime, maxTime, isExport]); // Runs every time currentTime changes

  // Watch for the end automatically
  useEffect(() => {
    // console.log(
    //   "entered here:: ",
    //   isBackgroundRemoval.current,
    //   currentTime,
    //   bgRemovalVideoEndTime,
    // );
    if (isBackgroundRemoval.current && currentTime >= bgRemovalVideoEndTime) {
      const finalize = async () => {
        const blob = await stopExport();
        setIsPlaying(false);
        // remove bg
        const url = URL.createObjectURL(blob.video);
        setBackgroundRemovalMessage("Processing video");
        const videoBlob = await removeVideoBackground(url, {
          onProgress: setBackgroundRemovalProgress,
          isBackgroundRemoval: isBackgroundRemoval.current,
        });
        if (!videoBlob || !isBackgroundRemoval.current) {
          return;
        }
        await combineAndDownload(
          { video: videoBlob, audio: blob.audio },
          toast,
        );
        isBackgroundRemoval.current = false;
        setBackgroundRemovalMessage("");
        setBackgroundRemovalProgress(0);
      };
      finalize();
    }
  }, [currentTime, bgRemovalVideoEndTime, isBackgroundRemoval.current]); // Runs every time currentTime changes

  function resumeAudioContext() {
    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().then(() => console.log("AudioContext resumed!"));
    }
  }

  /* ---------------- DRAW ---------------- */

  const seekTo = (time) => {
    setCurrentTime(time);
    setPlayHeadPosition(time * SCALE);

    timelineLastTimeRef.current = null;
    renderLastTimeRef.current = null;
    activeVideoIdRef.current = null;
  };

  const addZoom = () => {
    if (isPlaying) {
      // alert("Pause the video before adding a zoom!");
      toast.error("Pause the video before adding a zoom!");
      return;
    }
    // check for zooms overlap
    const start = currentTime;
    const end = 5 + currentTime;
    for (let z of zooms) {
      if (
        (start >= z.start && start <= z.end) ||
        (end >= z.start && end <= z.end)
      ) {
        // alert("Zooms cannot overlap!");
        toast.error("Zooms cannot overlap!");
        return;
      }
    }

    const newZoom = {
      id: Date.now(),
      x: 0.25,
      y: 0.25,
      w: 0.5,
      h: 0.5,
      start: start,
      end: end,
      maxScale: 2.0,
      type: "normal",
    };
    handleUndoRedo({ elements, zooms: [...zooms, newZoom] });
    setZooms((prev) => [...prev, newZoom]);
  };

  function moveDown({
    ctx,
    video,
    currentElement,
    currentTime,
    sx,
    sy,
    sw,
    sh,
    renderScaleX,
    renderScaleY,
  }) {
    const duration = 1.5;

    const progress = Math.min(
      1,
      Math.max(0, (currentTime - currentElement.start) / duration),
    );

    // 🔥 Convert element base rect to render space
    const startX = currentElement.x * renderScaleX;
    const startY = currentElement.y * renderScaleY;
    const startWidth = currentElement.width * renderScaleX;
    const startHeight = currentElement.height * renderScaleY;

    // Target size (30% of DISPLAY height converted to render)
    const displaySize = DISPLAY_HEIGHT * 0.3;
    const targetWidth = displaySize * renderScaleX;
    const targetHeight = displaySize * renderScaleY;

    const targetX = CANVAS_WIDTH - targetWidth - 20 * renderScaleX;
    const targetY = CANVAS_HEIGHT - targetHeight - 20 * renderScaleY;

    // Interpolate position
    const dx = startX + (targetX - startX) * progress;
    const dy = startY + (targetY - startY) * progress;

    // Interpolate size
    const dWidth = startWidth + (targetWidth - startWidth) * progress;
    const dHeight = startHeight + (targetHeight - startHeight) * progress;

    ctx.save();

    const radius = (Math.min(dWidth, dHeight) / 2) * progress;

    ctx.beginPath();

    const r = Math.min(radius, dWidth / 2, dHeight / 2);

    ctx.moveTo(dx + r, dy);
    ctx.lineTo(dx + dWidth - r, dy);
    ctx.quadraticCurveTo(dx + dWidth, dy, dx + dWidth, dy + r);
    ctx.lineTo(dx + dWidth, dy + dHeight - r);
    ctx.quadraticCurveTo(
      dx + dWidth,
      dy + dHeight,
      dx + dWidth - r,
      dy + dHeight,
    );
    ctx.lineTo(dx + r, dy + dHeight);
    ctx.quadraticCurveTo(dx, dy + dHeight, dx, dy + dHeight - r);
    ctx.lineTo(dx, dy + r);
    ctx.quadraticCurveTo(dx, dy, dx + r, dy);

    ctx.closePath();
    ctx.clip();

    // ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
    const rect = {
      x: dx,
      y: dy,
      width: dWidth,
      height: dHeight,
    };

    applyElementStyle(ctx, currentElement.style, rect, () => {
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
    });

    ctx.restore();
  }

  const applyElementStyle = (ctx, style, rect, drawCallback) => {
    if (!style) {
      drawCallback();
      return;
    }

    const { x, y, width, height } = rect;

    ctx.save();
    // ---------------- HUE, HSL, SATURATION ------//

    ctx.filter = `
  hue-rotate(${style?.hue || 0}deg)
  saturate(${style?.saturation || 1})
  brightness(${style?.brightness || 1})
  contrast(${style?.contrast || 1})
`;
    // ---------------- SHADOW ----------------

    if (style.shadow) {
      if (style.isCircle) {
        const radius = Math.min(width, height) / 2;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      } else {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, style.borderRadius || 0);
      }
      ctx.shadowColor = "rgba(0,0,0,1)";
      ctx.shadowBlur = style.shadow;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;
      ctx.fill();
      ctx.save();

      ctx.restore();
    }
    if (style.isCircle) {
      const radius = Math.min(width, height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();
    }
    // ---------------- ROUNDED CLIP ----------------
    if (style.borderRadius && !style.isCircle) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, style.borderRadius);
      ctx.clip();
    }

    drawCallback();

    ctx.restore();

    // ---------------- BORDER ----------------
    if (style.borderColor) {
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = style.borderColor;

      if (style.isCircle) {
        const radius = Math.min(width, height) / 2;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (style.borderRadius) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, style.borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, width, height);
      }
      ctx.restore();
    }
  };

  function getInterpolatedCursorPoint(points, currentTime) {
    if (points.length === 0) return null;

    let p1 = points[0];
    let p2 = points[points.length - 1];

    for (let i = 0; i < points.length - 1; i++) {
      if (currentTime >= points[i].time && currentTime <= points[i + 1].time) {
        p1 = points[i];
        p2 = points[i + 1];
        break;
      }
    }

    const range = p2.time - p1.time;

    if (range <= 0) return p1;

    const t = (currentTime - p1.time) / range;

    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    };
  }
  async function downloadCanvasAsPNG(canvas, filename = "frame.png") {
    if (!canvas) return;

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    if (!blob) return;

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }
  const drawVideoFrame = (
    currentElement,
    ctx,
    videoType,
    elementEffect,
    tilteffect,
    zoom,
  ) => {
    const video = videoRefs.current[currentElement.id];
    if (!video) return;
    if (currentElement.hideDisplay) {
      return;
    } 
    const ZOOM_OUT_DURATION = 0.6;

    const cursorZoom = zooms.find(
      (z) =>
        z.type === "cursor" && currentTime >= z.start && currentTime <= z.end,
    );
    // console.log("cursor zooms: ", cursorZoom)
    // Compute source crop rect (shared by all paths)
    let sx = 0,
      sy = 0;
    let sw = video.videoWidth,
      sh = video.videoHeight;

    if (currentElement.crop) {
      const scaleX = video.videoWidth / DISPLAY_WIDTH;
      const scaleY = video.videoHeight / DISPLAY_HEIGHT;
      sx = currentElement.crop.x * scaleX;
      sy = currentElement.crop.y * scaleY;
      sw = currentElement.crop.width * scaleX;
      sh = currentElement.crop.height * scaleY;
    }

    const renderRect = {
      x: currentElement.x * renderScaleX,
      y: currentElement.y * renderScaleY,
      width: currentElement.width * renderScaleX,
      height: currentElement.height * renderScaleY,
    };

    // ---- LAYOUT TRANSITION ----
    const LAYOUT_TRANSITION_DURATION = 0.5; // seconds
    const timeSinceStart = currentTime - currentElement.start;
    const prevElement = elements
      .filter(
        (el) =>
          el.track === 1 &&
          el.id !== currentElement.id &&
          el.end <= currentElement.start,
      )
      .sort((a, b) => b.end - a.end)[0];
    if (prevElement && timeSinceStart < LAYOUT_TRANSITION_DURATION) {
      const t = timeSinceStart / LAYOUT_TRANSITION_DURATION;
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart

      const fromRect = {
        x: prevElement.x * renderScaleX,
        y: prevElement.y * renderScaleY,
        width: prevElement.width * renderScaleX,
        height: prevElement.height * renderScaleY,
      };

      renderRect.x = fromRect.x + (renderRect.x - fromRect.x) * eased;
      renderRect.y = fromRect.y + (renderRect.y - fromRect.y) * eased;
      renderRect.width =
        fromRect.width + (renderRect.width - fromRect.width) * eased;
      renderRect.height =
        fromRect.height + (renderRect.height - fromRect.height) * eased;

      // ---- Interpolate source crop so aspect ratio stays correct ----
      const scaleX = video.videoWidth / DISPLAY_WIDTH;
      const scaleY = video.videoHeight / DISPLAY_HEIGHT;

      // "from" crop: what prevElement was showing (or full frame if no crop)
      const fromCrop = prevElement.crop ?? {
        x: 0,
        y: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
      };
      // "to" crop: what currentElement is showing (or full frame if no crop)
      const toCrop = currentElement.crop ?? {
        x: 0,
        y: 0,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
      };

      const lerpedCrop = {
        x: fromCrop.x + (toCrop.x - fromCrop.x) * eased,
        y: fromCrop.y + (toCrop.y - fromCrop.y) * eased,
        width: fromCrop.width + (toCrop.width - fromCrop.width) * eased,
        height: fromCrop.height + (toCrop.height - fromCrop.height) * eased,
      };

      // Override sx/sy/sw/sh that were computed earlier
      sx = lerpedCrop.x * scaleX;
      sy = lerpedCrop.y * scaleY;
      sw = lerpedCrop.width * scaleX;
      sh = lerpedCrop.height * scaleY;
    }
    // Compute dest rect (applies zoom scaling if needed)
    let destRect = { ...renderRect };

    if (zoom && videoType !== "screen") {
      const ZOOM_IN_DURATION = 1.0;
      const elapsed = currentTime - zoom.start;
      let t = Math.min(1, elapsed / ZOOM_IN_DURATION);

      // If a previous zoom chained straight into this one, skip the ease-in —
      // we're already shrunk, don't pop back to full size first.
      const chainedFromPrev = zooms.some(
        (z) =>
          z !== zoom &&
          z.type !== "cursor" &&
          z.end <= zoom.start &&
          zoom.start - z.end <= 1.5,
      );
      if (chainedFromPrev) t = 1;

      let eased = 1 - Math.pow(1 - t, 3);
      let scale = 1 - eased * (zoom.maxScale - 1);

      if (
        !isZoomChainingRef.current &&
        currentTime > zoom.end - ZOOM_OUT_DURATION
      ) {
        t = Math.max(
          0,
          Math.min(1, (zoom.end - currentTime) / ZOOM_OUT_DURATION),
        );
        eased = t * t * (3 - 2 * t);
        scale = 1 - eased * (zoom.maxScale - 1);
      }

      scale = Math.max(0.6, scale);

      const drawW = renderRect.width * scale;
      const drawH = renderRect.height * scale;
      destRect = {
        x: renderRect.x + (renderRect.width - drawW) / 2,
        y: renderRect.y + (renderRect.height - drawH) / 2,
        width: drawW,
        height: drawH,
      };
    }

    if (cursorZoom && videoType !== "screen") {
      const ZOOM_IN_DURATION = 1.0;
      const elapsed = currentTime - cursorZoom.start;
      const maxScale = cursorZoom.maxScale || 2.0;
      let t = Math.min(1, elapsed / ZOOM_IN_DURATION);
      let eased = 1 - Math.pow(1 - t, 3);
      let scale = 1 - eased * (maxScale - 1);

      if (currentTime > cursorZoom.end - ZOOM_OUT_DURATION) {
        t = (cursorZoom.end - currentTime) / ZOOM_OUT_DURATION;
        eased = t * t * (3 - 2 * t);
        scale = 1 - eased * (maxScale - 1);
      }
      scale = Math.max(0.6, scale);

      const drawW = renderRect.width * scale;
      const drawH = renderRect.height * scale;
      destRect = {
        x: renderRect.x + (renderRect.width - drawW) / 2,
        y: renderRect.y + (renderRect.height - drawH) / 2,
        width: drawW,
        height: drawH,
      };
    }

    // ---- EFFECT: move-down ----
    if (currentElement.effect === "move-down") {
      moveDown({
        ctx,
        video,
        currentElement,
        currentTime,
        sx,
        sy,
        sw,
        sh,
        renderScaleX,
        renderScaleY,
      });
      return;
    }

    // ---- EFFECT: tilt (works with or without zoom) ----
    if (tilteffect && tilteffect.effect !== "tiltnone") {
      const tilt = tilts[tilteffect.effect];
      let _cropCanvas = null;
      let _cropCtx = null;

      const needsNewCanvas =
        !_cropCanvas ||
        _cropCanvas.width !== Math.round(sw) ||
        _cropCanvas.height !== Math.round(sh);

      if (needsNewCanvas) {
        _cropCanvas = document.createElement("canvas");
        _cropCanvas.width = Math.round(sw);
        _cropCanvas.height = Math.round(sh);
        _cropCtx = _cropCanvas.getContext("2d");
      }

      _cropCtx.clearRect(0, 0, _cropCanvas.width, _cropCanvas.height);
      _cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

      applyElementStyle(
        ctx,
        { ...currentElement.style, shadow: null },
        destRect,
        () => {
      renderTiltedVideo(
        ctx,
        _cropCanvas,
        tilt,
        destRect,
        currentTime,
        tilteffect.start,
        tilteffect.end,
      );
     },
      );
      return;
    }

    if (elementEffect && elementEffect.effect) {
      // console.log(elementEffect)
      let _cropCanvas = null;
      let _cropCtx = null;

      const needsNewCanvas =
        !_cropCanvas ||
        _cropCanvas.width !== Math.round(sw) ||
        _cropCanvas.height !== Math.round(sh);

      if (needsNewCanvas) {
        _cropCanvas = document.createElement("canvas");
        _cropCanvas.width = Math.round(sw);
        _cropCanvas.height = Math.round(sh);
        _cropCtx = _cropCanvas.getContext("2d");
      }

      _cropCtx.clearRect(0, 0, _cropCanvas.width, _cropCanvas.height);
      _cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

      applyElementStyle(
        ctx,
        { ...currentElement.style, shadow: null },
        destRect,
        () => {
          
          switch(elementEffect.effect) {
            case FX_NAMES.CAROUSEL:
              renderFX(ctx, video, destRect, currentTime, elementEffect.start, elementEffect.end, { preset: "carousel", color: [1, 0.3, 0.8] });
              break;
            case FX_NAMES.DOLLY:
              renderFX(ctx, video, destRect, currentTime, elementEffect.start, elementEffect.end, { preset: "dolly", color: [1, 0.3, 0.8] });
              break;
            case FX_NAMES.WHIP:
              renderFX(ctx, video, destRect, currentTime, elementEffect.start, elementEffect.end, { preset: "whip", color: [1, 0.3, 0.8] });
              break;
            case FX_NAMES.FLIP:
              renderFX(ctx, video, destRect, currentTime, elementEffect.start, elementEffect.end, { preset: "flip", color: [1, 0.3, 0.8] });
              break;
            case FX_NAMES.FILM_DAMAGE:
              renderFilmDamage(ctx, destRect, currentTime);
              break;
            case FX_NAMES.OLD_FILM:
              renderOldFilm(ctx, video, destRect, currentTime, elementEffect.start, elementEffect.end);
              break;
            case FX_NAMES.POLAROID:
              renderPolaroid(ctx, video, destRect, currentTime, elementEffect.start, elementEffect.end);
              break;
            case FX_NAMES.VHS:
              renderVHS(ctx, video, destRect, currentTime, elementEffect.start, elementEffect.end);
              break;
          }
        },
      );
      return;
    }

    // ---- SCREEN TYPE with zoom: draw normally (no scale, just crop) ----
    if (zoom && videoType === "screen") {
      ctx.save();
      const crop = currentElement.crop;
      if (crop) {
        applyElementStyle(ctx, currentElement.style, renderRect, () => {
          ctx.drawImage(
            video,
            crop.x * renderScaleX,
            crop.y * renderScaleY,
            crop.width * renderScaleX,
            crop.height * renderScaleY,
            renderRect.x,
            renderRect.y,
            renderRect.width,
            renderRect.height,
          );
        });
      } else {
        applyElementStyle(ctx, currentElement.style, renderRect, () => {
          ctx.drawImage(
            video,
            renderRect.x,
            renderRect.y,
            renderRect.width,
            renderRect.height,
          );
        });
      }
      ctx.restore();
      return;
    }

    // ---- SCREEN TYPE with cursor zoom ----
// if (cursorZoom && videoType === "screen") {
//   // Follow-the-cursor zoom + custom cursor / glitter / ripples
//   // handled by lib/cursor/zoomFrame.js
//   const drawn = drawCursorZoomFrame(ctx, {
//     video,
//     crop: { sx, sy, sw, sh },
//     renderRect,
//     zoom: cursorZoom,
//     currentTime,
//     style: cursorStyle,
//   });

//   if (drawn) return;
// }
    // ---- NORMAL DRAW (with optional zoom scaling via destRect) ----

    applyElementStyle(ctx, currentElement.style, destRect, () => {
      ctx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        destRect.x,
        destRect.y,
        destRect.width,
        destRect.height,
      );
    });
  };

  // cache one offscreen canvas per element, resized only when needed
  const silhouetteRefs = useRef({});

  const getSilhouetteCanvas = (id, w, h) => {
    let c = silhouetteRefs.current[id];
    if (!c) {
      c = document.createElement("canvas");
      silhouetteRefs.current[id] = c;
    }
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    return c;
  };

  const drawAlphaHuggingBorder = (
    ctx,
    id,
    image,
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    dw,
    dh,
    color,
    borderWidth = 4,
    steps = 16,
  ) => {
    const sil = getSilhouetteCanvas(id, dw, dh);
    const silCtx = sil.getContext("2d");

    silCtx.clearRect(0, 0, dw, dh);
    silCtx.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
    silCtx.globalCompositeOperation = "source-in";
    silCtx.fillStyle = color;
    silCtx.fillRect(0, 0, dw, dh);
    silCtx.globalCompositeOperation = "source-over";

    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const ox = Math.cos(angle) * borderWidth;
      const oy = Math.sin(angle) * borderWidth;
      ctx.drawImage(sil, dx + ox, dy + oy, dw, dh);
    }
  };
  const drawImageFrame = (ctx, element) => {
    const image = imageRefs.current[element.id];
    if (!image) return;

    let { x, y, width, height, crop, style } = element;

    // Apply render scale
    const drawX = x * renderScaleX;
    const drawY = y * renderScaleY;
    const drawW = width * renderScaleX;
    const drawH = height * renderScaleY;

    // -------- SOURCE RECT (Image space) --------
    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;

    if (crop) {
      const scaleX = image.width / DISPLAY_WIDTH;
      const scaleY = image.height / DISPLAY_HEIGHT;

      sx = crop.x * scaleX;
      sy = crop.y * scaleY;
      sw = crop.width * scaleX;
      sh = crop.height * scaleY;
    }

    // -------- DRAW --------
    const renderRect = {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    };

    ctx.save();
    if (style?.matchShape) {
      drawAlphaHuggingBorder(
        ctx,
        element.id,
        image,
        sx,
        sy,
        sw,
        sh,
        drawX,
        drawY,
        drawW,
        drawH,
        style?.borderColor,
        style?.borderWidth || 4,
        style?.borderSteps || 16,
      );
      ctx.drawImage(image, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
    } else if (typeof applyElementStyle === "function") {
      applyElementStyle(ctx, style, renderRect, () => {
        ctx.drawImage(image, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
      });
    } else {
      ctx.drawImage(image, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  };

 function drawSpotlight(ctx, spotlight, currentTime) {
  const { x, y, width, height, start, end } = spotlight;

  if (currentTime < start || currentTime > end) return;

  const canvasWidth = DISPLAY_WIDTH * renderScaleX;
  const canvasHeight = DISPLAY_HEIGHT * renderScaleY;

  // Smooth fade duration in seconds
  const FADE_DURATION = 0.35;

  let opacity = 0.5;

  // Ease-in
  if (currentTime < start + FADE_DURATION) {
    const progress = (currentTime - start) / FADE_DURATION;
    const eased = progress * progress * (3 - 2 * progress); // smoothstep
    opacity *= eased;
  }

  // Ease-out
  if (currentTime > end - FADE_DURATION) {
    const progress = (end - currentTime) / FADE_DURATION;
    const eased = progress * progress * (3 - 2 * progress);
    opacity *= eased;
  }

  ctx.save();

  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;

  ctx.beginPath();

  // Outer full screen
  ctx.rect(0, 0, canvasWidth, canvasHeight);

  // Inner spotlight rectangle
  ctx.rect(
    x * renderScaleX,
    y * renderScaleY,
    width * renderScaleX,
    height * renderScaleY
  );

  // Cut out spotlight area
  ctx.fill("evenodd");

  ctx.restore();
}

  function drawWatermark(ctx, canvas) {
    const img = watermarkRef.current;
    //  console.log("img is ", img)
    if (!img) return;

    const margin = 50;

    // Scale down if needed
    const width = 600; // adjust to match your UI
    const height = (img.height / img.width) * width;

    ctx.save();

    ctx.globalAlpha = 1;

    ctx.drawImage(
      img,
      canvas.width - width - margin,
      canvas.height - height - 40,
      width,
      height,
    );

    ctx.restore();
  }

  function drawPlainSubtitle(
    ctx,
    currentTime,
    subtitleChunks,
    { position = "bottom", style, uppercase = false } = {},
  ) {
    const chunk = subtitleChunks.find(
      (words) =>
        currentTime >= words[0].start &&
        currentTime <= words[words.length - 1].end,
    );
    if (!chunk) return;

    const fontSize = 58;
    const padX = 20;
    const padY = 12;
    const radius = 12;
    const lineGap = 16;
    const safeMargin = 60;
    const maxLineWidth = CANVAS_WIDTH - safeMargin * 2;

    let words = chunk.map((w) => w.text);
    if (uppercase) words = words.map((w) => w.toUpperCase());

    ctx.save();
    ctx.font = `700 ${fontSize}px Inter`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // Greedy word-wrap into lines that fit within maxLineWidth
    const lines = [];
    let currentWords = [];

    words.forEach((word) => {
      const trial = [...currentWords, word].join(" ");
      const trialWidth = ctx.measureText(trial).width;

      if (currentWords.length > 0 && trialWidth > maxLineWidth) {
        lines.push(currentWords.join(" "));
        currentWords = [word];
      } else {
        currentWords.push(word);
      }
    });
    if (currentWords.length > 0) lines.push(currentWords.join(" "));

    const lineHeight = fontSize + lineGap;
    const blockHeight = (lines.length - 1) * lineHeight;

    const x = CANVAS_WIDTH / 2;
    let firstLineY;
    if (position === "top") {
      firstLineY = 120 + fontSize / 2;
    } else if (position === "mid") {
      firstLineY = CANVAS_HEIGHT / 2 - blockHeight / 2;
    } else {
      // bottom (default) — anchor the LAST line at the original y, grow upward
      firstLineY = CANVAS_HEIGHT - 120 - blockHeight;
    }

    lines.forEach((lineText, i) => {
      const y = firstLineY + i * lineHeight;
      const width = ctx.measureText(lineText).width;

      if (style.bg) {
        drawRoundedRect(
          ctx,
          x - width / 2 - padX,
          y - fontSize / 2 - padY,
          width + padX * 2,
          fontSize + padY * 2,
          radius,
        );
        ctx.fillStyle = style.bg;
        ctx.fill();
      }

      if (style.stroke) {
        ctx.lineWidth = 8;
        ctx.strokeStyle = style.stroke;
        ctx.strokeText(lineText, x, y);
      }

      ctx.fillStyle = style.text;
      ctx.fillText(lineText, x, y);
    });

    ctx.restore();
  }
  function drawHighlightedSubtitle(
    ctx,
    currentTime,
    subtitleChunks,
    { position = "bottom", style = SUBTITLE_STYLES.blackBg } = {},
  ) {
    const chunk = subtitleChunks.find(
      (words) =>
        currentTime >= words[0].start &&
        currentTime <= words[words.length - 1].end,
    );
    if (!chunk) return;

    const fontSize = 58;
    const gap = 14;
    const padX = 14;
    const padY = 8;
    const radius = 12;
    const lineGap = 16; // vertical space between wrapped lines
    const safeMargin = 60; // keeps text off the left/right edges (esp. 9:16)
    const maxLineWidth = CANVAS_WIDTH - safeMargin * 2;

    ctx.save();
    ctx.font = `700 ${fontSize}px Inter`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Measure every word once
    const measured = chunk.map((word) => ({
      word,
      width: ctx.measureText(word.text).width,
    }));

    // Greedily wrap into lines that fit within maxLineWidth
    const lines = [];
    let current = [];
    let currentWidth = -gap;

    measured.forEach(({ word, width }) => {
      const addedWidth = width + gap;
      if (current.length > 0 && currentWidth + addedWidth > maxLineWidth) {
        lines.push(current);
        current = [];
        currentWidth = -gap;
      }
      current.push({ word, width });
      currentWidth += addedWidth;
    });
    if (current.length > 0) lines.push(current);

    // Precompute per-line layout (words, widths, totalWidth, startX)
    const lineHeight = fontSize + lineGap;
    const layoutLines = lines.map((lineWords) => {
      let totalWidth = -gap;
      lineWords.forEach(({ width }) => {
        totalWidth += width + gap;
      });
      const startX = (CANVAS_WIDTH - totalWidth) / 2;
      return { lineWords, totalWidth, startX };
    });

    const blockHeight = (layoutLines.length - 1) * lineHeight;

    // Anchor the block the same way the single-line version anchored y
    let firstLineY;
    if (position === "top") {
      firstLineY = 120 + fontSize / 2;
    } else if (position === "mid") {
      firstLineY = CANVAS_HEIGHT / 2 - blockHeight / 2;
    } else {
      // bottom (default) — anchor the LAST line at the original y, grow upward
      firstLineY = CANVAS_HEIGHT - 120 - blockHeight;
    }

    layoutLines.forEach(({ lineWords, totalWidth, startX }, lineIndex) => {
      const y = firstLineY + lineIndex * lineHeight;

      // Full-line background (blackBg / whiteBg styles)
      if (style.lineBg) {
        drawRoundedRect(
          ctx,
          startX - padX,
          y - fontSize / 2 - padY,
          totalWidth + padX * 2,
          fontSize + padY * 2,
          radius,
        );
        ctx.fillStyle = style.lineBg;
        ctx.fill();
      }

      let x = startX;
      lineWords.forEach(({ word, width }) => {
        const active = currentTime >= word.start && currentTime <= word.end;

        // Per-word highlight box (highlightBg style only)
        if (active && style.activeBg) {
          drawRoundedRect(
            ctx,
            x - padX,
            y - fontSize / 2 - padY,
            width + padX * 2,
            fontSize + padY * 2,
            radius,
          );
          ctx.fillStyle = style.activeBg;
          ctx.fill();
        }

        if (style.stroke) {
          ctx.lineWidth = 8;
          ctx.strokeStyle = style.stroke;
          ctx.strokeText(word.text, x, y);
        }

        ctx.fillStyle = active ? style.activeText : style.text;
        ctx.fillText(word.text, x, y);

        x += width + gap;
      });
    });

    ctx.restore();
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const drawFrame = (now, force = false) => {
    syncAudioTracks();
    const canvas = canvasRef.current;

    const ctx = canvas.getContext("2d");
    // Scale all drawing operations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.imageSmoothingEnabled = true; // turn on smoothing
    ctx.imageSmoothingQuality = "high";
    if (!force) {
      if (!renderLastTimeRef.current) {
        renderLastTimeRef.current = now;
      }

      if (now - renderLastTimeRef.current < 33) return; // ~30fps
      renderLastTimeRef.current = now;
    }
    // ctx.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    elements.forEach((el) => {
      const video = videoRefs.current[el.id];
      if (!video) return;

      const isActive = currentTime >= el.start && currentTime <= el.end;

      if (isActive) {
        const speed = el.speed ?? 1;
        const desired = el.trimLeft + (currentTime - el.start) * speed;
        const drift = Math.abs(video.currentTime - desired);

        if (!isExport && !isBackgroundRemoval.current) {
          if (drift > 0.25) {
            video.currentTime = desired;
          }
        } else {
          // During export, only resync if we're REALLY out of sync
          if (drift > 0.5) {
            video.currentTime = desired;
          }
        }

        // Also keep playbackRate in sync in case it changed
        if (video.playbackRate !== speed) {
          video.playbackRate = speed;
        }
        // with this the animated videos worked fine, but split/trim didn't sync
        // if (!isExport && Math.abs(video.currentTime - desired) > 0.1) {
        //   video.currentTime = desired;
        // }

        // if (drift > 0.3) {
        //   video.currentTime = desired;
        // }
        // if (Math.abs(video.currentTime - desired) > 0.1) {
        //   video.currentTime = desired;
        // }
        if (isPlaying && video.paused) {
          video.play().catch(() => {});
        }
        if (!isPlaying && !video.paused) video.pause();
      } else {
        // 🔑 THIS IS WHAT YOU WERE MISSING
        if (!video.paused) {
          video.pause();
        }
        const startFrame = el.trimLeft;

        if (Math.abs(video.currentTime - startFrame) > 0.1) {
          video.currentTime = startFrame;
        }
      }
    });

    if (currentElements.length === 0) return;
    const text = currentElements.find((el) => el.track == 3);
    const cameraVideo = currentElements.find((el) => el.track == 1);
    const screenVideo = currentElements.find((el) => el.track == 2);
    const image = currentElements.find((el) => el.track === 4);
    const activeTransition = transitions.find(
      (t) => currentTime >= t.start && currentTime <= t.start + t.duration,
    );
    const spotlight = currentElements.find(
      (el) => el.track === 6 && !el.effect,
    );
    const elementEffect = currentElements.find(
      (el) => el.track === 6 && el.effect && !el.effect.includes("tilt"),
    );
    const tilteffect = currentElements.find(
      (el) => el.track === 6 && el.effect && el.effect.includes("tilt"),
    );
    const nextScreenVideo = currentElements.find((el) => el.track == 2 && el.start - screenVideo.end <= 1);
    //zoom
    // zoom after drawing everything
    let zoom = zooms.find(
      (z) => currentTime >= z.start && currentTime <= z.end && z.type !== "cursor",
    );
    if (!zoom) {
      const previousZoom = zooms
        .filter((z) => z.type !== "cursor" && z.end < currentTime)
        .sort((a, b) => b.end - a.end)[0];

      const upcomingZoom = zooms
        .filter((z) => z.type !== "cursor" && z.start > currentTime)
        .sort((a, b) => a.start - b.start)[0];

      if (
        previousZoom &&
        upcomingZoom &&
        upcomingZoom.start - previousZoom.end <= 1 &&
        currentTime < upcomingZoom.start
      ) {
        zoom = previousZoom;
      }
    }
    let cx = 1;
    let cy = 1;
    let scale = 1.0;
    // Cursor camera state must exist outside the normal zoom block
    let cursorCam = null;
    let cursorMap = null;
    let cursorZoom = null;

    if (zoom) {
      ctx.save();

      const basescale = Math.min(
        1 / zoom.w,
        1 / zoom.h,
        zoom.maxScale ?? Infinity,
      );

      const ZOOM_IN_DURATION = 1.0;
      const ZOOM_OUT_DURATION = 0.6;

      const nextZoom = zooms
        .filter(
          (z) =>
            z.type !== "cursor" &&
            z.start > zoom.start &&
            z.start - zoom.end <= 1,
        )
        .sort((a, b) => a.start - b.start)[0];

      const prevZoom = zooms
        .filter(
          (z) =>
            z.type !== "cursor" &&
            z.end <= zoom.start &&
            zoom.start - z.end <= 1,
        )
        .sort((a, b) => b.end - a.end)[0];

      const shouldChain = nextZoom && nextZoom.start - zoom.end <= 1.5;
      isZoomChainingRef.current = shouldChain;

      // --------------------------------------------------
      // Camera position
      // --------------------------------------------------

      let centerX = zoom.x + zoom.w / 2;
      let centerY = zoom.y + zoom.h / 2;

      let moveProgress = 1;

      if (prevZoom) {
        const MOVE_DURATION = 1;

        const t = Math.min(1, (currentTime - zoom.start) / MOVE_DURATION);

        const eased = t * t * (3 - 2 * t);

        // Camera starts moving immediately
        moveProgress = eased;

        const fromX = prevZoom.x + prevZoom.w / 2;
        const fromY = prevZoom.y + prevZoom.h / 2;

        const toX = zoom.x + zoom.w / 2;
        const toY = zoom.y + zoom.h / 2;

        centerX = fromX + (toX - fromX) * moveProgress;
        centerY = fromY + (toY - fromY) * moveProgress;
      }

      cx = centerX * CANVAS_WIDTH;
      cy = centerY * CANVAS_HEIGHT;

      // --------------------------------------------------
      // Scale
      // --------------------------------------------------

      if (prevZoom) {
        const prevScale = Math.min(
          1 / prevZoom.w,
          1 / prevZoom.h,
          prevZoom.maxScale ?? Infinity,
        );

        // Delay the zoom until camera has moved.
        let zoomProgress = 1 - Math.pow(1 - moveProgress, 2);
        zoomProgress *= 0.9;
        zoomProgress = Math.min(1, zoomProgress);

        scale = prevScale + (basescale - prevScale) * zoomProgress;
      } else {
        const elapsed = currentTime - zoom.start;

        let t = Math.min(1, elapsed / ZOOM_IN_DURATION);

        let eased = 1 - Math.pow(1 - t, 3);

        scale = 1 + eased * (basescale - 1);
      }

      if (!shouldChain && currentTime > zoom.end - ZOOM_OUT_DURATION) {
        let t = (zoom.end - currentTime) / ZOOM_OUT_DURATION;

        let eased = t * t * (3 - 2 * t);

        scale = 1 + eased * (basescale - 1);
      }

      // --------------------------------------------------
      // Apply transform
      // --------------------------------------------------

      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }

    
      // ---- cursor zoom: zoom the WHOLE scene like a normal zoom ----
// This keeps crop/style/background included while the camera follows
// the cursor inside the screen recording.

if (!zoom && screenVideo) {
  cursorZoom = zooms.find(
    (z) =>
      z.type === "cursor" &&
      currentTime >= z.start &&
      currentTime <= z.end
  );

  const sv = cursorZoom && videoRefs.current[screenVideo.id];

  if (sv) {
    cursorMap = getScreenMapping(sv, screenVideo, {
      DISPLAY_WIDTH,
      DISPLAY_HEIGHT,
      renderScaleX,
      renderScaleY,
    });

    if (cursorMap) {
      cursorCam = getCursorCamera({
        zoom: cursorZoom,
        currentTime,
        style: cursorStyle,
        canvasW: CANVAS_WIDTH,
        canvasH: CANVAS_HEIGHT,
        toCanvas: cursorMap.toCanvas,
      });

      ctx.save();

      ctx.translate(cursorCam.tx, cursorCam.ty);
      ctx.scale(cursorCam.scale, cursorCam.scale);
    }
  }
}
    // if canvas bg
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // if (screenVideo) {
    //   // drawVideoFrame(screenVideo, ctx, "screen", elementEffect, tilteffect, zoom);
    // }
    if (screenVideo) {
  drawVideoFrame(
    screenVideo,
    ctx,
    "screen",
    elementEffect,
    tilteffect,
    zoom
  );

  // Whole-recording cursor: looked up with the CLIP's time, so it follows trimming / moving / speed.
      const cursorTrack = cursorTracks[screenVideo.source];
      const sv = cursorTrack && videoRefs.current[screenVideo.id];
      const trackMap =
        cursorMap ||
        (sv && getScreenMapping(sv, screenVideo, { DISPLAY_WIDTH, DISPLAY_HEIGHT, renderScaleX, renderScaleY }));
      if (cursorTrack && trackMap && !screenVideo.hideDisplay) {
        drawCursorForCamera(ctx, {
          zoom: cursorTrack,
          currentTime:
            (screenVideo.trimLeft || 0) + (currentTime - screenVideo.start) * (screenVideo.speed ?? 1),
          style: cursorStyle,
          cam: cursorCam || { scale: 1 },
          mapping: trackMap,
          speed: screenVideo.speed
        });
      } else if (cursorCam) {
        // no whole-recording track (e.g. Chromium fallback): cursor only inside the double-click segments
    drawCursorForCamera(ctx, {
      zoom: cursorZoom,
      currentTime,
      style: cursorStyle,
      cam: cursorCam,
      mapping: cursorMap,
      speed: screenVideo.speed

    });
  }
}
    if (text && text.textBehindVideo) {
      switch (text.textAnimation) {
        case textTypes.TYPING_GRADIENT:
          drawTypingGradient(ctx, text, currentTime);
          break;
        case textTypes.KINETIC_TEXT:
          drawKineticWords(ctx, text, currentTime);
          break;
        case textTypes.MARKER_HIGHLIGHT:
          drawMarkerHighlight(ctx, text, currentTime);
          break;
        case textTypes.PARTICLE_BURST:
          drawParticleBurst(ctx, text, currentTime);
          break;
        case textTypes.SHATTER_EXPLODE:
          drawShatterExplode(ctx, text, currentTime);
          break;
        case textTypes.WORD_SLAM:
          drawWordSlam(ctx, text, currentTime);
          break;
        case textTypes.SCRAMBLED_TEXT:
          drawScrambleText(ctx, text, currentTime);
          break;
        case textTypes.BLUR_REVEAL:
          drawBlurReveal(ctx, text, currentTime);
          break;
        case textTypes.TYPEWRITER:
          drawTypewriter(ctx, text, currentTime);
          break;
        case textTypes.BASIC:
          drawBasicText(ctx, text, currentTime);
        default:
          break;
      }
    }
    if (cameraVideo && !spotlight) {
      ctx.save();

      if (zoom) {
  ctx.translate(cx, cy);
  ctx.scale(1 / scale, 1 / scale);
  ctx.translate(-cx, -cy);
} else if (cursorCam) {
  // Cancel the cursor camera before drawing the camera layer
  ctx.scale(1 / cursorCam.scale, 1 / cursorCam.scale);
  ctx.translate(-cursorCam.tx, -cursorCam.ty);
}

      drawVideoFrame(cameraVideo, ctx, "camera", canvas, null, zoom);

      ctx.restore();
    }

    if (image) {
      drawImageFrame(ctx, image);
    }
    if (text && !text.textBehindVideo) {
      switch (text.textAnimation) {
        case textTypes.TYPING_GRADIENT:
          drawTypingGradient(ctx, text, currentTime);
          break;
        case textTypes.KINETIC_TEXT:
          drawKineticWords(ctx, text, currentTime);
          break;
        case textTypes.MARKER_HIGHLIGHT:
          drawMarkerHighlight(ctx, text, currentTime);
          break;
        case textTypes.PARTICLE_BURST:
          drawParticleBurst(ctx, text, currentTime);
          break;
        case textTypes.SHATTER_EXPLODE:
          drawShatterExplode(ctx, text, currentTime);
          break;
        case textTypes.WORD_SLAM:
          drawWordSlam(ctx, text, currentTime);
          break;
        case textTypes.SCRAMBLED_TEXT:
          drawScrambleText(ctx, text, currentTime);
          break;
        case textTypes.BLUR_REVEAL:
          drawBlurReveal(ctx, text, currentTime);
          break;
        case textTypes.TYPEWRITER:
          drawTypewriter(ctx, text, currentTime);
          break;
        case textTypes.BASIC:
          drawBasicText(ctx, text, currentTime);
        default:
          break;
      }
    }
    if (spotlight) {
      drawSpotlight(ctx, spotlight, currentTime);
    }
    if (cameraVideo && spotlight) {
      ctx.save();

      if (zoom) {
  ctx.translate(cx, cy);
  ctx.scale(1 / scale, 1 / scale);
  ctx.translate(-cx, -cy);
} else if (cursorCam) {
  // Cancel the cursor camera before drawing the camera layer
  ctx.scale(1 / cursorCam.scale, 1 / cursorCam.scale);
  ctx.translate(-cursorCam.tx, -cursorCam.ty);
}

      drawVideoFrame(cameraVideo, ctx, "camera", canvas, null, zoom);

      ctx.restore();
    }
    if (elementEffect) {
      switch (elementEffect.effect) {
        case titleCardTypes.BLOB_POP_CARD:
          drawBlobPopCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.CONFETTI_TITLE_CARD:
          drawConfettiTitleCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.CUTE_SCRAP_BOOK_CARD:
          drawCuteScrapbookCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.LETTER_BURST_FOCUS_CARD:
          drawLetterBlurFocusCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.NEON_FRAME_CARD:
          drawNeonFrameCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.PARTICLE_BURST_CARD:
          drawParticleBurstCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.PINK_BUBBLE_CARD:
          drawPinkBubbleCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.RETRO_SCAN_CARD:
          drawRetroScanCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.GLASS_CARD:
          drawGlassCard(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.CINEMATIC_BARS:
          drawCinematicBars(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case titleCardTypes.SPOTLIGHT_REVEAL:
          drawSpotlightReveal(ctx, elementEffect, currentTime, aspectRatio);
          break;
        case lowerThirdTypes.SLIDE:
          drawLowerThirdSlide(ctx, elementEffect, currentTime);
          break;
        case lowerThirdTypes.LINE:
          drawLowerThirdLine(ctx, elementEffect, currentTime);
          break;
        case lowerThirdTypes.GITHUB:
          drawGithubLowerThird(ctx, elementEffect, currentTime);
          break;
        case lowerThirdTypes.LINKEDIN:
          drawLinkedInLowerThird(ctx, elementEffect, currentTime);
          break;
        default:
          break;
      }
    }
    if (activeTransition) {
      switch (activeTransition.type) {
        case transitionTypes.BLOCK_WIPE:
          drawBlockWipe(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.FILM_BURN:
          drawFilmBurn(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.FLASH_WHITE:
          drawFlashWhite(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.RADIAL_REVEAL:
          drawRadialReveal(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.RGB_GLITCH:
          drawRGBGlitch(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.SLIDE_WIPE:
          drawSlideWipe(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.FADE_IN:
          drawFadeIn(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.PIXEL_DISSOLVE_REVEAL:
          drawPixelDissolveReveal(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.RADIAL_REVEAL:
          drawRadialReveal(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.VENETIAN_BLINDS_REVEAL:
          drawVenetianBlindsReveal(ctx, currentTime, activeTransition);
          break;
        case transitionTypes.CLOCK_WIPE_REVEAL:
          drawClockWipeReveal(ctx, currentTime, activeTransition);
          break;
        default:
          drawTransition(activeTransition.type, ctx, 
            currentTime, activeTransition, aspectRatio, 
            videoRefs.current[screenVideo.id], videoRefs.current[nextScreenVideo.id])
      }
    }
    if (subtitleStyle && displaySubtitles) {
      if (subtitleStyle.styleType) {
        drawHighlightedSubtitle(ctx, currentTime, subtitleChunks, {
          position: subtitlePosition,
          style: subtitleStyle,
        });
      } else {
        drawPlainSubtitle(ctx, currentTime, subtitleChunks, {
          position: subtitlePosition,
          style: subtitleStyle,
        });
      }
    }
    ctx.restore();
    if (isExport && (!user?.isLoggedIn || !user?.isPaid)) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);   // belt and braces: identity matrix
      drawWatermark(ctx, canvas);
      ctx.restore();
    }
  };

  const addEffect = (type) => {
    if (selectedElement) {
      if (type === "move-down") {
        if (selectedElement.track !== 1 && selectedElement.track !== 2) {
          toast.error(
            "Move-down effect can only be applied to video elements.",
          );
          return;
        }
        setElements((els) =>
          els.map((el) => {
            if (el.id === selectedElement.id) {
              setSelectedElement({ ...el, effect: el.effect ? null : type });
              return { ...el, effect: el.effect ? null : type };
            }
            return el;
          }),
        );
      } else {
        setElements((els) =>
          els.map((el) => {
            if (el.id === selectedElement.id) {
              if (type.includes("none")) {
                setSelectedElement({ ...el, effect: null });
                return { ...el, effect: null };
              } else {
                setSelectedElement({ ...el, effect: type });
                if (!isPlaying) {
                  toast.success(
                    "Effect applied! Hit play to see it in action.",
                    { duration: 3000 },
                  );
                }
                return { ...el, effect: type };
              }
            }
            return el;
          }),
        );
      }
    } else {
      toast.error("Please select an element to apply the effect.");
    }
  };

  const FPS = 60;

  const formatTimecode = (timeInSeconds) => {
    const totalFrames = Math.floor(timeInSeconds * FPS);

    const hours = Math.floor(totalFrames / (FPS * 60 * 60));
    const minutes = Math.floor((totalFrames % (FPS * 60 * 60)) / (FPS * 60));
    const seconds = Math.floor((totalFrames % (FPS * 60)) / FPS);
    const frames = totalFrames % FPS;

    const pad = (num) => String(num).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
  };

  const addTransition = (type) => {
    if (selectedElement && selectedElement.track == 2) {
      const exists = transitions.filter((el) => el.id === selectedElement.id);
      if (exists.length > 0) {
        setTransitions((els) =>
          els.map((el) => {
            if (el.id === selectedElement.id) {
              return { ...el, type: type };
            }
            return el;
          }),
        );
      } else {
        const newTransition = {
          id: selectedElement.id,
          type: type,
          duration: 1.5,
          start: +(selectedElement.end - 1).toFixed(2),
        };
        setTransitions((prev) => [...prev, newTransition]);
      }
    }
  };

  const splitElement = (elements, element, splitTime) => {
    if (!element) return null;

    if (element.track !== 5 && element.track > 2) {
      //  toast.error("Only video and audio elements can be split!");
      return null;
    }

    if (element.start >= splitTime || element.end <= splitTime) {
      //  toast.error("Split time must be within the selected element!");
      return null;
    }

    if (element.speed !== 1) {
      toast.error("Please set speed to 1 before splitting");
      return null;
    }

    const nextId = Math.max(...elements.map((e) => e.id)) + 1;

    const firstPart = {
      ...element,
      end: splitTime,
      trimRight: element.trimRight + (element.end - splitTime),
      effect: element.effect ?? null,
    };

    const secondPart = {
      ...element,
      id: nextId,
      start: splitTime,
      trimLeft: element.trimLeft + (splitTime - element.start),
      effect: null,
    };

    const newElements = elements.flatMap((el) =>
      el.id === element.id ? [firstPart, secondPart] : [el],
    );

    return {
      elements: newElements,
      firstPart,
      secondPart,
    };
  };

const handleDeleteSubtitle = (wordId, deleting) => {
  const word = transcript.find((w) => w.id === wordId);
  if (!word) return;

  const { start, end } = word;

  if (deleting) {
    const deleteMiddlePart = (currentElements, element) => {
      if (!element) return currentElements;

      let result = splitElement(currentElements, element, start);
      if (!result) return currentElements;

      result = splitElement(result.elements, result.secondPart, end);
      if (!result) return currentElements;

      return result.elements.filter(
        (el) => el.id !== result.firstPart.id
      );
    };

    let updated = elements;

    // camera
    const camera = updated.find(
      (el) =>
        el.track === 1 &&
        el.start <= start &&
        el.end >= start
    );

    updated = deleteMiddlePart(updated, camera);

    // screen
    const screen = updated.find(
      (el) =>
        el.track === 2 &&
        el.start <= start &&
        el.end >= start
    );

    updated = deleteMiddlePart(updated, screen);

    setElements(updated);

    return;
  }

  // RESTORE
  let updated = elements;

  const restoreMiddlePart = (currentElements, track) => {
    const original = originalElements.find(
      (el) =>
        el.track === track &&
        el.start <= start &&
        el.end >= end
    );

    if (!original) return currentElements;

    // Don't add it twice
    const alreadyExists = currentElements.some(
      (el) =>
        el.track === track &&
        el.start <= start &&
        el.end >= end
    );

    if (alreadyExists) return currentElements;

    return [
      ...currentElements,
      {
        ...original,
        id: crypto.randomUUID(),
        start,
        end,
      },
    ].sort((a, b) => a.start - b.start);
  };

  updated = restoreMiddlePart(updated, 1);
  updated = restoreMiddlePart(updated, 2);

  setElements(updated);
};

  const handleRemoveFillers = () => {
    let updatedElements = elements;
    let newTranscript = [...transcript];

    const deleteMiddlePart = (currentElements, element, start, end) => {
      if (!element) return currentElements;

      let result = splitElement(currentElements, element, start);
      if (!result) return currentElements;

      result = splitElement(result.elements, result.secondPart, end);
      if (!result) return currentElements;

      return result.elements.filter((el) => el.id !== result.firstPart.id);
    };

    const fillerWords = transcript.filter(
      (word) => word.isFiller && !word.deleted,
    );

    fillerWords.forEach((word) => {
      const { start, end } = word;

      const camera = updatedElements.find(
        (el) => el.track === 1 && el.start <= start && el.end >= start,
      );

      updatedElements = deleteMiddlePart(updatedElements, camera, start, end);

      const screen = updatedElements.find(
        (el) => el.track === 2 && el.start <= start && el.end >= start,
      );

      updatedElements = deleteMiddlePart(updatedElements, screen, start, end);

      newTranscript = newTranscript.map((w) =>
        w.id === word.id ? { ...w, deleted: true } : w,
      );
    });

    handleUndoRedo({
      elements: updatedElements,
      zooms,
      transcript: newTranscript,
    });

    setElements(updatedElements);
    setTranscript(newTranscript);
  };
  const handleUndoRedo = (newState = null) => {
    let arr = undoArray.current;
    let point = pointer.current;

    const snapshot = JSON.parse(
      JSON.stringify(
        newState || {
          elements,
          zooms,
          transcript,
        },
      ),
    );

    // Remove redo history if new action happens
    if (point < arr.length - 1) {
      arr = arr.slice(0, point + 1);
    }

    arr.push(snapshot);

    // Keep max history
    if (arr.length > MAX_UNDO_ARRAY_LENGTH) {
      arr.shift();
    }

    undoArray.current = arr;
    pointer.current = arr.length - 1;
  };

  const handleUndo = () => {
    if (pointer.current <= 0) {
      toast.error("Cannot undo further.");
      return;
    }
    pointer.current -= 1;

    const prevState = JSON.parse(
      JSON.stringify(undoArray.current[pointer.current]),
    );

    setElements(prevState.elements || []);
    setZooms(prevState.zooms || []);
    setTranscript(prevState.transcript || []);
  };

  const handleRedo = () => {
    if (pointer.current >= undoArray.current.length - 1) {
      toast.error("Cannot redo further.");
      return;
    }

    pointer.current += 1;

    const nextState = JSON.parse(
      JSON.stringify(undoArray.current[pointer.current]),
    );

    setElements(nextState.elements || []);
    setZooms(nextState.zooms || []);
    setTranscript(nextState.transcript || []);
  };

  function useKeyPress(targetKey, callback, { ctrl = false } = {}) {
    useEffect(() => {
      function handleKeyDown(e) {
        const active = document.activeElement;

        // Ignore typing in inputs
        if (
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable
        ) {
          return;
        }

        const keyMatch = e.key.toLowerCase() === targetKey.toLowerCase();
        const ctrlMatch = !ctrl || e.ctrlKey || e.metaKey;

        if (keyMatch && ctrlMatch) {
          e.preventDefault();
          callback(e);
        }
      }

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [targetKey, callback, ctrl]);
  }
  useKeyPress("Delete", () => {
    if (selectedElement) {
      const deletedElement = selectedElement;

  setElements((prev) =>
    prev.filter((el) => el.id !== deletedElement.id)
  );

  if (deletedElement.track === 2) {
    handleCursorZoomAdjustment({
      operation: "delete",
      video: deletedElement,
      deletedIds:[deletedElement.id]
    });
  }
      setSelectedElement(null);
    }
  });

  useKeyPress("s", () => {
    if (selectedElement) {
      handleSplit();
    }
  });

  useKeyPress("ArrowLeft", () => {
    setPlayHeadPosition((p) => Math.max(0, p - 5 * SCALE));
    setCurrentTime((t) => Math.max(0, t - 5));
  });

  useKeyPress("ArrowRight", () => {
    setPlayHeadPosition((p) => p + 5 * SCALE);
    setCurrentTime((t) => t + 5);
  });
  // facing issue
  useKeyPress(" ", () => {
    // if(currentTime <= maxTime) {
    timelineLastTimeRef.current = null;
    setIsPlaying((p) => !p);
    resumeAudioContext();
    // }
  });

  useKeyPress("z", handleUndo, { ctrl: true });
  useKeyPress("y", handleRedo, { ctrl: true });

  const handleRippleDelete = (trackNumber) => {
    // Calculate how much each timeline position shifted
    const updatedTranscript = transcript.map((word) => {
      // Find the amount of gap removed before this word
      let shift = 0;

      trackEls.forEach((el, index) => {
        const updatedEl = updatedTrackEls[index];

        if (word.start >= el.end) {
          shift += el.start - updatedEl.start;
        }
      });

      return {
        ...word,
        start: word.start - shift,
        end: word.end - shift,
      };
    });

    setTranscript(updatedTranscript);

    setElements((prev) => {
      // Get only this track
      const trackEls = prev
        .filter((el) => el.track === trackNumber)
        .sort((a, b) => a.start - b.start);

      if (trackEls.length === 0) return prev;

      let currentTime = trackEls[0].start; // usually 0, but safe

      const updatedTrackEls = trackEls.map((el) => {
        const duration = el.end - el.start;

        const updated = {
          ...el,
          start: currentTime,
          end: currentTime + duration,
        };

        currentTime += duration;

        return updated;
      });

      // Replace only this track in original array
      return prev.map((el) => {
        if (el.track !== trackNumber) return el;

        const updated = updatedTrackEls.find((u) => u.id === el.id);
        return updated || el;
      });
    });
  };
  /* ---------------- RAF LOOP (NEVER CONDITIONAL) ---------------- */

  useEffect(() => {
    const loop = (now) => {
      if (isPlaying) {
        if (!timelineLastTimeRef.current) {
          timelineLastTimeRef.current = now;
        }

        const delta = (now - timelineLastTimeRef.current) / 1000;
        timelineLastTimeRef.current = now;

        // setCurrentTime((t) => t + delta);
        setPlayHeadPosition((p) => p + delta * SCALE);
        // if (currentTime > maxTime) {
        //   setIsPlaying(false);
        // }
        setCurrentTime((t) => {
          const newTime = t + delta;

          if (newTime > maxTime) {
            setIsPlaying(false);
            return maxTime;
          }

          return newTime;
        });
      }

      drawFrame(now);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, drawFrame]);

  useEffect(() => {
    startTour.current = localStorage.getItem("hasVisitedIntroTour")
      ? false
      : true;
    if (isPlaying) {
      setSelectedElement(null);
      setZoomSelected(null);
    }
  }, [isPlaying]);

  useEffect(() => {
    elements.forEach((element) => {
      const video = videoRefs.current[element.id];
      if (video) {
        connectVideoAudio(video, element.id, element.volume);
      }
    });
  }, [elements]);
  // audio
  useEffect(() => {
    elements
      .filter((el) => el.track === 5)
      .forEach((el) => {
        const audio = audioRefs.current[el.id];
        if (!audio || audioNodesRef.current[el.id]) return;

        connectAudioTrack(audio, el.id, el.volume);
      });
  }, [elements]);
  useEffect(() => {
    elements.forEach((element) => {
      const node = audioNodesRef.current[element.id];
      if (node) {
        node.gainNode.gain.value = element.volume / 100;
      }
    });
  }, [elements]);
  useEffect(() => {
    if (
      elements.length > 0 &&
      localStorage.getItem("hasVisitedElementTour") !== "true"
    ) {
      setTimeout(() => startElementTour(elements[0]), 100);
    }
  }, [elements]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("feature_auto_zoom_seen");
    if (!seen) setOpen(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem("feature_auto_zoom_seen", "true");
    setOpen(false);
  };
  const handleCanvasClick = (e) => {
    if (selectedElement !== null) {
      setSelectedElement(null);
      return;
    }
    const arr = [3, 4, 1, 2]; // text, image, camera, screen
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (let i = 0; i < arr.length; i++) {
      const trackNumber = arr[i];
      const els = elements
        .filter((el) => el.track === trackNumber)
        .filter((el) => currentTime >= el.start && currentTime <= el.end)
        .filter((el) => el.x <= clickX && el.x + el.width >= clickX)
        .filter((el) => el.y <= clickY && el.y + el.height >= clickY);

      if (els.length === 0) continue;
      setSelectedElement(els[0]);
      break;
    }
  };

  // fetch saved data
  useEffect(() => {
    const fetchSavedData = async () => {
      const data = await getFromIndexedDB();
      if (!data) return;
      if (
        data.elements.length > 0 ||
        data.zooms.length > 0 ||
        data.tilts.length > 0 ||
        data.transitions.length > 0 ||
        data.transcript.length > 0
      ) {
        setSavedData(data);
        setHasSavedData(true);
        handleUndoRedo({ elements: data.elements, zooms: data.zooms, transcript: data.transcript });
      }
    };
    fetchSavedData();
  }, []);
  /* ---------------- UI ---------------- */

  return (
    <div
      style={{
        color: "#e5e7eb",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Toaster
        position="top-center"
        containerStyle={{
          zIndex: 10000,
        }}
      />
      <Joyride startTour={startTour} steps={steps} tourName={tourName} />
      <div
        className="parent"
        style={{
          display: "flex",
          gap: "34px", // 👈 space between panel & preview
          padding: "16px",
          boxSizing: "border-box",
          overflowX: "auto",
          flexGrow: 1,
        }}
      >
        <div
          className="navbar"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            flex: 1,
          }}
        >
          <div
            style={{
              width: "220px",
              background: "#15151c",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
          <SidebarButton
              icon={<CameraIcon size={18} />}
              label="Record"
              active={activeOption === "record"}
              onClick={() => setActiveOption("record")}
            />
            <SidebarButton
              icon={<MousePointer size={18} />}
              label="Cursor"
              active={activeOption === "cursor"}
              onClick={() => setActiveOption("cursor")}
            />
            <SidebarButton
              icon={<File size={18} />}
              label="Files"
              active={activeOption === "files"}
              onClick={() => setActiveOption("files")}
            />
            <SidebarButton
              icon={<ZoomIn size={18} />}
              label="Zoom"
              active={activeOption === "zoom"}
              onClick={() => setActiveOption("zoom")}
            />
            <SidebarButton
              icon={<Palette size={18} />}
              label="Style"
              active={activeOption === "style"}
              onClick={() => setActiveOption("style")}
            />
            <SidebarButton
              icon={<Settings size={18} />}
              label="Options"
              active={activeOption === "option"}
              onClick={() => setActiveOption("option")}
            />
            <SidebarButton
              icon={<ImageIcon size={18} />}
              label="Background"
              active={activeOption === "background"}
              onClick={() => setActiveOption("background")}
            />
            <SidebarButton
              icon={<TextIcon size={18} />}
              label="Text"
              active={activeOption === "text"}
              onClick={() => setActiveOption("text")}
            />
            <SidebarButton
              icon={<Repeat size={18} />}
              label="Transition"
              active={activeOption === "transition"}
              onClick={() => setActiveOption("transition")}
            />
            <SidebarButton
              icon={<StarIcon size={18} />}
              label="Elements"
              active={activeOption === "elements"}
              onClick={() => setActiveOption("elements")}
            />
            <SidebarButton
              icon={<CaptionsIcon size={18} />}
              label="Subtitles"
              active={activeOption === "subtitles"}
              onClick={() => setActiveOption("subtitles")}
            />
            
          </div>

          {activeOption && (
            <div
              style={{
                background: "#1a1a23",
                padding: "16px",
                borderRadius: "12px",
                marginLeft: "12px",
                minWidth: "220px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {activeOption === "files" && (
                <div
                  style={{
                    padding: "20px",
                    height: "400px",
                    overflowY: "auto",
                  }}
                >
                  {/* Import Button */}
                  <label
                    style={{
                      display: "inline-block",
                      padding: "10px 18px",
                      background: "#f15818",
                      color: "white",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 500,
                      marginBottom: "20px",
                    }}
                  >
                    + Import Media
                    <input
                      type="file"
                      multiple
                      onChange={handleImport}
                      style={{ display: "none" }}
                    />
                  </label>
                  <div
                    style={{
                      flex: 1, // takes remaining space
                      overflowY: "auto", // makes it scroll
                      paddingRight: "6px", // prevents scrollbar overlap
                    }}
                  >
                    {/* Files Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(120px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      {files.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            position: "relative",
                            background: "#1a1a1f",
                            borderRadius: "10px",
                            padding: "8px",
                            overflow: "hidden",
                            cursor: "pointer",
                          }}
                        >
                          {/* Thumbnail */}
                          {item.type.startsWith("image") ? (
                            <img
                              src={item.preview}
                              alt={item.name}
                              style={{
                                width: "100%",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "6px",
                              }}
                            />
                          ) : item.type.startsWith("video") ? (
                            <video
                              src={item.preview}
                              style={{
                                width: "100%",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "6px",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                height: "80px",
                                background: "#2b2b35",
                                borderRadius: "6px",
                              }}
                            />
                          )}
                          {/* DELETE BUTTON */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(item.id);
                            }}
                            style={{
                              position: "absolute",
                              top: "10px",
                              left: "10px",
                              width: "26px",
                              height: "26px",
                              background: "rgba(0,0,0,0.6)",
                              backdropFilter: "blur(4px)",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "14px",
                              color: "white",
                              cursor: "pointer",
                              transition: "0.2s",
                            }}
                          >
                            🗑
                          </div>
                          {/* PLUS OVERLAY */}
                          <div
                            onClick={async (e) => {
                              e.stopPropagation();

                              if (item.type.startsWith("image")) {
                                await addElementToTrack(
                                  item,
                                  4,
                                  playheadPosition / SCALE,
                                );
                              } else if (item.type.startsWith("video")) {
                                setTrackSelector(item);
                              } else if (item.type.startsWith("audio")) {
                                await addElementToTrack(
                                  item,
                                  5,
                                  playheadPosition / SCALE,
                                );
                              }
                            }}
                            style={{
                              position: "absolute",
                              top: "10px",
                              right: "10px",
                              width: "26px",
                              height: "26px",
                              background: "#ff6414",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                              color: "white",
                              fontWeight: "bold",
                              cursor: "pointer",
                              transition: "0.2s",
                            }}
                          >
                            +
                          </div>

                          {/* File Name */}
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#ccc",
                              marginTop: "6px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* track selector */}
              {trackSelector && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 999,
                  }}
                  onClick={() => setTrackSelector(null)}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: "#1a1a1f",
                      padding: "30px",
                      borderRadius: "12px",
                      width: "280px",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    <h3 style={{ color: "white", marginBottom: "20px" }}>
                      Which track?
                    </h3>

                    <button
                      onClick={() => {
                        addElementToTrack(
                          trackSelector.file,
                          2,
                          playheadPosition / SCALE,
                        ); // screen
                        setTrackSelector(null);
                      }}
                    >
                      Screen
                    </button>

                    <button
                      onClick={() => {
                        addElementToTrack(
                          trackSelector.file,
                          1,
                          playheadPosition / SCALE,
                        ); // camera
                        setTrackSelector(null);
                      }}
                    >
                      Camera
                    </button>
                  </div>
                </div>
              )}
              {activeOption === "zoom" && (
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    flexDirection: "column",
                  }}
                >
                  <button onClick={() => addZoom()}>Add Zoom</button>
                  <button
                    onClick={() => {
                      if (zoomSelected != null) {
                        handleUndoRedo({
                          elements,
                          zooms: zooms.filter(
                            (el) => el.id !== zoomSelected.id,
                          ),
                        });
                        setZooms((els) =>
                          els.filter((el) => el.id !== zoomSelected.id),
                        );
                        setZoomSelected(null);
                      }
                    }}
                  >
                    Delete zoom
                  </button>
                </div>
              )}
              {activeOption === "style" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <button
                    onClick={() => {
                      if (!selectedElement) {
                        toast.error("Select an element to crop");
                        return;
                      }
                      if (
                        selectedElement.track === 3 ||
                        selectedElement.track === 5
                      ) {
                        return;
                      }
                      (setElements((prev) =>
                        prev.map((el) => {
                          return el.cropDraft
                            ? { ...el, crop: el.cropDraft, cropDraft: null }
                            : el;
                        }),
                      ),
                        setIsCrop((p) => !p));
                    }}
                  >
                    {isCrop ? "Exit Crop Mode" : "Enter Crop Mode"}
                  </button>
                  {/* change shape to circle */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedElement?.style?.isCircle}
                      onChange={(e) => {
                        if (!selectedElement) {
                          toast.error("Select an element to change shape");
                          return;
                        }
                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement?.id
                              ? {
                                  ...el,
                                  style: {
                                    ...el.style,
                                    isCircle: e.target.checked,
                                  },
                                }
                              : el,
                          ),
                        );
                      }}
                    ></input>
                    <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Change shape to circle
                    </label>
                  </div>
                  {/* Border color */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Border color
                    </label>
                    <input
                      type="color"
                      value={selectedElement?.style?.borderColor || "#000000"}
                      onChange={(e) => {
                        if (!selectedElement) {
                          toast.error(
                            "Select an element to change border color",
                          );
                          return;
                        }

                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement.id
                              ? {
                                  ...el,
                                  style: {
                                    ...el.style,
                                    borderColor: e.target.value,
                                  },
                                }
                              : el,
                          ),
                        );
                      }}
                    />

                    <button
                      onClick={() => {
                        if (!selectedElement) return;

                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement.id
                              ? {
                                  ...el,
                                  style: {
                                    ...el.style,
                                    borderColor: null, // or undefined
                                  },
                                }
                              : el,
                          ),
                        );
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  {/* Border thickness */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Border Thickness
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    onChange={(e) => {
                      if (!selectedElement) {
                        toast.error(
                          "Select an element to change border thickness",
                        );
                        return;
                      }
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  borderWidth: e.target.value,
                                },
                              }
                            : el,
                        ),
                      );
                    }}
                  />
                  {/* Border match */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Match border with shape (for images with transparent
                    background)
                  </label>
                  <input
                    type="checkbox"
                    value={selectedElement?.style?.matchShape}
                    onChange={(e) => {
                      if (!selectedElement) {
                        toast.error(
                          "Select an element to match border with shape",
                        );
                        return;
                      }
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  matchShape: e.target.checked,
                                },
                              }
                            : el,
                        ),
                      );
                    }}
                  />
                  {/* Border radius */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Border Radius
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    onChange={(e) => {
                      if (!selectedElement) {
                        toast.error(
                          "Select an element to change border radius",
                        );
                        return;
                      }
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  borderRadius: Number(e.target.value),
                                },
                              }
                            : el,
                        ),
                      );
                    }}
                  />
                  {/* Shadow */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Shadow
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  shadow: Number(e.target.value),
                                },
                              }
                            : el,
                        ),
                      )
                    }
                  />
                  {/* Hue */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Hue
                  </label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    defaultValue={selectedElement?.style?.hue || 0}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  hue: Number(e.target.value),
                                },
                              }
                            : el,
                        ),
                      )
                    }
                  />

                  {/* Saturation */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Saturation
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    defaultValue={selectedElement?.style?.saturation || 1}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  saturation: Number(e.target.value),
                                },
                              }
                            : el,
                        ),
                      )
                    }
                  />

                  {/* Brightness */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Brightness
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    defaultValue={selectedElement?.style?.brightness || 1}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  brightness: Number(e.target.value),
                                },
                              }
                            : el,
                        ),
                      )
                    }
                  />

                  {/* Contrast */}
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Contrast
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    defaultValue={selectedElement?.style?.contrast || 1}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement?.id
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  contrast: Number(e.target.value),
                                },
                              }
                            : el,
                        ),
                      )
                    }
                  />
                </div>
              )}
              {activeOption === "option" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "5px",
                    }}
                  >
                    <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Volume
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue={selectedElement?.volume || 0}
                      onChange={(e) => {
                        const newVolume = Number(e.target.value);

                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement?.id
                              ? { ...el, volume: newVolume }
                              : el,
                          ),
                        );
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                    If volume change does not take effect, try sliding the
                    handle again
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "5px",
                    }}
                  >
                    <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Speed
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step={0.1}
                      defaultValue={selectedElement?.speed || 1}
                      onChange={(e) => {
                        if (!selectedElement) {
                          toast.error(
                            "Please select a video before changing speed",
                          );
                          return;
                        }
                        if (selectedElement?.track > 2) {
                          toast.error("Speed can only be changed for videos");
                          return;
                        }
                        const newSpeed = Number(e.target.value);
                        const currentEnd = selectedElement.end;
                        const currentDuration =
                          selectedElement.end - selectedElement.start;
                        const newEnd =
                          Number(selectedElement.start) +
                          Number(
                            (
                              (currentDuration * selectedElement.speed) /
                              newSpeed
                            ).toFixed(2),
                          );
                        // console.log("duration", currentDuration, "new end: ", newEnd)
                        // setElements((prev) =>
                        //   prev.map((el) =>
                        //     el.id === selectedElement?.id
                        //       ? { ...el, speed: newSpeed, end: newEnd }
                        //       : el,
                        //   ),
                        // );
                        if(selectedElement.track == 2) {
                          setZooms((prevZooms) =>
                            speedCursorZooms(prevZooms, selectedElement, newSpeed)
                          );
                        }
                        setElements((prev) => {
                          // update selected clip first
                          let updated = prev.map((el) =>
                            el.id === selectedElement.id
                              ? {
                                  ...el,
                                  speed: newSpeed,
                                  end: newEnd,
                                }
                              : { ...el },
                          );

                          // only same track
                          const sameTrack = updated
                            .filter((el) => el.track === selectedElement.track)
                            .sort((a, b) => a.start - b.start);

                          // difference added to timeline
                          const delta = newEnd - currentEnd;

                          // if clip became longer
                          if (delta > 0) {
                            let shouldShift = false;

                            sameTrack.forEach((clip) => {
                              if (clip.id === selectedElement.id) {
                                shouldShift = true;
                                return;
                              }

                              // shift every clip after selected
                              if (shouldShift) {
                                clip.start += delta;
                                clip.end += delta;
                              }
                            });
                          }

                          return updated;
                        });
                        setSpeedValue(newSpeed);
                        setSelectedElement((prev) =>
                          prev
                            ? { ...prev, speed: newSpeed, end: newEnd }
                            : prev,
                        );
                        
                      }}
                    />
                    <label>{speedValue}x</label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "15px",
                    }}
                  >
                    <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Hide camera video?
                    </label>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (!selectedElement || selectedElement?.track !== 1) {
                          toast.error(
                            "Please select a camera video before changing visibility",
                          );
                          return;
                        }
                        if(selectedElement && selectedElement?.track == 1) {
                          setElements((prev) => {
                            return prev.map((el) =>
                              el.id === selectedElement.id
                                ? {
                                    ...el,
                                    hideDisplay:e.target.checked
                                  }
                                : { ...el },
                            );

                          })
                        }
                      }}
                    />
                  </div>
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                    onClick={async () => {
                      if (isNotPaidUser) {
                        if (user === null || !user?.isLoggedIn) {
                          setLoginDialogOpen(true);
                        } else {
                          setPricingDialogOpen(true);
                        }
                      } else if (
                        !selectedElement ||
                        selectedElement.track > 2
                      ) {
                        toast.error(
                          "Select a video element to remove background",
                        );
                      } else {
                        await captureVideo();
                      }
                    }}
                  >
                    <span>Remove Video Background</span>
                    <CrownIcon size={12} color="#facc15" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        !selectedElement ||
                        (selectedElement.track !== 1 &&
                          selectedElement.track !== 2)
                      ) {
                        toast.error("Select a video element to split audio");
                        return;
                      }
                      splitAudioFast(
                        selectedElement?.source,
                        setIsSplittingAudio,
                      );
                    }}
                  >
                    {isSplittingAudio ? "Splitting..." : "Split audio"}
                  </button>
                  <button
                    onClick={() => {
                      addEffect("move-down");
                    }}
                  >
                    {selectedElement && selectedElement.effect === "move-down"
                      ? "Remove move-down effect"
                      : "Add move-down effect"}
                  </button>
                  <button onClick={() => addSpotlight()}>
                    Add spotlight effect
                  </button>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#9ca3af",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Choose Video Effect
                  </span>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      defaultValue={selectedVideoEffect}
                      onChange={(e) => {
                        if (selectedElement && selectedElement.track === 6) {
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement?.id
                                ? {
                                    ...el,
                                    effect: e.target.value,
                                  }
                                : el,
                            ),
                          );
                        }
                        setSelectedVideoEffect(e.target.value);
                      }}
                      style={{
                        background: "#1f2937",
                        color: "white",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "14px",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {Object.entries(FX_NAMES).map(([key, value]) => (
                        <option value={value} key={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        addSpotlight(4, selectedVideoEffect);
                      }}
                      style={{
                        background:
                          "linear-gradient(180deg, #383838 0%, #2a2a2a 100%)",
                        color: "#f8f8f8",
                        border: "1px solid #474747",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        letterSpacing: ".2px",
                        cursor: "pointer",
                        boxShadow:
                          "0 1px 0 rgba(255,255,255,.06) inset, 0 8px 18px rgba(0,0,0,.32)",
                        transition: "all .18s ease",
                      }}
                    >
                      Add Effect
                    </button>
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#9ca3af",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Choose Tilt (works only for videos)
                  </span>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      defaultValue={selectedTilt}
                      onChange={(e) => {
                        if (selectedElement && selectedElement.track === 6) {
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement?.id
                                ? {
                                    ...el,
                                    effect: e.target.value,
                                  }
                                : el,
                            ),
                          );
                        }

                        setSelectedTilt(e.target.value);
                      }}
                      style={{
                        background: "#1f2937",
                        color: "white",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "14px",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="tiltnone">None</option>

                      {Object.entries(tilts).map(([key]) => (
                        <option value={key} key={key}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        if (selectedTilt === "tiltnone") return;

                        addSpotlight(5, selectedTilt);

                        // OR if applying directly:
                        // addEffect(selectedTilt);
                      }}
                      style={{
                        background:
                          "linear-gradient(180deg, #383838 0%, #2a2a2a 100%)",
                        color: "#f8f8f8",
                        border: "1px solid #474747",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        letterSpacing: ".2px",
                        cursor: "pointer",
                        boxShadow:
                          "0 1px 0 rgba(255,255,255,.06) inset, 0 8px 18px rgba(0,0,0,.32)",
                        transition: "all .18s ease",
                      }}
                    >
                      Add Tilt Effect
                    </button>
                  </div>
                </div>
              )}
              {activeOption === "background" && (
                <>
                  <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Background gets added behind all other elements and covers
                    the entire canvas.
                  </label>
                  <div className="background-grid">
                    <button
                      className="bg-button"
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        border: "1px dashed #333",
                        background:
                          "repeating-conic-gradient(#1a1a23 0% 25%, #111 0% 50%) 50% / 12px 12px",
                        color: "#ccc",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onClick={() => {
                        setCanvasBg(null);
                      }}
                    >
                      None
                    </button>
                    {backgrounds.map((bg, index) => (
                      <img
                        key={index}
                        src={bg}
                        className="bg-button"
                        loading="lazy"
                        onClick={() => {
                          setCanvasBg(bg);
                          if (elements.length === 0) {
                            toast.success(
                              "Background set! Add an element on timeline to see it in action",
                              { duration: 3000 },
                            );
                          }
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
              {activeOption === "text" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {" "}
                  {(!selectedElement || selectedElement.track != 3) && (
                    <>
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Animation
                      </label>
                      <select
                        value={textAnimation}
                        onChange={(e) => setTextAnimation(e.target.value)}
                      >
                        {Object.values(textTypes).map((val, index) => {
                          return (
                            <option value={val} key={index}>
                              {val}
                            </option>
                          );
                        })}
                      </select>
                      <button onClick={() => addText()}>Add text</button>
                    </>
                  )}
                  {selectedElement?.track == 3 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                      }}
                    >
                      {/* Text animation */}
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Animation
                      </label>
                      <select
                        defaultValue={selectedElement.textAnimation}
                        onChange={(e) => {
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement?.id
                                ? {
                                    ...el,
                                    textAnimation: e.target.value,
                                  }
                                : el,
                            ),
                          );
                        }}
                      >
                        {Object.values(textTypes).map((val, index) => {
                          return (
                            <option value={val} key={index}>
                              {val}
                            </option>
                          );
                        })}
                      </select>
                      {/* Text */}
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Text
                      </label>
                      <textarea
                        placeholder="Add text here"
                        onChange={(e) =>
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement?.id
                                ? {
                                    ...el,
                                    text: e.target.value,
                                  }
                                : el,
                            ),
                          )
                        }
                        defaultValue={selectedElement?.text}
                      ></textarea>
                      {/* Font Family */}
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Font Family
                      </label>
                      <select
                        defaultValue={"Arial"}
                        onChange={(e) => {
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement?.id
                                ? {
                                    ...el,
                                    style: {
                                      ...el.style,
                                      fontFamily: e.target.value,
                                    },
                                  }
                                : el,
                            ),
                          );
                        }}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Inter">Inter</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Anton">Anton</option>
                        <option value="Bebas Neue">Bebas Neue</option>
                        <option value="Oswald">Oswald</option>
                        <option value="Playfair Display">
                          Playfair Display
                        </option>
                        <option value="JetBrains Mono">JetBrains Mono</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Source Code Pro">Source Code Pro</option>
                      </select>
                      {/* Font Color */}
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Font Color
                      </label>
                      <input
                        type="color"
                        onChange={(e) =>
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement?.id
                                ? {
                                    ...el,
                                    style: {
                                      ...el.style,
                                      color: e.target.value,
                                    },
                                  }
                                : el,
                            ),
                          )
                        }
                      />
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Place text behind camera video
                      </label>
                      <input
                        type="checkbox"
                        checked={selectedElement?.textBehindVideo}
                        onChange={(e) => {
                          setElements((prev) =>
                            prev.map((el) =>
                              el.id === selectedElement.id
                                ? { ...el, textBehindVideo: e.target.checked }
                                : el,
                            ),
                          );
                          setSelectedElement((prev) => ({
                            ...prev,
                            textBehindVideo: e.target.checked,
                          }));
                        }}
                      />{" "}
                    </div>
                  )}
                </div>
              )}
              {activeOption === "transition" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {" "}
                  {(!selectedElement || selectedElement.track !== 2) && (
                    <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Select a screen video to add transitions
                    </label>
                  )}
                  {selectedElement?.track == 2 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                      }}
                    >
                      {/* Transitions */}
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Transition
                      </label>
                      <select
                        defaultValue={transitionType}
                        onChange={(e) => {
                          setTransitionType(e.target.value);
                        }}
                      >
                        {Object.values(transitionTypes).map((val, index) => {
                          return (
                            <option value={val} key={index}>
                              {val}
                            </option>
                          );
                        })}
                      </select>
                      {transitions.find((t) => t.id === selectedElement.id) ? (
                        <button
                          onClick={() =>
                            setTransitions((prev) =>
                              prev.filter((el) => el.id !== selectedElement.id),
                            )
                          }
                        >
                          {" "}
                          Remove transition
                        </button>
                      ) : (
                        <button onClick={() => addTransition(transitionType)}>
                          Add transition
                        </button>
                      )}
                      <label style={{ fontSize: "13px", color: "#9ca3af" }}>
                        Transitions get added to the end of the video
                      </label>
                    </div>
                  )}
                </div>
              )}
              {activeOption === "elements" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <select
                    value={selection.type}
                    onChange={(e) => {
                      const type = e.target.value;

                      setSelection({
                        type,
                        variant: type === "titleCard" ? "retroScanCard" : "slide", // ✅ default here
                      });
                    }}
                  >
                    <option value="titleCard">Title Card</option>
                    <option value="lowerThird">Lower Third</option>
                  </select>

                  {/* VARIANT SELECT */}
                  <select
                    value={selection.variant}
                    onChange={(e) => {
                      const value = e.target.value;

                      // Update selected element if editing
                      if (selectedElement && selectedElement.track === 6) {
                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement.id
                              ? { ...el, effect: value }
                              : el,
                          ),
                        );
                      }

                      setSelection((prev) => ({
                        ...prev,
                        variant: value,
                      }));
                    }}
                  >
                    {selection.type === "titleCard" &&
                      Object.values(titleCardTypes).map((val, index) => (
                        <option value={val} key={index}>
                          {val}
                        </option>
                      ))}

                    {selection.type === "lowerThird" &&
                      Object.values(lowerThirdTypes).map((val, index) => (
                        <option value={val} key={index}>
                          {val}
                        </option>
                      ))}
                  </select>

                  {/* TEXT EDITOR (only for track 6 selected element) */}
                  {selectedElement && selectedElement.track === 6 && (
                    <textarea
                      placeholder="Add text here"
                      defaultValue={selectedElement.text || ""}
                      onChange={(e) =>
                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement.id
                              ? { ...el, text: e.target.value }
                              : el,
                          ),
                        )
                      }
                    />
                  )}

                  {/* ADD BUTTON */}
                  {(!selectedElement || selectedElement.track !== 6) && (
                    <button
                      onClick={() => {
                        addSpotlight(4, selection.variant); // ✅ always valid now
                      }}
                    >
                      Add element
                    </button>
                  )}
                </div>
              )}
              {activeOption === "subtitles" && (
                <SubtitleEditor
                  setPlayHeadPosition={setPlayHeadPosition}
                  setCurrentTime={setCurrentTime}
                  SCALE={SCALE}
                  transcript={transcript}
                  setTranscript={setTranscript}
                  SUBTITLE_STYLES={SUBTITLE_STYLES}
                  setSubtitleStyle={setSubtitleStyle}
                  handleDeleteSubtitle={handleDeleteSubtitle}
                  handleRemoveFillers={handleRemoveFillers}
                  handleUndoRedo={handleUndoRedo}
                  elements={elements}
                  zooms={zooms}
                  generateTranscript={captureVideoForTranscript}
                  originalTranscript={originalTranscript}
                  setDisplaySubtitles={setDisplaySubtitles}
                  setSubtitlePosition={setSubtitlePosition}
                  isNotPaidUser={isNotPaidUser}
                  setLoginDialogOpen={setLoginDialogOpen}
                  setPricingDialogOpen={setPricingDialogOpen}
                />
              )}
              {
                activeOption === "record" && (
                  <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
               <RecordPanel onRecorded={handleRecordingFinished} />
                </div>
                )
              }
              {
                activeOption === "cursor" && (
                  <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                <CursorPanel
                  style={cursorStyle}
                  setStyle={setCursorStyle}
                  zooms={zooms}
                  setZooms={setZooms}
                  onJump={seekTo}
                  hasTrack={Object.keys(cursorTracks).length > 0}
                />
                </div>
                )
              }
            </div>
          )}
        </div>
        <div
          className="preview"
          style={{
            width: "60%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="canvas-wrapper"
            style={{
              position: "relative",
              width: DISPLAY_WIDTH,
              height: DISPLAY_HEIGHT,
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{
                width: `${DISPLAY_WIDTH}px`,
                height: `${DISPLAY_HEIGHT}px`,
                border: "1px solid #ccc",
              }}
            />
            {isNotPaidUser && (
              <div
                className="watermark-container"
                style={{ display: isExport ? "none" : "block" }}
              >
                <div className="watermark-card">
                  <Sparkles className="watermark-icon" />

                  <span className="watermark-text">
                    Made with{" "}
                    <span className="watermark-brand">RookieClip</span>
                  </span>
                </div>

                <button
                  className="watermark-close"
                  onClick={() => {
                    if (user === null || !user?.isLoggedIn) {
                      setLoginDialogOpen(true);
                    } else {
                      setPricingDialogOpen(true);
                    }
                  }}
                >
                  X
                </button>
              </div>
            )}
          </div>

          {selectedElement && selectedElement.track !== 6 && !isPlaying && (
            <Layer
              element={elements.find((item) => item.id === selectedElement.id)}
              setElements={setElements}
              isCrop={isCrop}
              parentHeight={DISPLAY_HEIGHT}
              parentWidth={DISPLAY_WIDTH}
              setSelectedElement={setSelectedElement}
            />
          )}
          {selectedElement &&
            selectedElement.track === 6 &&
            selectedElement.effect === null &&
            !isPlaying && (
              <SpotlightBox
                parentHeight={DISPLAY_HEIGHT}
                parentWidth={DISPLAY_WIDTH}
                spotlight={selectedElement}
                setSpotlights={setElements}
              />
            )}
          {zoomSelected && zoomSelected.type !== "cursor" && !isPlaying && (
            <ZoomBox
              zoom={zoomSelected}
              parentWidth={DISPLAY_WIDTH}
              parentHeight={DISPLAY_HEIGHT}
              setZoomSelected={setZoomSelected}
              setZooms={setZooms}
            />
          )}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
              background: "#1a1a23",
              padding: "12px",
              borderRadius: "12px",
              width: `${720}px`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.02)",
            }}
          >
            <span>{formatTimecode(currentTime)}</span>

            <button
              onClick={() => {
                if (elements.length === 0) {
                  toast.error("Add an element to the timeline to play");
                  return;
                }
                timelineLastTimeRef.current = null;
                setIsPlaying((p) => !p);
                resumeAudioContext();
              }}
              style={{
                background: "#2563eb",
                border: "none",
                padding: "10px",
                borderRadius: "50%",
                cursor: "pointer",
                color: "white",
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <span>{formatTimecode(maxTime)}</span>
            <select
              id="aspect"
              defaultValue={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
            </select>
            <button
              onClick={async () => {
                await downloadCanvasAsPNG(canvasRef.current);
              }}
            >
              <ImageIcon size={16} />
            </button>
          </div>
        </div>
      </div>
      {/* Hidden video sources */}
      <div style={{ display: "none" }}>
        {elements
          .filter((el) => el.track === 1 || el.track === 2)
          .map((el) => (
            <video
              key={el.id}
              ref={(node) => {
                if (node) {
                  videoRefs.current[el.id] = node;
                  node.playbackRate = el.speed ?? 1;
                }
              }}
              src={el.source}
              preload="auto"
              playsInline
              crossOrigin="anonymous"
            />
          ))}
      </div>
      {/* Hidden image sources */}
      <div style={{ display: "none" }}>
        {elements
          .filter((el) => el.track === 4)
          .map((el) => (
            <img
              key={el.id}
              ref={(node) => {
                if (node) {
                  imageRefs.current[el.id] = node;
                }
              }}
              src={el.source}
            />
          ))}
      </div>
      {/* Hidden audio sources */}
      <div style={{ display: "none" }}>
        {elements
          .filter((el) => el.track === 5)
          .map((el) => (
            <audio
              key={el.id}
              ref={(node) => {
                if (node) {
                  audioRefs.current[el.id] = node;
                }
              }}
              src={el.source}
              preload="auto"
              crossOrigin="anonymous"
            />
          ))}
      </div>
      {/* Timeline */}
      <div
        className="timeline"
        style={{
          position: "relative",
          background: "#111118",
          color: "#e5e7eb",

          marginTop: "20px",
          marginLeft: "20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100vw",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "16px",
            padding: "12px",
            background: "#15151c",
            borderRadius: "12px",
          }}
        >
          <IconButton
            icon={<Undo size={16} />}
            label="Undo"
            onClick={handleUndo}
          />
          <IconButton
            icon={<Redo size={16} />}
            label="Redo"
            onClick={handleRedo}
          />
          <IconButton
            icon={<Trash2 size={16} />}
            label="Delete Element"
            onClick={() => {
              if (selectedElement) {
                setElements((els) => {
                  const updated = els.filter(
                    (el) => el.id !== selectedElement.id,
                  );

                  handleUndoRedo({ elements: updated, zooms });

                  return updated;
                });
                handleCursorZoomAdjustment({
                    operation: "delete",
                    deletedIds: [selectedElement.id]
                });
                setTransitions((prev) =>
                  prev.filter((el) => el.id !== selectedElement.id),
                );
                setSelectedElement(null);
              }
            }}
          />
          <IconButton
            icon={<Trash size={16} />}
            label="Delete All Gaps"
            onClick={() => {
              if (!selectedElement?.track) {
                toast.error("Select an element first");
                return;
              }

              handleRippleDelete(selectedElement.track);
              toast.success("All gaps removed from track");
            }}
          />
          <IconButton
            icon={<Scissors size={16} />}
            label="Split"
            onClick={handleSplit}
          />
          <IconButton
            icon={<ArrowBigLeft size={16} />}
            label="Move to 0"
            onClick={() => {
              setCurrentTime(0);
              setPlayHeadPosition(0);
            }}
          />
          <IconButton
            icon={<Download size={16} />}
            label="Export"
            onClick={async () => {
              setExportBlob(null);
              setShareableLink(null);
              await exportTimeline();
            }}
            styles={{ background: "#3438dd" }}
          />
          <IconButton
            icon={<Save size={16} />}
            label="Save"
            onClick={async () => {
              toast.success("Saving project...");
              addToIndexedDB(elements, zooms, transitions, canvasBg, transcript, cursorTracks)
                .then(() => {
                  toast.success("Project saved!");
                })
                .catch((err) => {
                  toast.error("Error saving project");
                  console.log(err);
                });
            }}
            styles={{ background: "#9707d9" }}
          />
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              color: "#ffffff",
              border: "none",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "0.2s",
              fontWeight: "500",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "translateY(-1px)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
            data-tally-open="aQGLGy"
            data-tally-layout="modal"
            data-tally-emoji-text="👋"
            data-tally-emoji-animation="wave"
            data-tally-auto-close="1000"
          >
            Share Feedback
          </button>
          {user?.isLoggedIn && 
          <IconButton
            icon={<LogOutIcon size={16} />}
            label="Log out"
            onClick={async () => {
              
              await logout();
              toast.success("Logged out successfully!");
              
            }}
            styles={{ background: "#9707d9" }}
          />
}
        </div>

        <div
          ref={scrollRef}
          style={{
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          <div
            style={{
              position: "relative",
              width: timelineWidth,
            }}
          >
            {/* 🔥 GLOBAL PLAYHEAD (over everything) */}
            <div
              style={{
                position: "absolute",
                left: playheadPosition,
                top: 0,
                bottom: 0,
                width: 2,
                background: "#ef4444",
                zIndex: 50,
                pointerEvents: "none", // allows clicking through
              }}
            />

            {/* Click area */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                seekTo(x / SCALE);
              }}
              style={{
                position: "relative",
                backgroundColor: "#2a2a35",
                height: "30px",
                cursor: "pointer",
              }}
            >
              {/* Time bars */}
              {Array.from({ length: Math.ceil(maxTime) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: i * SCALE,
                    top: 0,
                    bottom: 0,
                    width: "1px",
                    background: i % 5 === 0 ? "#9ca3af" : "#4b5563", // bigger bar every 5s
                    height: i % 5 === 0 ? "100%" : "40%",
                  }}
                />
              ))}
            </div>

            {/* Tracks wrapper */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                marginTop: "4px",
              }}
            >
              <div
                className="track"
                style={{
                  backgroundColor: "#1f1f2a",
                  borderRadius: "6px",
                  height: "40px",
                  position: "relative",
                }}
              >
                {zooms.map((z) => (
                  <TrackElement
                    key={z.id}
                    el={z}
                    SCALE={SCALE}
                    selectedElement={zoomSelected}
                    setSelectedElement={setZoomSelected}
                    setElements={setZooms}
                    type={z.type === "cursor" ? "cursorZoom" : "zoom" }
                    setTransitions={setTransitions}
                    toast={toast}
                  />
                ))}
                {zooms.length === 0 && (
                  <span
                    style={{
                      color: "#6b6b80",
                      fontSize: "15px",
                      pointerEvents: "none", // important so drag still works
                      userSelect: "none",
                      marginLeft: "50px",
                    }}
                  >
                    Zooms will come here
                  </span>
                )}
              </div>
              <div
                className="track"
                style={{
                  backgroundColor: "#1f1f2a",
                  borderRadius: "6px",
                  height: "40px",
                  position: "relative",
                }}
              >
                {elements
                  .filter((el) => el.track === 6)
                  .map((el, id) => (
                    <TrackElement
                      key={el.id}
                      el={el}
                      SCALE={SCALE}
                      selectedElement={selectedElement}
                      setSelectedElement={setSelectedElement}
                      setElements={setElements}
                      type="effect"
                      setTransitions={setTransitions}
                      handleUndoRedo={handleUndoRedo}
                      toast={toast}
                    />
                  ))}
                {elements.filter((el) => el.track === 6).length === 0 && (
                  <span
                    style={{
                      color: "#6b6b80",
                      fontSize: "15px",
                      pointerEvents: "none", // important so drag still works
                      userSelect: "none",
                      marginLeft: "50px",
                    }}
                  >
                    Effects will come here
                  </span>
                )}
              </div>
              <div
                className="track"
                style={{
                  backgroundColor: "#1f1f2a",
                  borderRadius: "6px",
                  height: "40px",
                  position: "relative",
                }}
              >
                {elements
                  .filter((el) => el.track === 3)
                  .map((el, id) => (
                    <TrackElement
                      key={el.id}
                      el={el}
                      SCALE={SCALE}
                      selectedElement={selectedElement}
                      setSelectedElement={setSelectedElement}
                      setElements={setElements}
                      type="text"
                      setTransitions={setTransitions}
                      handleUndoRedo={handleUndoRedo}
                      toast={toast}
                    />
                  ))}
                {elements.filter((el) => el.track === 3).length === 0 && (
                  <span
                    style={{
                      color: "#6b6b80",
                      fontSize: "15px",
                      pointerEvents: "none", // important so drag still works
                      userSelect: "none",
                      marginLeft: "50px",
                    }}
                  >
                    Texts will come here
                  </span>
                )}
              </div>
              <div
                className="track"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropImage(e, 4)}
                style={{
                  backgroundColor: "#1f1f2a",
                  borderRadius: "6px",
                  height: "40px",
                  position: "relative",
                }}
              >
                {elements
                  .filter((el) => el.track === 4)
                  .map((el, id) => (
                    <TrackElement
                      key={el.id}
                      el={el}
                      SCALE={SCALE}
                      selectedElement={selectedElement}
                      setSelectedElement={setSelectedElement}
                      setElements={setElements}
                      type="image"
                      setTransitions={setTransitions}
                      handleUndoRedo={handleUndoRedo}
                      toast={toast}
                    />
                  ))}
                {elements.filter((el) => el.track == 4).length === 0 && (
                  <span
                    style={{
                      color: "#6b6b80",
                      fontSize: "15px",
                      pointerEvents: "none", // important so drag still works
                      userSelect: "none",
                      marginLeft: "50px",
                    }}
                  >
                    Images will come here
                  </span>
                )}
              </div>
              <div
                className="track"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 1)}
                style={{
                  backgroundColor: "#1f1f2a",
                  borderRadius: "6px",
                  height: "40px",
                  position: "relative",
                }}
              >
                {elements
                  .filter((el) => el.track === 1)
                  .map((el, id) => (
                    <TrackElement
                      key={el.id}
                      el={el}
                      SCALE={SCALE}
                      selectedElement={selectedElement}
                      setSelectedElement={setSelectedElement}
                      setElements={setElements}
                      type="element"
                      setTransitions={setTransitions}
                      handleUndoRedo={handleUndoRedo}
                      toast={toast}
                    />
                  ))}
                {elements.filter((el) => el.track == 1).length === 0 && (
                  <span
                    style={{
                      color: "#6b6b80",
                      fontSize: "15px",
                      pointerEvents: "none", // important so drag still works
                      userSelect: "none",
                      marginLeft: "50px",
                    }}
                  >
                    Camera video will come here
                  </span>
                )}
              </div>

              <div
                className="track"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 2)}
                style={{
                  backgroundColor: "#1f1f2a",
                  borderRadius: "6px",
                  height: "40px",
                  position: "relative",
                }}
              >
                {elements
                  .filter((el) => el.track === 2)
                  .map((el) => (
                    <TrackElement
                      key={el.id}
                      el={el}
                      SCALE={SCALE}
                      selectedElement={selectedElement}
                      setSelectedElement={setSelectedElement}
                      setElements={setElements}
                      type="element"
                      setTransitions={setTransitions}
                      handleUndoRedo={handleUndoRedo}
                      toast={toast}
                      trimCursorZooms={trimCursorZooms}
                    />
                  ))}
                {elements.filter((el) => el.track == 2).length === 0 && (
                  <span
                    style={{
                      color: "#6b6b80",
                      fontSize: "15px",
                      pointerEvents: "none", // important so drag still works
                      userSelect: "none",
                      marginLeft: "50px",
                    }}
                  >
                    Screen video will come here
                  </span>
                )}
              </div>
              <div
                className="track"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropAudio(e, 5)}
                style={{
                  backgroundColor: "#1f1f2a",
                  borderRadius: "6px",
                  height: "40px",
                  position: "relative",
                }}
              >
                {elements
                  .filter((el) => el.track === 5)
                  .map((el, id) => (
                    <TrackElement
                      key={el.id}
                      el={el}
                      SCALE={SCALE}
                      selectedElement={selectedElement}
                      setSelectedElement={setSelectedElement}
                      setElements={setElements}
                      type="audio"
                      setTransitions={setTransitions}
                      handleUndoRedo={handleUndoRedo}
                      toast={toast}
                    />
                  ))}
                {elements.filter((el) => el.track == 5).length === 0 && (
                  <span
                    style={{
                      color: "#6b6b80",
                      fontSize: "15px",
                      pointerEvents: "none", // important so drag still works
                      userSelect: "none",
                      marginLeft: "50px",
                    }}
                  >
                    Audio will come here
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* <FeatureDialog open={open} onClose={handleClose} /> */}
      {isExport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#1f1f2a",
              padding: "30px 40px",
              borderRadius: "12px",
              color: "white",
              fontSize: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "320px",
              position: "relative",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setIsExport(false);
                setExportBlob(null);
                setShareableLink(null);
                setIsUploading(false);
                setUploadProgress(0);
                setIsPlaying(false);
              }}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: "18px",
                cursor: "pointer",
                marginBottom: "10px",
              }}
            >
              x
            </button>
            {/* export */}
            {!isUploading && !exportBlob && !shareableLink && (
              <>
                <label style={{ fontWeight: 500 }}>
                  {currentTime < maxTime
                    ? "Exporting video..."
                    : "Export completed!"}
                </label>

                {/* Progress Bar */}
                <progress
                  value={(currentTime / maxTime) * 100}
                  max={100}
                  style={{
                    width: "100%",
                    height: "8px",
                  }}
                />

                <span style={{ fontSize: "13px", color: "#aaa" }}>
                  {Math.floor((currentTime / maxTime) * 100)}%
                </span>
              </>
            )}

            {isUploading && !shareableLink && (
              <div style={{ marginTop: "10px" }}>
                <label style={{ fontSize: "13px" }}>Uploading video...</label>
                <progress
                  value={uploadProgress}
                  max={100}
                  style={{
                    width: "100%",
                    height: "8px",
                    marginTop: "5px",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#aaa" }}>
                  {Math.floor(uploadProgress)}%
                </span>
              </div>
            )}
            {shareableLink && (
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  background: "#2c2c3a",
                  padding: "12px",
                  borderRadius: "10px",
                }}
              >
                <label style={{ fontSize: "12px", color: "#aaa" }}>
                  Shareable Link
                </label>

                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    value={shareableLink}
                    readOnly
                    onClick={(e) => e.target.select()}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #3a3a4a",
                      background: "#1a1a22",
                      color: "#eee",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />

                  <button
                    onClick={(e) => {
                      navigator.clipboard.writeText(shareableLink);
                      const btn = e.currentTarget;
                      const original = btn.innerText;
                      btn.innerText = "Copied!";
                      btn.style.background = "#16a34a";

                      setTimeout(() => {
                        btn.innerText = original;
                        btn.style.background = "#3b82f6";
                      }, 1200);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#3b82f6",
                      color: "white",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "0.2s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#2563eb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#3b82f6")
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
            {currentTime < maxTime && (
              <button
                onClick={() => cancelExport()}
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2c2c3a",
                  color: "#ff4d4f",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#3a3a4a")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#2c2c3a")
                }
              >
                Cancel Export
              </button>
            )}

            {currentTime >= maxTime && (
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                {/* Download Button */}
                <button
                  onClick={() => downloadExport()}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#2c2c3a",
                    color: "#ffffff",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "0.2s",
                    flex: 1,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#3a3a4a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#2c2c3a")
                  }
                >
                  Download Export
                </button>

                {/* Shareable Link Button */}
                <button
                  onClick={() => handleShare()}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#3b82f6",
                    color: "#ffffff",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#2563eb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#3b82f6")
                  }
                >
                  Get Shareable Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {hasSavedData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "420px",
              background: "#1e1e2a",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "sans-serif",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "10px",
                color: "#fff",
                fontSize: "18px",
              }}
            >
              Load previous project?
            </h3>

            <p
              style={{
                margin: 0,
                marginBottom: "20px",
                color: "#a1a1aa",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              We found a saved project. You can continue where you left off or
              start fresh.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              {/* Delete Button */}
              <button
                onClick={async () => {
                  await clearIndexedDB();
                  window.location.reload(); // simple reset without state
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #3f3f46",
                  color: "#a1a1aa",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseOver={(e) => (e.target.style.borderColor = "#71717a")}
                onMouseOut={(e) => (e.target.style.borderColor = "#3f3f46")}
              >
                Delete
              </button>

              {/* Load Button */}
              <button
                onClick={() => {
                  setElements(savedData.elements);
                  setZooms(savedData.zooms);
                  setTransitions(savedData.transitions);
                  setCanvasBg(savedData.canvasBg);
                  setOriginalTranscript(savedData.transcript)
                  setTranscript(savedData.transcript);
                  setCursorTracks(savedData.cursorTracks)
                  setHasSavedData(false);
                }}
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "500",
                  boxShadow: "0 6px 20px rgba(99,102,241,0.4)",
                  transition: "0.2s",
                }}
                onMouseOver={(e) =>
                  (e.target.style.transform = "translateY(-1px)")
                }
                onMouseOut={(e) => (e.target.style.transform = "translateY(0)")}
              >
                Load Saved
              </button>
            </div>
          </div>
        </div>
      )}
      {isBackgroundRemoval.current && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "420px",
              background: "#1e1e2a",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "sans-serif",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "10px",
                color: "#fff",
                fontSize: "18px",
              }}
            >
              Removing Video Background
            </h3>

            <p
              style={{
                margin: 0,
                marginBottom: "20px",
                color: "#a1a1aa",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {backgroundRemovalMessage}
            </p>
            {backgroundRemovalProgress !== 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "13px",
                    color: "#d4d4d8",
                  }}
                >
                  <span>Progress</span>
                  <span>{Math.round(backgroundRemovalProgress)}%</span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "10px",
                    background: "#2c2c3a",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${backgroundRemovalProgress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                      borderRadius: "999px",
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                flex: "1",
                gap: "12px",
              }}
            >
              {/* Cancel Button */}
              <button
                onClick={() => {
                  cancelExport();
                  isBackgroundRemoval.current = false;
                  setBackgroundRemovalMessage("");
                  setBackgroundRemovalProgress(0);
                }}
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2c2c3a",
                  color: "#ff4d4f",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "0.2s",
                  width: "100%",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#3a3a4a")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#2c2c3a")
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {isSubtitleGeneratingRef.current && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "420px",
              background: "#1e1e2a",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "sans-serif",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "10px",
                color: "#fff",
                fontSize: "18px",
              }}
            >
              Generating Subtitles
            </h3>

            <p
              style={{
                margin: 0,
                marginBottom: "20px",
                color: "#a1a1aa",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {subtitlesGenerationMessage.message}
            </p>
            {subtitlesGenerationMessage.progress !== 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "13px",
                    color: "#d4d4d8",
                  }}
                >
                  <span>Progress</span>
                  <span>{Math.round(subtitlesGenerationMessage.progress)}%</span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "10px",
                    background: "#2c2c3a",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${subtitlesGenerationMessage.progress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                      borderRadius: "999px",
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                flex: "1",
                gap: "12px",
              }}
            >
              {/* Cancel Button */}
              <button
                onClick={() => {
                  cancelExport();
                  isSubtitleGeneratingRef.current = false;
                  setSubtitlesGenerationMessage({message:"", progress:0})
                }}
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2c2c3a",
                  color: "#ff4d4f",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "0.2s",
                  width: "100%",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#3a3a4a")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#2c2c3a")
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {loginDialogOpen && (
        <LoginDialog
          open={loginDialogOpen}
          onClose={() => setLoginDialogOpen(false)}
        />
      )}
      {pricingDialogOpen && (
        <PricingCard
          open={pricingDialogOpen}
          onClose={() => setPricingDialogOpen(false)}
        />
      )}
    </div>
  );
};
export default App;
