import TelegramBot from "node-telegram-bot-api";
import { MessageMService, UserCb } from "../dto/msgData";
import { buttons, cbs, generateReportTimeButtons, mainOptions, Options, settingsArtOptions, yesNo } from "../components/buttons";
import { redis, rStates, ttls } from "../redis";
import { users_db } from "../../database/models/users";
import { handleCancelArticle, handleStartMenu, sendImageWithText } from "../components/answers";
import { RediceService } from "../bot";
import { MessageService } from "../services/messageService";

export async function callbackHandler(query: TelegramBot.CallbackQuery, bot: TelegramBot, RS: redis, MS: MessageService) {
  const userCb = new UserCb(query);
  const { chatId, cb, user_id, username, messageId } = userCb;
  const msgs: MessageMService[] = []

  if (cb === cbs.menu) {
    await RediceService.deleteUserState(chatId)
    const answer = await handleStartMenu(bot, userCb, '/menu');
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
    return MS.addNewAndDelOld(msgs, chatId)
  }

//*********************** ARTICLE NEW ***********************//
  if (cb === cbs.setNewUserType) {
    await users_db.updateType(chatId)
    const answer = await handleStartMenu(bot, userCb, '/menu');
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
    return MS.addNewAndDelOld(msgs, chatId)
  }
  
  if (cb === buttons.followArticle.callback_data) {
    const [ wbKey, isTrackedYet ] = await users_db.checkWbApiKeyAndTrack(chatId);

    if (!wbKey) {
      await RS.setUserState(chatId, rStates.waitWbApiKey, ttls.usual)
      const answer = await bot.sendMessage(chatId, '🔑 Сначала нужно добавить ключ от WB API. Введите его в ответном сообщении.', new Options([[buttons.menu]]));
      msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
      return MS.addNewAndDelOld(msgs, chatId)
    }

    if (!isTrackedYet) {
      await RS.setUserState(chatId, rStates.waitArticle, ttls.usual); 
      const answer = await bot.sendMessage(chatId, 'Введите артикул 🔢', new Options([[buttons.menu]]));
      msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
      return MS.addNewAndDelOld(msgs, chatId)
    } else {
      const answer = await bot.sendMessage(chatId, 'Вы перестанете отслеживать текущий артикул. Вы уверены?', new Options([[buttons.yesReadyToFollow], [buttons.menu]]) );
      msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
      return MS.addNewAndDelOld(msgs, chatId)
    }
  }

  if (cb === buttons.yesReadyToFollow.callback_data) {
    await RS.setUserState(chatId, rStates.waitArticle, ttls.usual); 
    const answer = await bot.sendMessage(chatId, 'Введите артикул 🔢', new Options([[buttons.menu]]));
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
    return MS.addNewAndDelOld(msgs, chatId)
  };

  if (cb === buttons.setWbApiKey.callback_data) {
    await RS.setUserState(chatId, rStates.waitWbApiKey, ttls.usual); 
    const answer = await bot.sendMessage(chatId, '🔑 Введите ключ от WB API :)', new Options([[buttons.menu]]));
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
    return MS.addNewAndDelOld(msgs, chatId)
  }

//*********************** SHEETS OLD ***********************//
  if (cb === cbs.setOldUserType || cb === cbs.goPrem) {
    await RS.setUserState(chatId, rStates.waitPremPass, ttls.usual)
    const answer = await bot.sendMessage(chatId, '🔑 Введите ваш пароль :)', new Options([[buttons.menu]]));
    msgs.push({chatId, messageId: answer.message_id, direction: 'outgoing', content: 'await_pass'})
    return MS.saveMessages(msgs)
  };

  if (cb.startsWith(cbs.onTable)) {
    if (cb === cbs.onTable) {
      const answer = await bot.sendMessage(chatId, 'Выберите время, когда вам будет удобно получать отчет:', {
        reply_markup: {
          inline_keyboard: generateReportTimeButtons(cbs.onTable)
        }
      });
      msgs.push({chatId, messageId: answer.message_id, direction: 'outgoing'});
      await MS.addNewAndDelOld(msgs, chatId);
    } else {
      const selectedTime = cb.split(cbs.onTable)[1]; 
      await users_db.updateReportTime(chatId, selectedTime.split(':')[0]);
      const answer = await bot.sendMessage(chatId!, `Вы будете получать отчёт из Google Sheets ежедневно в ${selectedTime}:00`, mainOptions('old_ss'));
      msgs.push({chatId, messageId: answer.message_id, direction: 'outgoing'});
      await MS.addNewAndDelOld(msgs, chatId);
    }
  };

  if (cb.startsWith(cbs.offTable)) {
    if (cb === cbs.offTable) {
      const answer = await bot.sendMessage(chatId, 'Вы уверены, что хотите отключить ежедневную рассылку?', yesNo(cbs.offTable));
      msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
      await MS.addNewAndDelOld(msgs, chatId);
    } else {
      let answer;
      if (cb === cbs.offTable + cbs.yes) {
        await users_db.updateType(chatId, undefined, 'old');
        answer = await sendImageWithText(bot, chatId, 'success.png' , 'Вы успешно отключили ежедневную рассылку', mainOptions('old'));
      } else {
        answer = await handleStartMenu(bot, userCb, '/menu');
      }

      msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
      await MS.addNewAndDelOld(msgs, chatId);
    };
  };

// *********** REPORT TIME FOR NEW|OLD *************
  if (cb.startsWith(cbs.changeTime)) {
    if (cb === cbs.changeTime) {
      const answer = await bot.sendMessage(chatId, 'Выберите время, когда вам будет удобно получать отчет:', {
        reply_markup: {
          inline_keyboard: generateReportTimeButtons(cbs.changeTime)
        }
      });
      msgs.push({chatId, messageId: answer.message_id, direction: 'outgoing'});
      await MS.addNewAndDelOld(msgs, chatId);
    } else {
      const selectedTime = cb.split(cbs.changeTime)[1]; 
      const type = await users_db.updateReportTime(chatId, selectedTime.split(':')[0]);
      const answer = await bot.sendMessage(chatId!, `Вы будете получать отчёт ежедневно в ${selectedTime}:00`, mainOptions(type));
      msgs.push({chatId, messageId: answer.message_id, direction: 'outgoing'});
      await MS.addNewAndDelOld(msgs, chatId);
    }
  };

//*********************** ARTICLE SETTINGS ***********************//

  if (cb === cbs.settingsArt) {
    const answer = await sendImageWithText(bot, chatId, 'settings.jpg', " ", settingsArtOptions());
    msgs.push({chatId, messageId: answer.message_id, direction: 'outgoing'});
    await MS.addNewAndDelOld(msgs, chatId);
  }

  if (cb === cbs.cancelArt) {
    const answer = await handleCancelArticle(bot, userCb)
    msgs.push({chatId, messageId: answer.message_id, direction: 'outgoing'});
    await MS.addNewAndDelOld(msgs, chatId);
  }

  if (cb === cbs.costArt) {
    await RS.setUserState(chatId, rStates.waitCostArt, ttls.usual); 
    const answer = await bot.sendMessage(chatId, 'Введите себестоимость товара 💵', new Options([[buttons.menu]]));
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
    return MS.addNewAndDelOld(msgs, chatId)
  }

  if (cb === cbs.titleArt) {
    await RS.setUserState(chatId, rStates.waitTitleArt, ttls.usual); 
    const answer = await bot.sendMessage(chatId, 'Введите название товара', new Options([[buttons.menu]]));
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
    return MS.addNewAndDelOld(msgs, chatId)
  }

  return bot.answerCallbackQuery(query.id);
}