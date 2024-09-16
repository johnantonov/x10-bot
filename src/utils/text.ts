import { Article } from "../../database/models/user_articles";
import { User } from "../dto/user";

export function formatReportMessage(data: string[]): string {
  let message = '';

  data.forEach((row, i) => {
    if (i === 0) {
      message += `<b>${row[0]}</b>\n`;
    } else if (row[0].startsWith('ТОП')) {
      message += `\n<b>${row[0]}</b>\n`;
    } else if (row[0].startsWith('Товар')) {
      message += `${row[0]} ${row[1]}\n`;
    } else {
      message += `<b>${row[0]}</b> ${row[1]}\n`;
    }
  });

  return message.trim();
}

export function formatReportArticleMessage(data: any, articleData: Article | null, user: User, date: string) {
  const name = articleData?.name ? articleData?.name : user.article;
  
  let selfCost = 0;
  if (articleData?.self_cost) {
    selfCost = data[0].buyoutsCount * articleData.self_cost;
  };
  
  console.log(JSON.stringify(articleData))

  const rev = data[0].buyoutsSumRub - selfCost - (articleData?.marketing_cost[date] ?? 0);

  const formatNumber = (num: number): string => {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  let message = `
Заказы ${data[0].ordersCount} шт на ${formatNumber(data[0].ordersSumRub)} руб
Выкупы ${data[0].buyoutsCount} шт на ${formatNumber(data[0].buyoutsSumRub)} руб
Рекламный бюджет ${formatNumber(articleData?.marketing_cost[date] ?? 0)}
<b>Прибыль: ${formatNumber(rev)}</b>`;

  return `<b>Отчет за ${date}: ${name}</b>\n${message}`;
}