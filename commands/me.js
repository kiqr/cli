import chalk from 'chalk'

import printers from '../lib/printers.js'
import requests from '../lib/requests.js'
import auth from '../lib/auth.js'

const me = async() => {
  const { error: errorMessage } = printers()
  const { get } = requests()
  const { hasToken } = auth()

  if (!hasToken) {
    errorMessage(`Missing API credentials. Please login using the command ${chalk.bold("kiqr login")} first.`)
    return
  }

  try {
    const user = await get('/v1/me')
    console.table(user)
  } catch(error) {
    errorMessage(error)
  }
}

export default me