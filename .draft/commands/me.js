import chalk from 'chalk'

import { print, request } from '../lib/index.js'
import { loginInstructions } from '../lib/notifications/index.js'

const meCommand = async(options) => {
  try {
    const user = await request('/v1/me');
    print(`You are signed in as ${chalk.bold(user.name)}.`)
    
    print(`${chalk.bold('id')}: ${user.id}`)
    print(`${chalk.bold('Email')}: ${user.email}`)
    print(`${chalk.bold('Avatar')}: ${user.avatar_url}`)
    print(`${chalk.bold('Created at')}: ${user.created_at}`)
  
    print(`Run ${chalk.bold('kiqr logout')} to logout.`)
  } catch(error) { 
    loginInstructions() 
  }
}

export default meCommand