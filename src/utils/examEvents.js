export const EXAM_EVENTS = {
  MONITORING_STARTED: "Monitoring Started",
  FACE_MISSING: "Face Missing",
  ATTENTION_RESTORED: "Attention Restored",
  REPEATED_OFF_SCREEN: "Repeated Off-Screen",
  LOOKING_ASIDE: "Looking Aside",
  MULTIPLE_FACES: "Multiple Faces",
  POSSIBLE_TALKING: "Possible Talking",
  EXTRA_DEVICE_DETECTED: "Extra Device Detected",
  TAB_SWITCH: "Tab Switch",
  CAMERA_ERROR: "Camera Error"
};

export const EVENT_SEVERITY = {
  INFO: "INFO",
  WARNING: "WARNING"
};

// Convert seconds into MM:SS format
export function formatExamTime(totalSeconds = 0) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export function createExamEvent(
  type,
  details = {},
  examStartTime = null
) {
  let severity = EVENT_SEVERITY.INFO;

  if (
    type === EXAM_EVENTS.FACE_MISSING ||
    type === EXAM_EVENTS.REPEATED_OFF_SCREEN ||
    type === EXAM_EVENTS.LOOKING_ASIDE ||
    type === EXAM_EVENTS.MULTIPLE_FACES ||
    type === EXAM_EVENTS.POSSIBLE_TALKING ||
    type === EXAM_EVENTS.EXTRA_DEVICE_DETECTED ||
    type === EXAM_EVENTS.TAB_SWITCH
  ) {
    severity = EVENT_SEVERITY.WARNING;
  }

  const now = Date.now();

  let elapsedSeconds = 0;

  if (examStartTime) {
    elapsedSeconds = Math.floor(
      (now - examStartTime) / 1000
    );
  }

  return {
    id: now + Math.random(),

    type,

    severity,

    // Time since the exam started
    elapsedSeconds,

    // Human-readable exam time
    examTime: formatExamTime(elapsedSeconds),

    // Actual recording time retained for audit/debugging
    recordedAt: new Date(now).toISOString(),

    ...details
  };
}