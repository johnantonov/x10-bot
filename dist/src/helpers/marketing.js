"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCampaigns = processCampaigns;
const dates_1 = require("../utils/dates");
function processCampaigns(advertisements, userNmId) {
    const result = (0, dates_1.create30DaysObject)();
    advertisements.forEach((campaign) => {
        const firstDay = campaign.days[0];
        if (firstDay) {
            const isTargetCampaign = firstDay.apps.some((app) => app.nm.some((nm) => {
                console.log(+nm.nmId, +userNmId);
                return +nm.nmId === +userNmId;
            }));
            console.log(isTargetCampaign);
            if (isTargetCampaign) {
                campaign.days.forEach((day) => {
                    const dayDate = new Date(day.date).toISOString().split('T')[0];
                    if (result.hasOwnProperty(dayDate)) {
                        result[dayDate] += day.sum;
                        console.log(day.sum);
                    }
                });
            }
        }
    });
    return result;
}
