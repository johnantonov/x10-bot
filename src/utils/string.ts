export function getFormatReportTitle(input: string): string {
  if (input.includes('|')) {
    const name = input.split('|')[0].trim(); 
    return '#' + name.replace(/\s+/g, '_') + '10X';
  } else {
    return input.trim(); 
  }
}

