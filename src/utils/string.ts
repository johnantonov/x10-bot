export function getFormatReportTitle(input: string): string {
  return '#' + input.trim().replace(/\s+/g, '_');
}