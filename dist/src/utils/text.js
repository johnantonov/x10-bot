"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReportMessage = formatReportMessage;
function formatReportMessage(data) {
    let message = '';
    data.forEach((row, i) => {
        if (i === 0) {
            message += `<b>${row[0]}</b>\n`;
        }
        else if (row[0].startsWith('ТОП')) {
            message += `\n<b>${row[0]}</b>\n`;
        }
        else if (row[0].startsWith('Товар')) {
            message += `${row[0]} ${row[1]}\n`;
        }
        else {
            message += `<b>${row[0]}</b> ${row[1]}\n`;
        }
    });
    return message.trim();
}
