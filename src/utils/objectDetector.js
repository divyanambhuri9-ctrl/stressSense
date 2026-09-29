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

          runningMode: "VIDEO",

          /*
           * Lower threshold means
           * partially visible objects
           * have a better chance of
           * being detected.
           */
          scoreThreshold: 0.15,

          /*
           * More possible objects can
           * be returned.
           */
          maxResults: 30
        }
      );

    console.log(
      "Object detector created successfully"
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