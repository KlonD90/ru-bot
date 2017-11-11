const debug = require('debug')('rubot:features:spam-hammer:index')
const { Extra } = require('telegraf')
const text = require('../../text')
const { allowWhiteListChat } = require('../../middlewares/allowed-chat')
const { adminRequiredSilenced } = require('../../middlewares/admin-required')
const { message: Message, sequelize } = require('../../models')


function handleEachMessage({ message, from, chat }, next) {
  debug(`handleEachMessage(messageId: ${message.message_id}, fromId: ${from.id}, chatId: ${chat.id}`)
  if (chat.type !== 'private') {
    Message.create({
      messageId: message.message_id,
      chatId: chat.id,
      authorId: from.id,
      date: message.date,
    })
  }

  next()
}

/* eslint-disable no-restricted-syntax, no-await-in-loop */
function handleSpamCommand({ message, from, chat, update, match, reply, getChatClass }) {
  const [, reason] = match
  if (update.message.reply_to_message) {
    const replyMessage = update.message.reply_to_message
    const spammer = replyMessage.from
    const authorId = String(spammer.id)
    const chatId = String(chat.id)

    sequelize.transaction(async (transaction) => {
      const list = await Message.findAll({ transaction, where: { authorId, chatId } })

      try {
        for (const msg of list) {
          try {
            await getChatClass(chat.id).deleteMessage(msg.messageId)
          }
          catch (error) {
            debug(error)
          }
        }
        await getChatClass(chat.id).deleteMessage(message.message_id)
      }
      catch (error) {
        debug(error)
      }

      await Message.destroy({
        transaction, where: { authorId, chatId },
      })
    })
  }
  else {
    reply(text.spamHammer.spamCommandShouldBeReplied(), Extra.inReplyTo(message.message_id))
  }
}
/* eslint-enable no-restricted-syntax */


module.exports = function featureSpamHammer(bot) {
  bot.on('message', allowWhiteListChat, handleEachMessage)
  bot.hears(new RegExp(`^${text.commands.spam()}( .*)?`), adminRequiredSilenced, handleSpamCommand)
}