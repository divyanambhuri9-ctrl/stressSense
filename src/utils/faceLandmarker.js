import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

let faceLandmarker = null;

export async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "/node_modules/@mediapipe/tasks-vision/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath: "/models/face_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    }
  );

  return faceLandmarker;
}

export function getFaceLandmarker() {
  return faceLandmarker;
}