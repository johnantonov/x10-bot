import axios from "axios";
import { AwaitingAnswer, UserMsg } from "../dto/msgData";
import { rStates } from "../redis";
import { users_db } from "../../database/models/users";
import dotenv from 'dotenv';
import { connections_db } from "../../database/models/connections";
dotenv.config();

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
      const responsePass = await checkConnection(data.text);
      const res = responsePass.data;
  
      console.log('pass checker result: ' + JSON.stringify(res));
  
      if (res.error) {
        return handleError("Возникла ошибка, попробуйте еще раз.");
      }
  
      if (res.status === false) {
        return handleError(res.text);
      }
  
      await connections_db.addConnection({ chat_id: data.chatId, ss: data.text });
  
      if (state === rStates.waitPremPass) {
        await users_db.updateType(data.chatId, data.text);
        return new AwaitingAnswer({ result: true, text: "Спасибо. Проверка пройдена успешно.", type: 'registered' });
      } else if (state === rStates.waitNewConnection) {
        return new AwaitingAnswer({ result: true, text: "Вы успешно подключили еще одну систему.", type: 'registered' });
      }
  
      return handleError("Возникла ошибка, попробуйте еще раз.");
    }
  
    return handleError("Возникла ошибка, попробуйте еще раз.");
  } catch (e) {
    console.error('Error in awaiting handler: '+e)
    return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
  }
}

async function checkConnection(pass: string) {
  return axios.post(process.env.PASS_CHECKER_URL!, { pass: pass }, {
    headers: {
        'Content-Type': 'application/json'
    }
  })
}

export function isKey(text: string, state: string): Boolean {
  if (state === rStates.waitPremPass) {
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
