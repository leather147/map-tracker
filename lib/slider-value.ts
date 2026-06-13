export function getSliderNumber(value: number | number[]): number {
  return Array.isArray(value) ? value[0] : value
}
