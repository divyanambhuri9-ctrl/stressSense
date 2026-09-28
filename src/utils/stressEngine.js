export function calculateStressScore({
  eyeDifference = 0,
  headDifference = 0,
  facialDifference = 0
}) {
  // Convert small measurements into useful 0-100 ranges

  const eyeScore = Math.min(
    eyeDifference * 100,
    100
  );

  const headScore = Math.min(
    headDifference * 1000,
    100
  );

  const facialScore = Math.min(
    facialDifference * 200,
    100
  );

  // Combine the three observable signals

  const score =
    eyeScore * 0.35 +
    headScore * 0.30 +
    facialScore * 0.35;

  return Math.round(
    Math.max(0, Math.min(100, score))
  );
}

export function getStressLevel(score) {
  if (score < 35) {
    return "Low";
  }

  if (score < 65) {
    return "Moderate";
  }

  return "Elevated";
}