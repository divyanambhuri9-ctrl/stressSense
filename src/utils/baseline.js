export function createBaseline(samples) {
  if (!samples.length) {
    return null;
  }

  const average = (key) => {
    return (
      samples.reduce(
        (sum, item) => sum + (item[key] || 0),
        0
      ) / samples.length
    );
  };

  return {
    eye: average("eye"),
    head: average("head"),
    facial: average("facial")
  };
}

export function differenceFromBaseline(
  current,
  baseline
) {
  if (!baseline) {
    return {
      eye: 0,
      head: 0,
      facial: 0
    };
  }

  return {
    eye: Math.abs(
      current.eye - baseline.eye
    ),

    head: Math.abs(
      current.head - baseline.head
    ),

    facial: Math.abs(
      current.facial - baseline.facial
    )
  };
}