export function getFormatReportTitle(input: string): string {
  const name = input.split('|')[0]
  return '#' + name.trim().replace(/\s+/g, '_') + '10X';
}