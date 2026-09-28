export function calculateSessionSummary(scores) {
  if (!scores || scores.length === 0) {
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      level: "No Data",
      trend: "Stable"
    };
  }

  // Make sure all stress readings are valid numbers
  const validScores = scores
    .map((score) => Number(score))
    .filter((score) => Number.isFinite(score));

  if (validScores.length === 0) {
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      level: "No Data",
      trend: "Stable"
    };
  }

  // Average
  const total = validScores.reduce(
    (sum, score) => sum + score,
    0
  );

  const average = total / validScores.length;

  // Highest and lowest
  const highest = Math.max(...validScores);
  const lowest = Math.min(...validScores);

  // Overall stress level
  let level = "Low";

  if (average >= 70) {
    level = "High";
  } else if (average >= 40) {
    level = "Moderate";
  }

  // Session trend
  let trend = "Stable";

  if (validScores.length >= 2) {
    const first = validScores[0];
    const last = validScores[validScores.length - 1];

    if (last > first + 10) {
      trend = "Increasing";
    } else if (last < first - 10) {
      trend = "Decreasing";
    }
  }

  return {
    average: Math.round(average),
    highest: Math.round(highest),
    lowest: Math.round(lowest),
    level,
    trend
  };
}