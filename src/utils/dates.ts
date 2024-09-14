export function getYesterdayDate() {
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1); 

  let year = yesterday.getFullYear();
  let month = ('0' + (yesterday.getMonth() + 1)).slice(-2); 
  let day = ('0' + yesterday.getDate()).slice(-2); 

  return `${year}-${month}-${day}`; 
}

export function create30DaysObject() {
  const daysObj: Record<string, any> = {};
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    daysObj[dateString] = 0; 
  }
  
  return daysObj;
}

export function getXdaysAgoArr(x: number) {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < x; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const formattedDate = date.toISOString().split('T')[0];
    dates.push(formattedDate);
  }

  return dates;
}

export function sortObjDatesKeys(obj: Record<string, any>) {
  return Object.keys(obj).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
}

export function sortObjDatesEntries(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()) 
  );
}