export function getStressReasons({
  eyeDifference = 0,
  headDifference = 0,
  facialDifference = 0
}) {
  const reasons = [];

  if (eyeDifference > 0.02) {
    reasons.push(
      "Eye behavior differs from your baseline."
    );
  }

  if (headDifference > 0.01) {
    reasons.push(
      "Head movement is above your baseline."
    );
  }

  if (facialDifference > 0.05) {
    reasons.push(
      "Facial movement differs from your baseline."
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "Current observable signals are close to your baseline."
    );
  }

  return reasons;
}