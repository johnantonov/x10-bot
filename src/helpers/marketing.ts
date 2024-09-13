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

export function processCampaigns(advertisements : Record<string, any>, userNmId: number) {
  const result = create30DaysObject();

  advertisements.forEach((campaign: any) => {
    const firstDay = campaign.days[0];
    if (firstDay) {
      const isTargetCampaign = firstDay.apps.some((app: Record<string, any>) => 
        app.nm.some((nm: Record<string, any>) => nm.nmId === userNmId)
      );

      if (isTargetCampaign) {
        campaign.days.forEach((day: Record<string, any>) => {
          const dayDate = new Date(day.date).toISOString().split('T')[0];
          if (result.hasOwnProperty(dayDate)) {
            result[dayDate] += day.sum;
          }
        });
      }
    }
  });

  return result;
}