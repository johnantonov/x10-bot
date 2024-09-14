"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYesterdayDate = getYesterdayDate;
exports.create30DaysObject = create30DaysObject;
exports.getXdaysAgoArr = getXdaysAgoArr;
function getYesterdayDate() {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let year = yesterday.getFullYear();
    let month = ('0' + (yesterday.getMonth() + 1)).slice(-2);
    let day = ('0' + yesterday.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}
function create30DaysObject() {
    const daysObj = {};
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        daysObj[dateString] = 0;
    }
    return daysObj;
}
function getXdaysAgoArr(x) {
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
