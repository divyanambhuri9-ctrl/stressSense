export function calculateStressScore(
  eyeDifference,
  headDifference,
  facialDifference
) {
  const eyeScore = Math.min(
    Math.abs(eyeDifference) * 100,
    100
  );

  const headScore = Math.min(
    Math.abs(headDifference) * 100,
    100
  );

  const facialScore = Math.min(
    Math.abs(facialDifference) * 100,
    100
  );

  const score =
    eyeScore * 0.4 +
    headScore * 0.3 +
    facialScore * 0.3;

  return Math.round(
    Math.min(score, 100)
  );
}


export function getStressLevel(score) {

  if (score >= 70) {
    return "High";
  }

  if (score >= 40) {
    return "Moderate";
  }

  return "Low";
}