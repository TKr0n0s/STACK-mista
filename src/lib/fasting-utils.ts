export function getFastingRatio(startHour: number, endHour: number) {
  if (startHour === endHour) {
    return { fasting: 0, eating: 0, label: '--:--', invalid: true }
  }
  const eating = ((startHour - endHour) + 24) % 24
  const fasting = 24 - eating
  return { fasting, eating, label: `${fasting}:${eating}`, invalid: false }
}
