import chalk, { chalkStderr } from 'chalk'
import { createSpinner } from 'nanospinner'

import { print, request } from '../lib/index.js'
import { loginInstructions } from '../lib/notifications/index.js'

const meCommand = async(options) => {
  const spinner = createSpinner('Loading user profile.').start()
  try {
    const user = await request('/v1/me');
    spinner.success({ text: `You are signed in as ${chalk.bold(user.name)}:`, mark: chalk.green.bold('✓') })
    print(`${chalk.bold('id')}: ${user.id}`)
    print(`${chalk.bold('Email')}: ${user.email}`)
    print(`${chalk.bold('Avatar')}: ${user.avatar_url}`)
    print(`${chalk.bold('Created at')}: ${user.created_at}`)
    print(`Run ${chalk.bold('kiqr logout')} to logout.`)
  } catch (error) {
    spinner.error({ text: error, mark: chalkStderr.red.bold('✗') })
    loginInstructions()
  }
}

export default meCommand