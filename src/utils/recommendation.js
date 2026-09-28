export function getRecommendation(
  score,
  trend
) {
  if (score < 35) {
    return "Your current observable pattern is close to your baseline. You can continue studying.";
  }

  if (score < 65) {
    if (trend === "Increasing") {
      return "Your pattern is increasing. Consider taking a short 2–5 minute break.";
    }

    return "Consider taking a short 2–5 minute break and then continue.";
  }

  if (trend === "Increasing") {
    return "Your pattern is elevated and increasing. Consider pausing your study session and taking a longer break.";
  }

  return "Your observable pattern is elevated. Consider pausing for a few minutes and resetting before continuing.";
}