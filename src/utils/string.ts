/**
 * return report title: #Balandina_10X
 */
export function getFormatReportTitle(input: string): string {
  if (input.includes('|')) {
    const name = input.split('|')[0].trim() + "_";; 
    return '#' + name.replace(/\s+/g, '_') + '10X';
  } else {
    return input.trim(); 
  }
}

