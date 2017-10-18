const debug = require('debug')('rubot:commands:start')


module.exports = ({ reply, i18n, from }) => {
  debug('/start')
  reply(i18n.t('common.greetings', { user: from }))
}
