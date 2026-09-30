import {
  FilesetResolver,
  ObjectDetector
} from "@mediapipe/tasks-vision";

let detectorPromise = null;

export async function createObjectDetector() {
  if (detectorPromise) {
    return detectorPromise;
  }

  detectorPromise = (async () => {
    console.log(
      "Loading local object detector..."
    );

    const vision =
      await FilesetResolver.forVisionTasks(
        "/mediapipe/wasm"
      );

    console.log(
      "Local vision files loaded"
    );

    const detector =
      await ObjectDetector.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite"
          },

          // Optimized for continuous camera detection
          runningMode: "VIDEO",

          // Keep detection sensitive enough
          // to detect partially visible devices
          scoreThreshold: 0.15,

          // We only need a few possible objects
          // instead of up to 30
          maxResults: 5
        }
      );

    console.log(
      "Fast object detector created successfully"
    );

    return detector;
  })().catch((error) => {
    detectorPromise = null;

    console.error(
      "Object detector initialization failed:",
      error
    );

    throw error;
  });

  return detectorPromise;
}