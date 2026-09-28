export function getStressReasons(
  eyeDifference,
  headDifference,
  facialDifference
) {
  const reasons = [];

  if (Math.abs(eyeDifference) > 0.2) {
    reasons.push(
      "Eye movement is different from your personal baseline."
    );
  }

  if (Math.abs(headDifference) > 0.2) {
    reasons.push(
      "Head movement is different from your personal baseline."
    );
  }

  if (Math.abs(facialDifference) > 0.2) {
    reasons.push(
      "Facial movement is different from your personal baseline."
    );
  }

  return reasons;
}