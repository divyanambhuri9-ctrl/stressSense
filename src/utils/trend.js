export function addScore(scores, newScore) {
  const updatedScores = [
    ...scores,
    newScore
  ];

  // Keep only the latest 20 scores
  return updatedScores.slice(-20);
}


export function getTrend(scores) {
  if (scores.length < 2) {
    return "Stable";
  }

  const first = scores[0];
  const last = scores[scores.length - 1];

  const difference = last - first;

  if (difference > 10) {
    return "Increasing";
  }

  if (difference < -10) {
    return "Decreasing";
  }

  return "Stable";
}