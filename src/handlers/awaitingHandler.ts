import axios from "axios";
import { AwaitingAnswer, UserMsg } from "../dto/messages";
import { redis, rStates } from "../redis";
import { users_db } from "../../database/models/users";
import dotenv from 'dotenv';
import { connections_db } from "../../database/models/connections";
import { getFormatReportTitle } from "../utils/string";
dotenv.config();

/**
 * handler that starting if user has any state in redis
 * @param {UserMsg} data - user message data
 * @param {string} state - user state
 */
export async function awaitingHandler(data: UserMsg, state: string) {
  if (!data.text) {
    return new AwaitingAnswer({ result: false, text: "Текст отсутствует." });
  }
  
  if (!isKey(data.text, state)) {
    return new AwaitingAnswer({ result: false, text: "Введенные данные не соответствуют ожидаемому формату." });
  }

  try {
    const handleError = (message: string) => new AwaitingAnswer({ result: false, text: message });
    
    if (state === rStates.waitPremPass || state === rStates.waitNewConnection) {
      const response = (await checkConnection(data.text)).data;

      console.log('pass checker result: ' + JSON.stringify(response));

      if (response.error) {
        return handleError("Возникла ошибка, попробуйте еще раз.");
      }

      if (response.status === false) {
        return handleError(response.text);
      }

      await connections_db.addConnection({ chat_id: data.chat_id, ss: data.text, title: '⚙️' + getFormatReportTitle(response.spreadsheet_name) });

      if (state === rStates.waitPremPass) {
        await users_db.updateType(data.chat_id, data.text);
        return new AwaitingAnswer({ result: true, text: "✅ Спасибо. Таблица успешно подключена.", type: 'registered'});
      } else if (state === rStates.waitNewConnection) {
        return new AwaitingAnswer({ result: true, text: "✅ Вы успешно подключили еще одну систему.", type: 'registered'});
      }
  
      return handleError("Возникла ошибка, попробуйте еще раз.");

    } else if (state.startsWith(rStates.waitConnectionTitle)) {
      try {
        const ss = state.split('?')[1]
        await connections_db.updateTitle(data.chat_id, ss, '⚙️' + data.text)
        return new AwaitingAnswer({ result: true, text: "✅ Подключение переименовано." });
      } catch {
        return handleError("Возникла ошибка, попробуйте еще раз.");
      }
    }

    return handleError("Возникла ошибка, попробуйте еще раз.");
  } catch (e) {
    console.error('Error in awaiting handler: '+e)
    return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
  }
}

/**
 * check connection
 * @param {string} pass - key text
 */
async function checkConnection(pass: string) {
  return axios.post(process.env.PASS_CHECKER_URL!, { pass: pass }, {
    headers: {
        'Content-Type': 'application/json'
    }
  })
}

/**
 * check format 
 * @param {string} text - key text
 * @param {string} state - user state from redis
 */
export function isKey(text: string, state: string): Boolean {
  if ([rStates.waitPremPass, rStates.waitNewConnection].includes(state)) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d_-]{20,}$/.test(text);
  }
  
  // if (state === rStates.waitWbApiKey) {
  //   return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{50,}$/.test(text);
  // }

  // if (state === rStates.waitArticle) {
  //   return /^\d{6,}$/.test(text);
  // }

  // if (state === rStates.waitCostArt) {
  //   return /^\d+$/.test(text);
  // }

  return true
}
