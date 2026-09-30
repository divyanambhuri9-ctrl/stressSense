import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

import ExamCamera from "./ExamCamera";
import { examQuestions } from "../data/examQuestions";
import {
  EXAM_EVENTS,
  EVENT_SEVERITY,
  createExamEvent
} from "../utils/examEvents";
import { saveExamSession } from "../utils/sessionApi";

export default function ExamMode() {
  const TOTAL_TIME = 3600;

  const [examStarted, setExamStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [seconds, setSeconds] = useState(TOTAL_TIME);

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState({});

  const [score, setScore] = useState(0);

  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [lookingAside, setLookingAside] = useState(false);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [possibleTalking, setPossibleTalking] = useState(false);
  const [extraDeviceDetected, setExtraDeviceDetected] =
    useState(false);

  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const [offScreenSeconds, setOffScreenSeconds] = useState(0);
  const [offScreenStreak, setOffScreenStreak] = useState(0);

  const [examEvents, setExamEvents] = useState([]);
  const examEventsRef = useRef([]);

  const [sessionSummary, setSessionSummary] = useState(null);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [warningAlert, setWarningAlert] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");

  const faceDetectedRef = useRef(false);
  const trackingIntervalRef = useRef(null);

  const examEndedRef = useRef(false);
  const examStartedRef = useRef(false);

  const examStartTimeRef = useRef(null);

  const examMonitoringReadyRef = useRef(false);

  const lastExtraDeviceEventTimeRef = useRef(0);
  const lastFaceMissingEventTimeRef = useRef(0);
  const lastFullscreenEventTimeRef = useRef(0);
  const lastSecurityEventTimeRef = useRef(0);

  const warningAlertTimerRef = useRef(null);

  /*
   * --------------------------------------------------
   * SCREENSHOT STORAGE
   * --------------------------------------------------
   */

  const warningScreenshotsRef = useRef([]);
  const examScreenRef = useRef(null);

  /*
   * --------------------------------------------------
   * UPLOAD WARNING SCREENSHOT
   * --------------------------------------------------
   */

  const uploadWarningScreenshot = useCallback(
    async (screenshotRecord) => {
      if (!screenshotRecord?.screenshot) {
        return null;
      }

      try {
        const response = await fetch(
          screenshotRecord.screenshot
        );

        const blob = await response.blob();

        const formData = new FormData();

        formData.append(
          "screenshot",
          blob,
          `warning-${screenshotRecord.eventId || Date.now()}.jpg`
        );

        formData.append(
          "eventId",
          screenshotRecord.eventId || ""
        );

        formData.append(
          "eventType",
          screenshotRecord.eventType || "WARNING"
        );

        formData.append(
          "message",
          screenshotRecord.message || ""
        );

        formData.append(
          "examElapsedSeconds",
          String(
            screenshotRecord.examElapsedSeconds ?? 0
          )
        );

        const uploadResponse = await fetch(
          "http://localhost:5000/api/exam-screenshots",
          {
            method: "POST",
            credentials: "include",
            body: formData
          }
        );

        const result = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            result?.message ||
              `Screenshot upload failed: ${uploadResponse.status}`
          );
        }

        console.log(
          "☁️ Warning screenshot saved to backend:",
          result
        );

        return result;
      } catch (error) {
        console.warn(
          "Warning screenshot backend upload failed:",
          error
        );

        return null;
      }
    },
    []
  );

  /*
   * --------------------------------------------------
   * CAPTURE WARNING SCREENSHOT
   * --------------------------------------------------
   *
   * html2canvas captures only the exam webpage.
   * It does NOT request screen-sharing permission.
   */

  const captureWarningScreenshot = useCallback(
    async (event) => {
      try {
        if (!examScreenRef.current) {
          console.warn(
            "Exam screen is not available for screenshot."
          );
          return null;
        }

        const canvas = await html2canvas(
          examScreenRef.current,
          {
            backgroundColor: "#0f172a",
            useCORS: true,
            allowTaint: true,
            logging: false,
            scale: Math.min(
              window.devicePixelRatio || 1,
              2
            )
          }
        );

        const screenshot = canvas.toDataURL(
          "image/jpeg",
          0.75
        );

        const screenshotRecord = {
          eventId: event?.id || null,
          eventType: event?.type || "WARNING",
          timestamp: event?.timestamp || "",
          examElapsedSeconds:
            event?.examElapsedSeconds ?? 0,
          message: event?.message || "",
          screenshot,
          backendSaved: false
        };

        warningScreenshotsRef.current = [
          ...warningScreenshotsRef.current,
          screenshotRecord
        ];

        console.log(
          "📸 Warning screenshot captured without screen sharing:",
          screenshotRecord
        );

        const backendResult =
          await uploadWarningScreenshot(
            screenshotRecord
          );

        if (backendResult?.success) {
          screenshotRecord.backendSaved = true;
          screenshotRecord.backendId =
            backendResult.screenshot?.id || null;
          screenshotRecord.fileName =
            backendResult.screenshot?.fileName || null;
          screenshotRecord.filePath =
            backendResult.screenshot?.filePath || null;
        }

        return screenshotRecord;
      } catch (error) {
        console.warn(
          "Screenshot capture failed:",
          error
        );

        return null;
      }
    },
    [uploadWarningScreenshot]
  );

  /*
   * --------------------------------------------------
   * FACE STATUS
   * --------------------------------------------------
   */

  const handleFaceStatusChange = useCallback(
    (status) => {
      const detected = Boolean(status);

      faceDetectedRef.current =
        detected;

      setFaceDetected(detected);
    },
    []
  );

  /*
   * --------------------------------------------------
   * CAMERA READY
   * --------------------------------------------------
   */

  const handleCameraReady =
    useCallback((ready) => {
      setCameraReady(Boolean(ready));
    }, []);

  /*
   * --------------------------------------------------
   * ADD EVENT
   * --------------------------------------------------
   */

  const addExamEvent = useCallback(
    (type, details = {}) => {
      if (
        examStartTimeRef.current ===
          null &&
        type !==
          EXAM_EVENTS.MONITORING_STARTED
      ) {
        return null;
      }

      const elapsedSeconds =
        examStartTimeRef.current !== null
          ? Math.max(
              0,
              Math.floor(
                (Date.now() -
                  examStartTimeRef.current) /
                  1000
              )
            )
          : 0;

      /*
       * Prevent repeated extra-device events.
       */

      if (
        type ===
        EXAM_EVENTS.EXTRA_DEVICE_DETECTED
      ) {
        const now = Date.now();

        if (
          now -
            lastExtraDeviceEventTimeRef.current <
          5000
        ) {
          return null;
        }

        lastExtraDeviceEventTimeRef.current =
          now;
      }

      /*
       * Prevent repeated face-missing events.
       */

      if (
        type ===
        EXAM_EVENTS.FACE_MISSING
      ) {
        const now = Date.now();

        if (
          now -
            lastFaceMissingEventTimeRef.current <
          5000
        ) {
          return null;
        }

        lastFaceMissingEventTimeRef.current =
          now;
      }

      /*
       * Prevent repeated fullscreen/security events.
       */

      if (
        type ===
          EXAM_EVENTS.TAB_SWITCH ||
        type === "FULLSCREEN_EXIT" ||
        type === "SUSPICIOUS_KEYBOARD_SHORTCUT" ||
        type === "SECURITY_VIOLATION"
      ) {
        const now = Date.now();

        if (
          now -
            lastSecurityEventTimeRef.current <
          1500
        ) {
          return null;
        }

        lastSecurityEventTimeRef.current =
          now;
      }

      const baseEvent =
        createExamEvent(
          type,
          details
        );

      const event = {
        ...baseEvent,

        timestamp: `at ${elapsedSeconds} sec`,

        examElapsedSeconds:
          elapsedSeconds
      };

      examEventsRef.current = [
        ...examEventsRef.current,
        event
      ];

      setExamEvents([
        ...examEventsRef.current
      ]);

      /*
       * Warning popup.
       */

      if (
        event.severity ===
        EVENT_SEVERITY.WARNING
      ) {
        setWarningAlert(event);

        if (
          warningAlertTimerRef.current
        ) {
          clearTimeout(
            warningAlertTimerRef.current
          );
        }

        warningAlertTimerRef.current =
          setTimeout(() => {
            setWarningAlert(null);
          }, 4000);

        /*
         * Capture evidence screenshot.
         *
         * Do not await here because
         * the warning UI must remain responsive.
         */

        captureWarningScreenshot(
          event
        );
      }

      return event;
    },
    [captureWarningScreenshot]
  );

  /*
   * --------------------------------------------------
   * MONITORING EVENT
   * --------------------------------------------------
   */

  const handleMonitoringEvent =
    useCallback(
      (data) => {
        if (!examStartedRef.current) {
          return;
        }

        if (!data) {
          return;
        }

        if (
          typeof data.lookingAside ===
          "boolean"
        ) {
          setLookingAside(
            data.lookingAside
          );
        }

        if (
          typeof data.multipleFaces ===
          "boolean"
        ) {
          setMultipleFaces(
            data.multipleFaces
          );
        }

        if (
          typeof data.possibleTalking ===
          "boolean"
        ) {
          setPossibleTalking(
            data.possibleTalking
          );
        }

        if (
          typeof data.extraDeviceDetected ===
          "boolean"
        ) {
          setExtraDeviceDetected(
            data.extraDeviceDetected
          );
        }

        if (data.eventType) {
          addExamEvent(
            data.eventType,
            data.details || {}
          );
        }
      },
      [addExamEvent]
    );

  /*
   * --------------------------------------------------
   * SESSION SUMMARY
   * --------------------------------------------------
   */

  const createSessionSummary =
    useCallback(
      (events) => {
        const summary = {
          faceMissingCount: 0,
          attentionRestoredCount: 0,
          repeatedOffScreenCount: 0,
          lookingAsideCount: 0,
          multipleFacesCount: 0,
          possibleTalkingCount: 0,
          extraDeviceCount: 0,
          tabSwitchEventCount: 0,
          cameraErrorCount: 0,
          fullscreenExitCount: 0,
          securityViolationCount: 0
        };

        events.forEach((event) => {
          switch (event.type) {
            case EXAM_EVENTS.FACE_MISSING:
              summary.faceMissingCount++;
              break;

            case EXAM_EVENTS.ATTENTION_RESTORED:
              summary.attentionRestoredCount++;
              break;

            case EXAM_EVENTS.REPEATED_OFF_SCREEN:
              summary.repeatedOffScreenCount++;
              break;

            case EXAM_EVENTS.LOOKING_ASIDE:
              summary.lookingAsideCount++;
              break;

            case EXAM_EVENTS.MULTIPLE_FACES:
              summary.multipleFacesCount++;
              break;

            case EXAM_EVENTS.POSSIBLE_TALKING:
              summary.possibleTalkingCount++;
              break;

            case EXAM_EVENTS.EXTRA_DEVICE_DETECTED:
              summary.extraDeviceCount++;
              break;

            case EXAM_EVENTS.TAB_SWITCH:
              summary.tabSwitchEventCount++;
              break;

            case EXAM_EVENTS.CAMERA_ERROR:
              summary.cameraErrorCount++;
              break;

            case "FULLSCREEN_EXIT":
              summary.fullscreenExitCount++;
              break;

            case "SUSPICIOUS_KEYBOARD_SHORTCUT":
            case "SECURITY_VIOLATION":
              summary.securityViolationCount++;
              break;

            default:
              break;
          }
        });

        return summary;
      },
      []
    );

  /*
   * --------------------------------------------------
   * SCORE CALCULATION
   * --------------------------------------------------
   */

  const calculateScore =
    useCallback(
      (finalAnswers) => {
        if (
          !finalAnswers ||
          typeof finalAnswers !==
            "object"
        ) {
          return 0;
        }

        let correct = 0;

        examQuestions.forEach(
          (question) => {
            const userAnswer =
              finalAnswers[
                question.id
              ];

            if (
              userAnswer ===
                undefined ||
              userAnswer === null ||
              userAnswer === ""
            ) {
              return;
            }

            const correctAnswer =
              question.correctAnswer;

            if (
              String(
                userAnswer
              ).trim() ===
              String(
                correctAnswer
              ).trim()
            ) {
              correct++;
            }
          }
        );

        return correct;
      },
      []
    );

  /*
   * --------------------------------------------------
   * END EXAM
   * --------------------------------------------------
   */

  const endExam =
    useCallback(
      async (autoSubmitted = false) => {
        if (
          examEndedRef.current
        ) {
          return;
        }

        examEndedRef.current =
          true;

        examStartedRef.current =
          false;

        examMonitoringReadyRef.current =
          false;

        setExamStarted(false);

        if (
          trackingIntervalRef.current
        ) {
          clearInterval(
            trackingIntervalRef.current
          );

          trackingIntervalRef.current =
            null;
        }

        const finalAnswers = {
          ...answers
        };

        const totalQuestions =
          examQuestions.length;

        const answeredQuestions =
          examQuestions.filter(
            (question) => {
              const answer =
                finalAnswers[
                  question.id
                ];

              return (
                answer !==
                  undefined &&
                answer !== null &&
                answer !== ""
              );
            }
          ).length;

        const correctAnswers =
          calculateScore(
            finalAnswers
          );

        const safeCorrectAnswers =
          Math.min(
            correctAnswers,
            answeredQuestions
          );

        const unansweredQuestions =
          Math.max(
            0,
            totalQuestions -
              answeredQuestions
          );

        const calculatedPercentage =
          totalQuestions > 0
            ? Math.round(
                (safeCorrectAnswers /
                  totalQuestions) *
                  100
              )
            : 0;

        const finalDurationSeconds =
          examStartTimeRef.current !==
          null
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() -
                    examStartTimeRef.current) /
                    1000
                )
              )
            : TOTAL_TIME -
              seconds;

        const finalEvents = [
          ...examEventsRef.current
        ];

        const finalSummary =
          createSessionSummary(
            finalEvents
          );

        const warningCount =
          finalEvents.filter(
            (event) =>
              event.severity ===
              EVENT_SEVERITY.WARNING
          ).length;

        setScore(
          safeCorrectAnswers
        );

        setSessionSummary(
          finalSummary
        );

        setCompleted(true);

        setSaveStatus("saving");

        const sessionData = {
          score:
            safeCorrectAnswers,

          percentage:
            calculatedPercentage,

          totalQuestions,

          correctAnswers:
            safeCorrectAnswers,

          answeredQuestions,

          unansweredQuestions,

          focusedSeconds,

          offScreenSeconds,

          durationSeconds:
            finalDurationSeconds,

          tabSwitchCount,

          warnings:
            warningCount,

          answers:
            finalAnswers,

          markedQuestions,

          events:
            finalEvents,

          sessionSummary:
            finalSummary,

          autoSubmitted,

          /*
           * Evidence screenshots.
           *
           * These will be connected to the
           * backend upload in the next step.
           */

          warningScreenshots:
            warningScreenshotsRef.current.map(
              (item) => ({
                eventId:
                  item.eventId,

                eventType:
                  item.eventType,

                timestamp:
                  item.timestamp
              })
            )
        };

        console.log(
          "========== FINAL EXAM DATA =========="
        );

        console.log(
          "Answers:",
          finalAnswers
        );

        console.log(
          "Total Questions:",
          totalQuestions
        );

        console.log(
          "Answered Questions:",
          answeredQuestions
        );

        console.log(
          "Correct Answers:",
          safeCorrectAnswers
        );

        console.log(
          "Unanswered Questions:",
          unansweredQuestions
        );

        console.log(
          "Percentage:",
          calculatedPercentage
        );

        console.log(
          "Warning Screenshots:",
          warningScreenshotsRef.current
        );

        console.log(
          "======================================"
        );

        try {
          await saveExamSession(
            sessionData
          );

          setSaveStatus("saved");
        } catch (error) {
          console.error(
            "Failed to save exam session:",
            error
          );

          setSaveStatus("error");
        }

        try {
          if (
            document.fullscreenElement
          ) {
            await document.exitFullscreen();
          }
        } catch (error) {
          console.error(
            "Fullscreen exit error:",
            error
          );
        }

        setIsFullscreen(false);
      },
      [
        answers,
        calculateScore,
        createSessionSummary,
        focusedSeconds,
        markedQuestions,
        offScreenSeconds,
        seconds,
        tabSwitchCount
      ]
    );

  /*
   * --------------------------------------------------
   * START EXAM
   * --------------------------------------------------
   */

  const startExam = async () => {
    setAnswers({});
    setMarkedQuestions({});

    setCurrentQuestion(0);

    setScore(0);

    setSeconds(TOTAL_TIME);

    setFocusedSeconds(0);
    setOffScreenSeconds(0);
    setOffScreenStreak(0);

    setTabSwitchCount(0);

    setLookingAside(false);
    setMultipleFaces(false);
    setPossibleTalking(false);
    setExtraDeviceDetected(false);

    setWarningAlert(null);

    setSaveStatus("idle");
    setCompleted(false);

    /*
     * Reset screenshots.
     */

    warningScreenshotsRef.current =
      [];

    /*
     * Reset events.
     */

    examEventsRef.current = [];
    setExamEvents([]);

    /*
     * Reset refs.
     */

    examEndedRef.current =
      false;

    examStartedRef.current =
      true;

    examMonitoringReadyRef.current =
      false;

    lastExtraDeviceEventTimeRef.current =
      0;

    lastFaceMissingEventTimeRef.current =
      0;

    lastFullscreenEventTimeRef.current =
      0;

    lastSecurityEventTimeRef.current =
      0;

    examStartTimeRef.current =
      Date.now();

    addExamEvent(
      EXAM_EVENTS.MONITORING_STARTED
    );

    setExamStarted(true);

    /*
     * Grace period.
     */

    setTimeout(() => {
      if (
        !examEndedRef.current
      ) {
        examMonitoringReadyRef.current =
          true;
      }
    }, 2000);

    /*
     * Fullscreen.
     */

    try {
      if (
        !document.fullscreenElement
      ) {
        await document.documentElement.requestFullscreen();

        setIsFullscreen(true);
      }
    } catch (error) {
      console.error(
        "Fullscreen request failed:",
        error
      );
    }
  };

  /*
   * --------------------------------------------------
   * RESTART EXAM
   * --------------------------------------------------
   */

  const restartExam = () => {
    examStartedRef.current =
      false;

    examEndedRef.current =
      false;

    examMonitoringReadyRef.current =
      false;

    examStartTimeRef.current =
      null;

    lastExtraDeviceEventTimeRef.current =
      0;

    lastFaceMissingEventTimeRef.current =
      0;

    lastFullscreenEventTimeRef.current =
      0;

    lastSecurityEventTimeRef.current =
      0;

    if (
      trackingIntervalRef.current
    ) {
      clearInterval(
        trackingIntervalRef.current
      );

      trackingIntervalRef.current =
        null;
    }

    setExamStarted(false);
    setCompleted(false);

    setSeconds(TOTAL_TIME);

    setCurrentQuestion(0);

    setAnswers({});
    setMarkedQuestions({});

    setScore(0);

    setFocusedSeconds(0);
    setOffScreenSeconds(0);
    setOffScreenStreak(0);

    setLookingAside(false);
    setMultipleFaces(false);
    setPossibleTalking(false);
    setExtraDeviceDetected(false);

    setTabSwitchCount(0);

    setWarningAlert(null);
    setSessionSummary(null);
    setSaveStatus("idle");

    warningScreenshotsRef.current =
      [];

    examEventsRef.current = [];

    setExamEvents([]);

    faceDetectedRef.current =
      false;

    setFaceDetected(false);
  };

  /*
   * --------------------------------------------------
   * TIMER
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        setSeconds(
          (previous) => {
            if (
              previous <= 1
            ) {
              clearInterval(
                timer
              );

              setTimeout(
                () => {
                  endExam(true);
                },
                0
              );

              return 0;
            }

            return (
              previous - 1
            );
          }
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    examStarted,
    completed,
    endExam
  ]);

  /*
   * --------------------------------------------------
   * FOCUS TRACKING
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    trackingIntervalRef.current =
      setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          setFocusedSeconds(
            (previous) =>
              previous + 1
          );

          setOffScreenStreak(
            0
          );
        } else {
          setOffScreenSeconds(
            (previous) =>
              previous + 1
          );

          setOffScreenStreak(
            (previous) =>
              previous + 1
          );
        }
      }, 1000);

    return () => {
      if (
        trackingIntervalRef.current
      ) {
        clearInterval(
          trackingIntervalRef.current
        );

        trackingIntervalRef.current =
          null;
      }
    };
  }, [
    examStarted,
    completed
  ]);

  /*
   * --------------------------------------------------
   * FACE MISSING
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        if (
          !examMonitoringReadyRef.current
        ) {
          return;
        }

        if (
          !faceDetectedRef.current
        ) {
          addExamEvent(
            EXAM_EVENTS.FACE_MISSING
          );
        }
      }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [
    examStarted,
    completed,
    addExamEvent
  ]);

  /*
   * --------------------------------------------------
   * REPEATED OFF SCREEN
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    if (
      offScreenStreak >= 5
    ) {
      addExamEvent(
        EXAM_EVENTS.REPEATED_OFF_SCREEN
      );

      setOffScreenStreak(0);
    }
  }, [
    offScreenStreak,
    examStarted,
    completed,
    addExamEvent
  ]);

  /*
   * --------------------------------------------------
   * TAB SWITCH
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    let lastTabSwitchTime = 0;

    const recordTabSwitch =
      (reason) => {
        const now = Date.now();

        /*
         * Prevent duplicate events when the browser
         * fires more than one lifecycle event for the
         * same tab switch.
         */
        if (
          now -
            lastTabSwitchTime <
          1000
        ) {
          return;
        }

        lastTabSwitchTime = now;

        setTabSwitchCount(
          (previous) =>
            previous + 1
        );

        addExamEvent(
          EXAM_EVENTS.TAB_SWITCH,
          {
            reason:
              reason ===
              "visibilitychange"
                ? "Student switched away from the exam tab."
                : "Exam page was hidden."
          }
        );

        console.log(
          "⚠️ TAB SWITCH DETECTED:",
          reason
        );
      };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          recordTabSwitch(
            "visibilitychange"
          );
        }
      };

    const handlePageHide = () => {
      /*
       * pagehide is a backup for browsers where
       * visibilitychange is not delivered reliably.
       * It is only used while the exam is active.
       */
      recordTabSwitch("pagehide");
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "pagehide",
      handlePageHide
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide
      );
    };
  }, [
    examStarted,
    completed,
    addExamEvent
  ]);

  /*
   * --------------------------------------------------
   * FULLSCREEN SECURITY
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    const handleFullscreenChange =
      () => {
        const fullscreen =
          Boolean(
            document.fullscreenElement
          );

        setIsFullscreen(
          fullscreen
        );

        /*
         * User left fullscreen.
         */

        if (!fullscreen) {
          const now =
            Date.now();

          if (
            now -
              lastFullscreenEventTimeRef.current >
            1500
          ) {
            lastFullscreenEventTimeRef.current =
              now;

            addExamEvent(
              "FULLSCREEN_EXIT",
              {
                reason:
                  "Student exited fullscreen mode."
              }
            );
          }
        }
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, [
    examStarted,
    completed,
    addExamEvent
  ]);

  /*
   * --------------------------------------------------
   * ANTI-CHEATING KEYBOARD CONTROLS
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    const blockedShortcut =
      (event) => {
        const key =
          String(
            event.key || ""
          ).toLowerCase();

        const blocked =
          (event.ctrlKey &&
            [
              "c",
              "v",
              "x",
              "a",
              "u",
              "s",
              "p"
            ].includes(key)) ||
          (event.ctrlKey &&
            event.shiftKey &&
            [
              "i",
              "j",
              "c"
            ].includes(key)) ||
          key === "f12" ||
          key === "printscreen";

        if (blocked) {
          event.preventDefault();

          event.stopPropagation();

          addExamEvent(
            "SUSPICIOUS_KEYBOARD_SHORTCUT",
            {
              key,
              ctrlKey:
                event.ctrlKey,
              shiftKey:
                event.shiftKey
            }
          );
        }
      };

    const preventContextMenu =
      (event) => {
        event.preventDefault();

        addExamEvent(
          "SECURITY_VIOLATION",
          {
            reason:
              "Context menu attempt detected."
          }
        );
      };

    const preventClipboard =
      (event) => {
        event.preventDefault();

        addExamEvent(
          "SECURITY_VIOLATION",
          {
            reason:
              "Clipboard operation blocked."
          }
        );
      };

    document.addEventListener(
      "keydown",
      blockedShortcut,
      true
    );

    document.addEventListener(
      "contextmenu",
      preventContextMenu
    );

    document.addEventListener(
      "copy",
      preventClipboard
    );

    document.addEventListener(
      "cut",
      preventClipboard
    );

    document.addEventListener(
      "paste",
      preventClipboard
    );

    return () => {
      document.removeEventListener(
        "keydown",
        blockedShortcut,
        true
      );

      document.removeEventListener(
        "contextmenu",
        preventContextMenu
      );

      document.removeEventListener(
        "copy",
        preventClipboard
      );

      document.removeEventListener(
        "cut",
        preventClipboard
      );

      document.removeEventListener(
        "paste",
        preventClipboard
      );
    };
  }, [
    examStarted,
    completed,
    addExamEvent
  ]);

  /*
   * --------------------------------------------------
   * DEVTOOLS / BASIC SECURITY MONITORING
   * --------------------------------------------------
   *
   * Browser JavaScript cannot guarantee that
   * developer tools or extensions are detected.
   *
   * IMPORTANT:
   * We do NOT use window.blur here for a security
   * violation because browser tab switching also
   * triggers blur. Tab switching is handled separately
   * by the visibilitychange listener above.
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    const handleBeforePrint =
      () => {
        addExamEvent(
          "SECURITY_VIOLATION",
          {
            reason:
              "Print attempt detected."
          }
        );
      };

    window.addEventListener(
      "beforeprint",
      handleBeforePrint
    );

    return () => {
      window.removeEventListener(
        "beforeprint",
        handleBeforePrint
      );
    };
  }, [
    examStarted,
    completed,
    addExamEvent
  ]);

  /*
   * --------------------------------------------------
   * DOM TAMPERING MONITOR
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      !examStarted ||
      completed
    ) {
      return;
    }

    const root =
      document.body;

    if (!root) {
      return;
    }

    let changeCount = 0;

    const observer =
      new MutationObserver(
        (mutations) => {
          changeCount +=
            mutations.length;

          /*
           * We do NOT treat every DOM change
           * as cheating because React itself
           * changes the DOM frequently.
           *
           * Only record a large burst.
           */

          if (
            changeCount >= 100
          ) {
            addExamEvent(
              "SECURITY_VIOLATION",
              {
                reason:
                  "Unusual number of DOM modifications detected."
              }
            );

            changeCount = 0;
          }
        }
      );

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: false
    });

    return () => {
      observer.disconnect();
    };
  }, [
    examStarted,
    completed,
    addExamEvent
  ]);

  /*
   * --------------------------------------------------
   * ANSWER
   * --------------------------------------------------
   */

  const handleAnswer =
    (option) => {
      const question =
        examQuestions[
          currentQuestion
        ];

      if (!question) {
        return;
      }

      setAnswers(
        (previous) => ({
          ...previous,
          [question.id]:
            option
        })
      );
    };

  /*
   * --------------------------------------------------
   * MARK
   * --------------------------------------------------
   */

  const toggleMarkQuestion =
    () => {
      const question =
        examQuestions[
          currentQuestion
        ];

      if (!question) {
        return;
      }

      setMarkedQuestions(
        (previous) => ({
          ...previous,
          [question.id]:
            !previous[
              question.id
            ]
        })
      );
    };

  /*
   * --------------------------------------------------
   * NAVIGATION
   * --------------------------------------------------
   */

  const goToQuestion =
    (index) => {
      if (
        index >= 0 &&
        index <
          examQuestions.length
      ) {
        setCurrentQuestion(
          index
        );
      }
    };

  /*
   * --------------------------------------------------
   * TIME FORMAT
   * --------------------------------------------------
   */

  const formatTime =
    (value) => {
      const minutes =
        Math.floor(
          value / 60
        );

      const secs =
        value % 60;

      return `${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        secs
      ).padStart(
        2,
        "0"
      )}`;
    };

  /*
   * --------------------------------------------------
   * RESULT SCREEN
   * --------------------------------------------------
   */

  if (completed) {
    const percentage =
      examQuestions.length >
      0
        ? Math.round(
            (score /
              examQuestions.length) *
              100
          )
        : 0;

    const answeredCount =
      examQuestions.filter(
        (question) => {
          const answer =
            answers[
              question.id
            ];

          return (
            answer !==
              undefined &&
            answer !== null &&
            answer !== ""
          );
        }
      ).length;

    const unansweredCount =
      examQuestions.length -
      answeredCount;

    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0f172a, #1e1b4b)",
          color: "white",
          padding:
            "40px 20px"
        }}
      >
        <div
          style={{
            maxWidth:
              "1100px",
            margin:
              "0 auto"
          }}
        >
          <h1
            style={{
              fontSize:
                "36px",
              marginBottom:
                "10px"
            }}
          >
            Exam Completed 🎉
          </h1>

          <p
            style={{
              color:
                "#cbd5e1",
              marginBottom:
                "30px"
            }}
          >
            Your exam session has been
            completed and monitored.
          </p>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap:
                "16px",
              marginBottom:
                "30px"
            }}
          >
            <ResultCard
              title="Score"
              value={`${score}/${examQuestions.length}`}
            />

            <ResultCard
              title="Percentage"
              value={`${percentage}%`}
            />

            <ResultCard
              title="Answered"
              value={
                answeredCount
              }
            />

            <ResultCard
              title="Unanswered"
              value={
                unansweredCount
              }
            />

            <ResultCard
              title="Warnings"
              value={
                examEvents.filter(
                  (event) =>
                    event.severity ===
                    EVENT_SEVERITY.WARNING
                ).length
              }
            />

            <ResultCard
              title="Tab Switches"
              value={
                tabSwitchCount
              }
            />

            <ResultCard
              title="Evidence"
              value={
                warningScreenshotsRef
                  .current
                  .length
              }
            />
          </div>

          {sessionSummary && (
            <div
              style={{
                background:
                  "rgba(255,255,255,0.06)",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                borderRadius:
                  "16px",
                padding:
                  "24px",
                marginBottom:
                  "30px"
              }}
            >
              <h2>
                Monitoring Summary
              </h2>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap:
                    "12px",
                  marginTop:
                    "18px"
                }}
              >
                <SummaryItem
                  label="Face Missing"
                  value={
                    sessionSummary.faceMissingCount
                  }
                />

                <SummaryItem
                  label="Attention Restored"
                  value={
                    sessionSummary.attentionRestoredCount
                  }
                />

                <SummaryItem
                  label="Looking Aside"
                  value={
                    sessionSummary.lookingAsideCount
                  }
                />

                <SummaryItem
                  label="Multiple Faces"
                  value={
                    sessionSummary.multipleFacesCount
                  }
                />

                <SummaryItem
                  label="Possible Talking"
                  value={
                    sessionSummary.possibleTalkingCount
                  }
                />

                <SummaryItem
                  label="Extra Device"
                  value={
                    sessionSummary.extraDeviceCount
                  }
                />

                <SummaryItem
                  label="Tab Switch Events"
                  value={
                    sessionSummary.tabSwitchEventCount
                  }
                />

                <SummaryItem
                  label="Fullscreen Exits"
                  value={
                    sessionSummary.fullscreenExitCount
                  }
                />

                <SummaryItem
                  label="Security Events"
                  value={
                    sessionSummary.securityViolationCount
                  }
                />
              </div>
            </div>
          )}

          <div
            style={{
              background:
                "rgba(255,255,255,0.06)",
              border:
                "1px solid rgba(255,255,255,0.1)",
              borderRadius:
                "16px",
              padding:
                "24px",
              marginBottom:
                "30px"
            }}
          >
            <h2>
              Monitoring Events
            </h2>

            {examEvents.length ===
            0 ? (
              <p
                style={{
                  color:
                    "#94a3b8"
                }}
              >
                No monitoring events.
              </p>
            ) : (
              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap:
                    "10px",
                  marginTop:
                    "15px"
                }}
              >
                {examEvents.map(
                  (event) => (
                    <div
                      key={
                        event.id
                      }
                      style={{
                        padding:
                          "12px 14px",
                        borderRadius:
                          "10px",
                        background:
                          event.severity ===
                          EVENT_SEVERITY.WARNING
                            ? "rgba(239,68,68,0.12)"
                            : "rgba(59,130,246,0.12)",
                        border:
                          "1px solid rgba(255,255,255,0.08)"
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap:
                            "12px"
                        }}
                      >
                        <strong>
                          {
                            event.type
                          }
                        </strong>

                        <span
                          style={{
                            color:
                              "#cbd5e1",
                            whiteSpace:
                              "nowrap"
                          }}
                        >
                          {
                            event.timestamp
                          }
                        </span>
                      </div>

                      {event.message && (
                        <div
                          style={{
                            marginTop:
                              "5px",
                            color:
                              "#94a3b8",
                            fontSize:
                              "14px"
                          }}
                        >
                          {
                            event.message
                          }
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div
            style={{
              textAlign:
                "center",
              marginBottom:
                "20px"
            }}
          >
            {saveStatus ===
              "saving" && (
              <p
                style={{
                  color:
                    "#facc15"
                }}
              >
                Saving exam session...
              </p>
            )}

            {saveStatus ===
              "saved" && (
              <p
                style={{
                  color:
                    "#4ade80"
                }}
              >
                Exam session saved successfully
                ✅
              </p>
            )}

            {saveStatus ===
              "error" && (
              <p
                style={{
                  color:
                    "#f87171"
                }}
              >
                Could not save exam session.
              </p>
            )}
          </div>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center"
            }}
          >
            <button
              onClick={
                restartExam
              }
              style={{
                padding:
                  "14px 28px",
                borderRadius:
                  "10px",
                border:
                  "none",
                background:
                  "linear-gradient(135deg, #7c3aed, #ec4899)",
                color:
                  "white",
                fontSize:
                  "16px",
                fontWeight:
                  "600",
                cursor:
                  "pointer"
              }}
            >
              Restart Exam 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * START SCREEN
   * --------------------------------------------------
   */

  if (!examStarted) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          background:
            "linear-gradient(135deg, #0f172a, #1e1b4b)",
          color:
            "white",
          padding:
            "30px 20px"
        }}
      >
        <div
          style={{
            maxWidth:
              "1100px",
            margin:
              "0 auto"
          }}
        >
          <h1
            style={{
              fontSize:
                "36px",
              marginBottom:
                "10px"
            }}
          >
            Exam Mode 📝
          </h1>

          <p
            style={{
              color:
                "#cbd5e1",
              marginBottom:
                "25px"
            }}
          >
            Your camera will monitor
            attention and exam activity
            after you start the exam.
          </p>

          <div
            style={{
              background:
                "rgba(255,255,255,0.06)",
              border:
                "1px solid rgba(255,255,255,0.1)",
              borderRadius:
                "18px",
              padding:
                "20px",
              marginBottom:
                "25px"
            }}
          >
            <ExamCamera
              examStarted={
                false
              }
              onFaceStatusChange={
                handleFaceStatusChange
              }
              onCameraReady={
                handleCameraReady
              }
              onMonitoringEvent={
                handleMonitoringEvent
              }
            />
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap:
                "15px",
              marginBottom:
                "30px"
            }}
          >
            <SmallCard
              icon="📷"
              title="Camera"
              text={
                cameraReady
                  ? "Camera ready"
                  : "Preparing camera..."
              }
            />

            <SmallCard
              icon="👤"
              title="Face Monitoring"
              text="Starts after you begin the exam"
            />

            <SmallCard
              icon="👀"
              title="Attention"
              text="Off-screen activity is monitored"
            />

            <SmallCard
              icon="🛡️"
              title="Exam Security"
              text="Fullscreen and suspicious activity are monitored"
            />
          </div>

          <div
            style={{
              textAlign:
                "center"
            }}
          >
            <button
              onClick={
                startExam
              }
              style={{
                padding:
                  "16px 40px",
                borderRadius:
                  "12px",
                border:
                  "none",
                background:
                  "linear-gradient(135deg, #7c3aed, #ec4899)",
                color:
                  "white",
                fontSize:
                  "18px",
                fontWeight:
                  "700",
                cursor:
                  "pointer",
                boxShadow:
                  "0 10px 30px rgba(124,58,237,0.3)"
              }}
            >
              Start Exam 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * CURRENT QUESTION
   * --------------------------------------------------
   */

  const question =
    examQuestions[
      currentQuestion
    ];

  /*
   * --------------------------------------------------
   * EXAM SCREEN
   * --------------------------------------------------
   */

  return (
    <div
      ref={examScreenRef}
      style={{
        minHeight:
          "100vh",
        background:
          "#0f172a",
        color:
          "white",
        padding:
          "20px"
      }}
    >
      {warningAlert && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.72)",
            backdropFilter:
              "blur(4px)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex:
              9999
          }}
        >
          <div
            style={{
              width:
                "min(500px, 90%)",
              padding:
                "30px",
              borderRadius:
                "20px",
              background:
                "linear-gradient(135deg, #7c3aed, #ec4899)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.45)",
              textAlign:
                "center"
            }}
          >
            <div
              style={{
                fontSize:
                  "45px",
                marginBottom:
                  "10px"
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                margin:
                  "0 0 10px"
              }}
            >
              {
                warningAlert.type
              }
            </h2>

            <p
              style={{
                margin:
                  "0 0 8px",
                fontSize:
                  "15px"
              }}
            >
              {
                warningAlert.timestamp
              }
            </p>

            {warningAlert.message && (
              <p
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                {
                  warningAlert.message
                }
              </p>
            )}

            <p
              style={{
                fontSize:
                  "13px",
                color:
                  "rgba(255,255,255,0.8)",
                marginBottom:
                  "18px"
              }}
            >
              📸 Evidence capture initiated
            </p>

            <button
              onClick={() =>
                setWarningAlert(
                  null
                )
              }
              style={{
                padding:
                  "10px 24px",
                borderRadius:
                  "8px",
                border:
                  "none",
                background:
                  "white",
                color:
                  "#7c3aed",
                fontWeight:
                  "700",
                cursor:
                  "pointer"
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth:
            "1400px",
          margin:
            "0 auto"
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "20px",
            flexWrap:
              "wrap",
            marginBottom:
              "20px"
          }}
        >
          <div>
            <h1
              style={{
                margin:
                  0,
                fontSize:
                  "30px"
              }}
            >
              Exam Mode 📝
            </h1>

            <p
              style={{
                margin:
                  "5px 0 0",
                color:
                  "#94a3b8"
              }}
            >
              Question{" "}
              {currentQuestion +
                1}{" "}
              of{" "}
              {
                examQuestions.length
              }
            </p>
          </div>

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "10px"
            }}
          >
            <div
              style={{
                padding:
                  "8px 12px",
                borderRadius:
                  "10px",
                background:
                  isFullscreen
                    ? "rgba(74,222,128,0.12)"
                    : "rgba(239,68,68,0.18)",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                fontSize:
                  "13px",
                fontWeight:
                  "700"
              }}
            >
              {isFullscreen
                ? "🛡️ Fullscreen"
                : "⚠️ Fullscreen Off"}
            </div>

            <div
              style={{
                padding:
                  "12px 20px",
                borderRadius:
                  "12px",
                background:
                  seconds <
                  300
                    ? "rgba(239,68,68,0.18)"
                    : "rgba(255,255,255,0.08)",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                fontSize:
                  "22px",
                fontWeight:
                  "700"
              }}
            >
              ⏱️{" "}
              {formatTime(
                seconds
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "320px 1fr",
            gap:
              "20px"
          }}
        >
          <div>
            <ExamCamera
              examStarted={
                examStarted
              }
              onFaceStatusChange={
                handleFaceStatusChange
              }
              onCameraReady={
                handleCameraReady
              }
              onMonitoringEvent={
                handleMonitoringEvent
              }
            />

            <div
              style={{
                marginTop:
                  "15px",
                display:
                  "grid",
                gap:
                  "10px"
              }}
            >
              <LiveStatus
                icon="👤"
                label="Face"
                active={
                  faceDetected
                }
              />

              <LiveStatus
                icon="👀"
                label="Attention"
                active={
                  !lookingAside
                }
              />

              <LiveStatus
                icon="👥"
                label="Faces"
                active={
                  !multipleFaces
                }
              />

              <LiveStatus
                icon="🗣️"
                label="Talking"
                active={
                  !possibleTalking
                }
              />

              <LiveStatus
                icon="📱"
                label="Extra Device"
                active={
                  !extraDeviceDetected
                }
              />

              <LiveStatus
                icon="🛡️"
                label="Fullscreen"
                active={
                  isFullscreen
                }
              />
            </div>
          </div>

          <div>
            <div
              style={{
                background:
                  "rgba(255,255,255,0.06)",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                borderRadius:
                  "18px",
                padding:
                  "25px",
                marginBottom:
                  "20px"
              }}
            >
              <div
                style={{
                  color:
                    "#a78bfa",
                  fontWeight:
                    "700",
                  marginBottom:
                    "15px"
                }}
              >
                Question{" "}
                {currentQuestion +
                  1}
              </div>

              <h2
                style={{
                  fontSize:
                    "23px",
                  lineHeight:
                    "1.5",
                  marginBottom:
                    "25px"
                }}
              >
                {
                  question.question
                }
              </h2>

              <div
                style={{
                  display:
                    "grid",
                  gap:
                    "12px"
                }}
              >
                {question.options.map(
                  (
                    option,
                    index
                  ) => {
                    const selected =
                      answers[
                        question.id
                      ] ===
                      option;

                    return (
                      <button
                        key={
                          index
                        }
                        onClick={() =>
                          handleAnswer(
                            option
                          )
                        }
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "15px",
                          borderRadius:
                            "12px",
                          border:
                            selected
                              ? "2px solid #a78bfa"
                              : "1px solid rgba(255,255,255,0.1)",
                          background:
                            selected
                              ? "rgba(124,58,237,0.25)"
                              : "rgba(255,255,255,0.04)",
                          color:
                            "white",
                          cursor:
                            "pointer",
                          fontSize:
                            "16px"
                        }}
                      >
                        <strong>
                          {String.fromCharCode(
                            65 +
                              index
                          )}
                          .
                        </strong>{" "}
                        {
                          option
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
                marginBottom:
                  "20px"
              }}
            >
              <button
                disabled={
                  currentQuestion ===
                  0
                }
                onClick={() =>
                  goToQuestion(
                    currentQuestion -
                      1
                  )
                }
                style={{
                  ...buttonStyle,
                  opacity:
                    currentQuestion ===
                    0
                      ? 0.5
                      : 1
                }}
              >
                ← Previous
              </button>

              <button
                onClick={
                  toggleMarkQuestion
                }
                style={{
                  ...buttonStyle,
                  background:
                    markedQuestions[
                      question.id
                    ]
                      ? "#f59e0b"
                      : "#334155"
                }}
              >
                {markedQuestions[
                  question.id
                ]
                  ? "★ Marked"
                  : "☆ Mark for Review"}
              </button>

              <button
                disabled={
                  currentQuestion ===
                  examQuestions.length -
                    1
                }
                onClick={() =>
                  goToQuestion(
                    currentQuestion +
                      1
                  )
                }
                style={{
                  ...buttonStyle,
                  opacity:
                    currentQuestion ===
                    examQuestions.length -
                      1
                      ? 0.5
                      : 1
                }}
              >
                Next →
              </button>
            </div>

            <div
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                borderRadius:
                  "15px",
                padding:
                  "18px",
                marginBottom:
                  "20px"
              }}
            >
              <h3
                style={{
                  marginTop:
                    0
                }}
              >
                Questions
              </h3>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(45px, 1fr))",
                  gap:
                    "8px"
                }}
              >
                {examQuestions.map(
                  (
                    examQuestion,
                    index
                  ) => {
                    const answered =
                      answers[
                        examQuestion.id
                      ] !==
                      undefined;

                    const marked =
                      markedQuestions[
                        examQuestion.id
                      ];

                    return (
                      <button
                        key={
                          examQuestion.id
                        }
                        onClick={() =>
                          goToQuestion(
                            index
                          )
                        }
                        style={{
                          height:
                            "42px",
                          borderRadius:
                            "8px",
                          border:
                            currentQuestion ===
                            index
                              ? "2px solid #a78bfa"
                              : "1px solid rgba(255,255,255,0.1)",
                          background:
                            marked
                              ? "#f59e0b"
                              : answered
                              ? "#166534"
                              : "#334155",
                          color:
                            "white",
                          cursor:
                            "pointer",
                          fontWeight:
                            "700"
                        }}
                      >
                        {
                          index +
                          1
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                borderRadius:
                  "15px",
                padding:
                  "18px",
                marginBottom:
                  "20px"
              }}
            >
              <h3
                style={{
                  marginTop:
                    0
                }}
              >
                Monitoring Timeline
              </h3>

              {examEvents.length ===
              0 ? (
                <p
                  style={{
                    color:
                      "#94a3b8"
                  }}
                >
                  Monitoring events will
                  appear here.
                </p>
              ) : (
                <div
                  style={{
                    maxHeight:
                      "250px",
                    overflowY:
                      "auto",
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap:
                      "8px"
                  }}
                >
                  {examEvents
                    .slice()
                    .reverse()
                    .map(
                      (
                        event
                      ) => (
                        <div
                          key={
                            event.id
                          }
                          style={{
                            padding:
                              "10px 12px",
                            borderRadius:
                              "9px",
                            background:
                              event.severity ===
                              EVENT_SEVERITY.WARNING
                                ? "rgba(239,68,68,0.1)"
                                : "rgba(59,130,246,0.1)"
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              gap:
                                "10px"
                            }}
                          >
                            <span>
                              {
                                event.type
                              }
                            </span>

                            <span
                              style={{
                                color:
                                  "#94a3b8",
                                fontSize:
                                  "13px"
                              }}
                            >
                              {
                                event.timestamp
                              }
                            </span>
                          </div>

                          {event.message && (
                            <div
                              style={{
                                color:
                                  "#94a3b8",
                                fontSize:
                                  "13px",
                                marginTop:
                                  "4px"
                              }}
                            >
                              {
                                event.message
                              }
                            </div>
                          )}
                        </div>
                      )
                    )}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const confirmed =
                  window.confirm(
                    "Are you sure you want to end the exam?"
                  );

                if (
                  confirmed
                ) {
                  endExam(
                    false
                  );
                }
              }}
              style={{
                width:
                  "100%",
                padding:
                  "15px",
                borderRadius:
                  "12px",
                border:
                  "none",
                background:
                  "linear-gradient(135deg, #dc2626, #ef4444)",
                color:
                  "white",
                fontSize:
                  "17px",
                fontWeight:
                  "700",
                cursor:
                  "pointer"
              }}
            >
              Submit & End Exam 🏁
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------
 * RESULT CARD
 * --------------------------------------------------
 */

function ResultCard({
  title,
  value
}) {
  return (
    <div
      style={{
        padding:
          "20px",
        borderRadius:
          "15px",
        background:
          "rgba(255,255,255,0.06)",
        border:
          "1px solid rgba(255,255,255,0.1)"
      }}
    >
      <div
        style={{
          color:
            "#94a3b8",
          fontSize:
            "14px",
          marginBottom:
            "8px"
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "28px",
          fontWeight:
            "800"
        }}
      >
        {value}
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------
 * SUMMARY ITEM
 * --------------------------------------------------
 */

function SummaryItem({
  label,
  value
}) {
  return (
    <div
      style={{
        padding:
          "12px",
        borderRadius:
          "10px",
        background:
          "rgba(255,255,255,0.04)"
      }}
    >
      <div
        style={{
          color:
            "#94a3b8",
          fontSize:
            "13px"
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "20px",
          fontWeight:
            "700",
          marginTop:
            "4px"
        }}
      >
        {value}
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------
 * LIVE STATUS
 * --------------------------------------------------
 */

function LiveStatus({
  icon,
  label,
  active
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        padding:
          "11px 13px",
        borderRadius:
          "10px",
        background:
          "rgba(255,255,255,0.06)",
        border:
          "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <span>
        {icon} {label}
      </span>

      <span
        style={{
          fontSize:
            "13px",
          fontWeight:
            "700",
          color:
            active
              ? "#4ade80"
              : "#f87171"
        }}
      >
        {active
          ? "OK"
          : "Warning"}
      </span>
    </div>
  );
}

/*
 * --------------------------------------------------
 * SMALL CARD
 * --------------------------------------------------
 */

function SmallCard({
  icon,
  title,
  text
}) {
  return (
    <div
      style={{
        padding:
          "18px",
        borderRadius:
          "14px",
        background:
          "rgba(255,255,255,0.05)",
        border:
          "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <div
        style={{
          fontSize:
            "25px",
          marginBottom:
            "8px"
        }}
      >
        {icon}
      </div>

      <strong>
        {title}
      </strong>

      <p
        style={{
          margin:
            "6px 0 0",
          color:
            "#94a3b8",
          fontSize:
            "14px"
        }}
      >
        {text}
      </p>
    </div>
  );
}

/*
 * --------------------------------------------------
 * BUTTON STYLE
 * --------------------------------------------------
 */

const buttonStyle = {
  padding:
    "12px 18px",
  borderRadius:
    "10px",
  border:
    "none",
  background:
    "#334155",
  color:
    "white",
  fontWeight:
    "600",
  cursor:
    "pointer"
};