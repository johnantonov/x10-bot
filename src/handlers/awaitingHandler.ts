import axios from "axios";
import { AwaitingAnswer, UserMsg } from "../dto/msgData";
import { rStates } from "../redis";
import { users_db } from "../../database/models/users";
import { user_articles_db } from "../../database/models/user_articles";

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
        
      case rStates.waitWbApiKey: 
        try {
          await users_db.updateWbApiKey(data.chatId, data.text)
          return new AwaitingAnswer({ result: true, text: "Ваш ключ добавлен.", type: 'new' })
        } catch (e) {
          console.error('awaiting handler: error with set wb api key - '+e)
          return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
        }

      case rStates.waitArticle:
        try {
          await users_db.updateArticle(data.chatId, +data.text)
          await user_articles_db.updateArticle(data.chatId, data.text)
          return new AwaitingAnswer({ result: true, text: "Ваш артикул добавлен. В меню вы можете внести дополнительные настройки для получения более точного отчета.", type: 'new_art' })
        } catch(e) {
          console.error('awaiting handler: error to set article - '+e)
          return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
        }

      case rStates.waitCostArt: 
        try {
          await user_articles_db.updateField(data.chatId, 'self_cost', data.text)
          return new AwaitingAnswer({ result: true, text: "Спасибо. Себестоимость будет учтена.", type: 'new_art' })
        } catch(e) {
          console.error('awaiting handler: error to set cost - '+e)
          return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
        }

      case rStates.waitTitleArt: 
        try {
          await user_articles_db.updateField(data.chatId, 'name', data.text)
          return new AwaitingAnswer({ result: true, text: "Название товара сохранено.", type: 'new_art' })
        } catch(e) {
          console.error('awaiting handler: error to set name - '+e)
          return new AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." })
        }
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
  
  if (state === rStates.waitWbApiKey) {
    return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{50,}$/.test(text);
  }

  if (state === rStates.waitArticle) {
    return /^\d{6,}$/.test(text);
  }

  if (state === rStates.waitCostArt) {
    return /^\d+$/.test(text);
  }

  return true
}
