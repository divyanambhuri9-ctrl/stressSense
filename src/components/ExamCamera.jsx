
import { useEffect, useRef, useState } from "react";
import { createFaceLandmarker } from "../utils/faceLandmarker";
import { createObjectDetector } from "../utils/objectDetector";
import { EXAM_EVENTS } from "../utils/examEvents";

export default function ExamCamera({
  examStarted,
  onFaceStatusChange,
  onCameraReady,
  onMonitoringEvent
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const faceLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);

  const animationFrameRef = useRef(null);
  const objectDetectionTimeRef = useRef(0);

  const previousMouthStateRef = useRef(false);
  const mouthMovementCountRef = useRef(0);

  const previousStateRef = useRef({
    faceDetected: null,
    lookingAside: null,
    multipleFaces: null,
    possibleTalking: null,
    extraDeviceDetected: null
  });

  const devicePositiveCountRef = useRef(0);
  const deviceNegativeCountRef = useRef(0);

  const [faceDetected, setFaceDetected] =
    useState(false);

  const [lookingAside, setLookingAside] =
    useState(false);

  const [multipleFaces, setMultipleFaces] =
    useState(false);

  const [possibleTalking, setPossibleTalking] =
    useState(false);

  const [extraDeviceDetected, setExtraDeviceDetected] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  const [modelLoading, setModelLoading] =
    useState(true);

  /*
   * ---------------------------------------------------------
   * CAMERA
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user"
            },
            audio: false
          });

        if (!mounted) {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          await videoRef.current.play();

          onCameraReady?.(true);
        }
      } catch (error) {
        console.error(
          "Camera error:",
          error
        );

        setCameraError(
          "Camera access failed. Please allow camera permission."
        );

        onCameraReady?.(false);

        onMonitoringEvent?.({
          eventType: EXAM_EVENTS.CAMERA_ERROR,
          details: {
            message: error.message
          }
        });
      }
    }

    startCamera();

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }
    };
  }, [onCameraReady, onMonitoringEvent]);

  /*
   * ---------------------------------------------------------
   * LOAD MODELS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      try {
        setModelLoading(true);

        const faceLandmarker =
          await createFaceLandmarker();

        if (!mounted) return;

        faceLandmarkerRef.current =
          faceLandmarker;

        console.log(
          "✅ Face Landmarker ready"
        );

        try {
          const objectDetector =
            await createObjectDetector();

          if (!mounted) return;

          objectDetectorRef.current =
            objectDetector;

          console.log(
            "✅ Object Detector ready"
          );
        } catch (error) {
          console.error(
            "Object detector loading failed:",
            error
          );
        }
      } catch (error) {
        console.error(
          "Face Landmarker loading failed:",
          error
        );
      } finally {
        if (mounted) {
          setModelLoading(false);
        }
      }
    }

    loadModels();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * LOOKING ASIDE
   * ---------------------------------------------------------
   */

  function calculateLookingAside(
    landmarks
  ) {
    if (
      !landmarks ||
      landmarks.length === 0
    ) {
      return false;
    }

    const nose = landmarks[1];

    const leftOuter = landmarks[33];
    const leftInner = landmarks[133];

    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];

    if (
      !nose ||
      !leftOuter ||
      !leftInner ||
      !rightInner ||
      !rightOuter
    ) {
      return false;
    }

    const leftEyeCenter =
      (leftOuter.x +
        leftInner.x) / 2;

    const rightEyeCenter =
      (rightInner.x +
        rightOuter.x) / 2;

    const eyeCenter =
      (leftEyeCenter +
        rightEyeCenter) / 2;

    const difference =
      Math.abs(
        nose.x - eyeCenter
      );

    return difference > 0.035;
  }

  /*
   * ---------------------------------------------------------
   * TALKING
   * ---------------------------------------------------------
   */

  function calculateTalking(
    landmarks
  ) {
    if (!landmarks) {
      return false;
    }

    const upperLip =
      landmarks[13];

    const lowerLip =
      landmarks[14];

    if (
      !upperLip ||
      !lowerLip
    ) {
      return false;
    }

    const mouthOpening =
      Math.abs(
        upperLip.y -
          lowerLip.y
      );

    const mouthOpen =
      mouthOpening > 0.018;

    if (
      mouthOpen !==
      previousMouthStateRef.current
    ) {
      mouthMovementCountRef.current +=
        1;
    }

    previousMouthStateRef.current =
      mouthOpen;

    if (
      mouthMovementCountRef.current >=
      4
    ) {
      mouthMovementCountRef.current = 0;

      return true;
    }

    return false;
  }

  /*
   * ---------------------------------------------------------
   * EXTRA DEVICE DETECTION
   * ---------------------------------------------------------
   */

  async function detectExtraDevice(video) {
    const detector =
      objectDetectorRef.current;

    if (!detector || !video) {
      return (
        previousStateRef.current
          .extraDeviceDetected ??
        false
      );
    }

    try {
      if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        return false;
      }

      const result =
        detector.detectForVideo(
          video,
          performance.now()
        );

      const detections =
        result?.detections || [];

      let deviceFound = false;
      let strongestScore = 0;
      let detectedDeviceName = "";

      for (const detection of detections) {
        const categories =
          detection.categories || [];

        for (const category of categories) {
          const name = String(
            category.categoryName ||
              category.displayName ||
              ""
          ).toLowerCase();

          const score =
            Number(
              category.score || 0
            );

          /*
           * Device types.
           */
          const isDevice =
            name.includes("cell phone") ||
            name.includes("mobile phone") ||
            name.includes("phone") ||
            name.includes("smartphone") ||
            name.includes("tablet") ||
            name.includes("laptop") ||
            name.includes("computer");

          /*
           * Keep the existing sensitive
           * minimum threshold.
           */
          if (
            isDevice &&
            score >= 0.15
          ) {
            deviceFound = true;

            if (
              score > strongestScore
            ) {
              strongestScore = score;
              detectedDeviceName = name;
            }
          }
        }
      }

      /*
       * Log only the strongest device
       * detected in this check.
       */
      if (deviceFound) {
        console.log(
          "📱 Device detected:",
          detectedDeviceName,
          strongestScore.toFixed(2)
        );
      }

      /*
       * -----------------------------------------------------
       * STRONG DETECTION
       * -----------------------------------------------------
       *
       * If confidence is high enough,
       * don't wait for a second frame.
       */
      if (
        deviceFound &&
        strongestScore >= 0.40
      ) {
        devicePositiveCountRef.current = 2;
        deviceNegativeCountRef.current = 0;

        return true;
      }

      /*
       * -----------------------------------------------------
       * MODERATE DETECTION
       * -----------------------------------------------------
       *
       * We still require two detections
       * for weaker confidence.
       */
      if (deviceFound) {
        devicePositiveCountRef.current +=
          1;

        deviceNegativeCountRef.current = 0;

        if (
          devicePositiveCountRef.current >=
          2
        ) {
          return true;
        }
      } else {
        deviceNegativeCountRef.current +=
          1;

        devicePositiveCountRef.current = 0;

        /*
         * Don't immediately remove a warning
         * because of one missed frame.
         */
        if (
          deviceNegativeCountRef.current >=
          2
        ) {
          return false;
        }
      }

      return (
        previousStateRef.current
          .extraDeviceDetected ??
        false
      );
    } catch (error) {
      console.error(
        "Device detection error:",
        error
      );

      return (
        previousStateRef.current
          .extraDeviceDetected ??
        false
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * MONITORING STATE
   * ---------------------------------------------------------
   */

  function updateMonitoringState({
    face,
    aside,
    multiple,
    talking,
    device
  }) {
    const previous =
      previousStateRef.current;

    /*
     * FACE
     */
    if (
      previous.faceDetected !==
      face
    ) {
      previous.faceDetected =
        face;

      onFaceStatusChange?.(
        face
      );
    }

    /*
     * LOOKING ASIDE
     */
    if (
      previous.lookingAside !==
      aside
    ) {
      previous.lookingAside =
        aside;

      if (aside) {
        onMonitoringEvent?.({
          eventType:
            EXAM_EVENTS.LOOKING_ASIDE,
          details: {
            message:
              "User is looking away from the screen."
          }
        });
      }
    }

    /*
     * MULTIPLE FACES
     */
    if (
      previous.multipleFaces !==
      multiple
    ) {
      previous.multipleFaces =
        multiple;

      if (multiple) {
        onMonitoringEvent?.({
          eventType:
            EXAM_EVENTS.MULTIPLE_FACES,
          details: {
            message:
              "Multiple faces detected."
          }
        });
      }
    }

    /*
     * TALKING
     */
    if (
      previous.possibleTalking !==
      talking
    ) {
      previous.possibleTalking =
        talking;

      if (talking) {
        onMonitoringEvent?.({
          eventType:
            EXAM_EVENTS.POSSIBLE_TALKING,
          details: {
            message:
              "Possible talking detected."
          }
        });
      }
    }

    /*
     * EXTRA DEVICE
     */
    if (
      previous.extraDeviceDetected !==
      device
    ) {
      previous.extraDeviceDetected =
        device;

      if (device) {
        onMonitoringEvent?.({
          eventType:
            EXAM_EVENTS.EXTRA_DEVICE_DETECTED,
          details: {
            message:
              "Extra device detected."
          }
        });
      }
    }

    /*
     * IMPORTANT:
     * Send current live monitoring state.
     */
    onMonitoringEvent?.({
      lookingAside: aside,
      multipleFaces: multiple,
      possibleTalking: talking,
      extraDeviceDetected: device
    });
  }

  /*
   * ---------------------------------------------------------
   * MONITORING LOOP
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!examStarted) {
      return;
    }

    let stopped = false;

    async function monitor() {
      if (stopped) {
        return;
      }

      const video =
        videoRef.current;

      const faceLandmarker =
        faceLandmarkerRef.current;

      if (
        !video ||
        !faceLandmarker ||
        video.readyState <
          HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        animationFrameRef.current =
          requestAnimationFrame(
            monitor
          );

        return;
      }

      try {
        /*
         * FACE DETECTION
         */
        const faceResult =
          faceLandmarker.detectForVideo(
            video,
            performance.now()
          );

        const faces =
          faceResult?.faceLandmarks ||
          [];

        const face =
          faces.length > 0;

        const multiple =
          faces.length > 1;

        let aside = false;
        let talking = false;

        if (face) {
          aside =
            calculateLookingAside(
              faces[0]
            );

          talking =
            calculateTalking(
              faces[0]
            );
        } else {
          previousMouthStateRef.current =
            false;

          mouthMovementCountRef.current =
            0;
        }

        /*
         * FAST DEVICE CHECK
         *
         * Every 180ms.
         */
        let device =
          previousStateRef.current
            .extraDeviceDetected ??
          false;

        const now =
          performance.now();

        if (
          now -
            objectDetectionTimeRef.current >=
          180
        ) {
          objectDetectionTimeRef.current =
            now;

          device =
            await detectExtraDevice(
              video
            );
        }

        /*
         * React states
         */
        setFaceDetected(face);

        setLookingAside(aside);

        setMultipleFaces(multiple);

        setPossibleTalking(talking);

        setExtraDeviceDetected(device);

        /*
         * Parent component
         */
        updateMonitoringState({
          face,
          aside,
          multiple,
          talking,
          device
        });
      } catch (error) {
        console.error(
          "Monitoring error:",
          error
        );
      }

      if (!stopped) {
        animationFrameRef.current =
          requestAnimationFrame(
            monitor
          );
      }
    }

    monitor();

    return () => {
      stopped = true;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }
    };
  }, [examStarted]);

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "520px",
        margin: "0 auto"
      }}
    >
      {/* CAMERA */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#020617",
          border: "1px solid #334155"
        }}
      >
        {cameraError ? (
          <div
            style={{
              minHeight: "300px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              color: "#fca5a5",
              textAlign: "center"
            }}
          >
            {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              display: "block",
              background: "#000",
              transform:
                "scaleX(-1)"
            }}
          />
        )}

        {/* CAMERA STATUS */}
        {!cameraError && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              padding: "6px 10px",
              borderRadius: "999px",
              background:
                "rgba(15,23,42,0.8)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "600"
            }}
          >
            {modelLoading
              ? "⏳ Loading monitoring..."
              : "🔴 Monitoring active"}
          </div>
        )}
      </div>

      {/* MONITORING FEATURES */}
      <div
        style={{
          marginTop: "12px",
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "10px"
        }}
      >
        <MonitoringCard
          icon="👤"
          title="Face"
          value={
            faceDetected
              ? "Detected"
              : "Not detected"
          }
          active={faceDetected}
        />

        <MonitoringCard
          icon="👀"
          title="Attention"
          value={
            lookingAside
              ? "Looking aside"
              : "Focused"
          }
          active={!lookingAside}
        />

        <MonitoringCard
          icon="👥"
          title="Faces"
          value={
            multipleFaces
              ? "Multiple"
              : "Single"
          }
          active={!multipleFaces}
        />

        <MonitoringCard
          icon="🗣️"
          title="Talking"
          value={
            possibleTalking
              ? "Possible"
              : "No talking"
          }
          active={!possibleTalking}
        />

        <MonitoringCard
          icon="📱"
          title="Extra Device"
          value={
            extraDeviceDetected
              ? "Detected"
              : "Not detected"
          }
          active={
            !extraDeviceDetected
          }
          fullWidth
        />
      </div>
    </div>
  );
}

/*
 * ---------------------------------------------------------
 * MONITORING CARD
 * ---------------------------------------------------------
 */

function MonitoringCard({
  icon,
  title,
  value,
  active,
  fullWidth
}) {
  return (
    <div
      style={{
        gridColumn: fullWidth
          ? "1 / -1"
          : "auto",

        padding: "12px",

        borderRadius: "12px",

        border: active
          ? "1px solid rgba(34,197,94,0.35)"
          : "1px solid rgba(239,68,68,0.5)",

        background: active
          ? "rgba(22,101,52,0.16)"
          : "rgba(127,29,29,0.18)"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <span
          style={{
            fontSize: "20px"
          }}
        >
          {icon}
        </span>

        <div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: "11px",
              fontWeight: "600"
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "#f8fafc",
              fontSize: "13px",
              fontWeight: "700",
              marginTop: "2px"
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

