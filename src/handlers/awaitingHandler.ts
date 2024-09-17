import axios from "axios";
import { AwaitingAnswer, UserMsg } from "../dto/msgData";
import { rStates } from "../redis";
import { users_db } from "../../database/models/users";

export async function awaitingHandler(data: UserMsg, state: string, env: any) {
  if (!data.text) {
    return new AwaitingAnswer({ result: false, text: "Текст отсутствует." });
  }
  
  if (!isKey(data.text, state)) {
    return new AwaitingAnswer({ result: false, text: "Введенные данные не соответствуют ожидаемому формату." });
  }

  try {
    switch (state) {
      case rStates.waitPremPass:
        const response = await axios.post(env.PASS_CHECKER_URL, { pass: data.text }, {
          headers: {
              'Content-Type': 'application/json'
          }
        })
        const res = response.data
        console.log('pass checker result: '+JSON.stringify(res))
        if (res.error) {
          return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
        } else if (res.status === false) {
          return new AwaitingAnswer({ result: false, text: res.text})
        } 
        await users_db.updateType(data.chatId, data.text)
        return new AwaitingAnswer({ result: true, text: "Спасибо. Проверка пройдена успешно.", type: 'old' })
        default: 
        return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
      }
  } catch (e) {
    console.error('Error in awaiting handler: '+e)
    return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
  }
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
