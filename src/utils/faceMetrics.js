export function calculateEyeAspectRatio(landmarks) {
  if (!landmarks || landmarks.length === 0) {
    return 0;
  }

  const leftTop = landmarks[159];
  const leftBottom = landmarks[145];
  const leftLeft = landmarks[33];
  const leftRight = landmarks[133];

  if (
    !leftTop ||
    !leftBottom ||
    !leftLeft ||
    !leftRight
  ) {
    return 0;
  }

  const verticalDistance = Math.sqrt(
    Math.pow(leftTop.x - leftBottom.x, 2) +
    Math.pow(leftTop.y - leftBottom.y, 2)
  );

  const horizontalDistance = Math.sqrt(
    Math.pow(leftLeft.x - leftRight.x, 2) +
    Math.pow(leftLeft.y - leftRight.y, 2)
  );

  if (horizontalDistance === 0) {
    return 0;
  }

  return verticalDistance / horizontalDistance;
}


export function calculateHeadMovement(
  landmarks,
  previousLandmarks
) {
  if (
    !landmarks ||
    landmarks.length === 0 ||
    !previousLandmarks ||
    previousLandmarks.length === 0
  ) {
    return 0;
  }

  // Use the nose landmark as a simple head-position reference
  const currentNose = landmarks[1];
  const previousNose = previousLandmarks[1];

  if (!currentNose || !previousNose) {
    return 0;
  }

  const xMovement =
    currentNose.x - previousNose.x;

  const yMovement =
    currentNose.y - previousNose.y;

  const movement = Math.sqrt(
    Math.pow(xMovement, 2) +
    Math.pow(yMovement, 2)
  );

  // Protect the application from invalid values
  if (!Number.isFinite(movement)) {
    return 0;
  }

  return movement;
}