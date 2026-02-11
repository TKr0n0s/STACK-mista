export function getFastingRatio(startHour: number, endHour: number) {
  if (startHour === endHour) return { fasting: 24, eating: 0, label: '24:0' }
  const eating = ((startHour - endHour) + 24) % 24
  const fasting = 24 - eating
  return { fasting, eating, label: `${fasting}:${eating}` }
}
