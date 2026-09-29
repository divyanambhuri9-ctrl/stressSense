import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

let faceLandmarker = null;

export async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath: "/models/face_landmarker.task",
        delegate: "CPU"
      },

      runningMode: "VIDEO",

      // Detect multiple people
      numFaces: 5,

      outputFaceBlendshapes: true,

      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    }
  );

  console.log("Face Landmarker created with multiple-face detection");

  return faceLandmarker;
}

export function getFaceLandmarker() {
  return faceLandmarker;
}