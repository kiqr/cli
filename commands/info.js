import chalk, { chalkStderr } from 'chalk'
import { createSpinner } from 'nanospinner'

import kiqrConfig from '../lib/kiqr-config.js'
import print from '../lib/print.js'

import request from '../lib/request.js'

const displayUserProfile = async(options) => {
  const spinner = createSpinner('Loading user profile').start()
  try {
    const user = await request('/v1/me');
    spinner.success({ text: 'Current user:', mark: chalkStderr.green.bold('✓') })
    print(chalk.bold('id') + ': ' + user.id)
    print(chalk.bold('name') + ': ' + user.name)
    print(chalk.bold('email') + ': ' + user.email)
    print(chalk.bold('created_at') + ': ' + user.created_at)
  } catch (error) {
    spinner.error({ text: 'You are not logged in.', mark: chalkStderr.red.bold('✗') })
    print(`If you don\'t have an account, please sign up first at ${chalk.blue('https://kiqr.cloud')}`)
    print(`Then run ${chalk.bold('kiqr login')} to login using your kiqr.cloud credentials.`)
  }
}

const displayProjectConfiguration = async(options) => {
  const { filePath, config, foundConfig } = await kiqrConfig();

  if (!foundConfig) {
    return
  }

  print(chalk.bold('Project ID') + ': ' + config.projectId)
  print(chalk.bold('Api version') + ': ' + config.projectId)
}

const infoCommand = async(options) => {
  await displayUserProfile();
  console.log('')
  await displayProjectConfiguration();
}

export default infoCommand