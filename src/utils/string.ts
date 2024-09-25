/**
 * return report title: #Balandina_10X
 */
export function getFormatReportTitle(input: string): string { 
  const cleanedInput = input.replace(/[^\w\s|]/g, '');

  if (cleanedInput.includes('|')) {
    const name = cleanedInput.split('|')[0].trim() + "_";; 
    return '#' + name.replace(/\s+/g, '_') + '10X';
  } else {
    return '#' + cleanedInput.trim();  
  }
}

/**
 * formatting error message
 */
export function formatError(error: any, contextMessage: string) {
  const errorMessage = error?.response?.body?.description || (error as Error).message || 'Unknown error';
  console.error(`Error: ${contextMessage} - ${errorMessage.substring(0, 200)}`);
}