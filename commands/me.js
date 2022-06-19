import chalk from 'chalk'

import printers from '../lib/printers.js'
import requests from '../lib/requests.js'
import userSession from '../lib/user-session.js'

const info = async() => {
  const { error: errorMessage } = printers()
  const { get } = requests()
  const { isLoggedIn } = userSession()
  const { bold } = chalk

  if (!isLoggedIn) {
    errorMessage(`Missing API credentials. Please login using the command ${bold("kiqr login")} first.`)
    return
  }

  try {
    const user = await get('/v1/me')
    console.table(user)
  } catch(error) {
    errorMessage(error)
  }
}

export default info