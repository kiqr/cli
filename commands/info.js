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
  const { filePath, config, hasConfig } = await kiqrConfig();
  const spinner = createSpinner('Searching for kiqr.json').start()
  if (hasConfig) {
    spinner.success({ text: 'Project config:', mark: chalk.green.bold('✓') })
    print(chalk.bold('apiVersion') + ': ' + config.get('apiVersion'))
    print(chalk.bold('projectId') + ': ' + config.get('projectId'))
    print(chalk.bold('Config file') + ': ' + filePath)
  } else {
    spinner.error({ text: `Couldn't find a KIQR config file in the current directory.`, mark: chalkStderr.red.bold('✗') })
    print(`Run ${chalk.bold('kiqr setup [PROJECT_ID]')} from your projects root directory to initialize a project.`)
    print(`If you don't have a project yet, open https://kiqr.cloud in a web browser and follow the instructions there.`)
    print(`Alternatively, you can run ${chalk.bold('kiqr projects')} from the command line to see a list of all your available PROJECT_IDs.`)
  }
}

const displayProjectConnectionStatus = async(options) => {
  // Skip if no config file is found.
  const { config, hasConfig } = await kiqrConfig();
  if (!hasConfig) { return }

  const spinner = createSpinner('Checking project status').start()
  try {
    const project = await request('/v1/projects/' + config.get('projectId'));
    spinner.success({ text: 'Connected to project. Everything\'s ok!', mark: chalkStderr.green.bold('✓') })
  } catch (error) {
    spinner.error({ text: 'Could not connect to project', mark: chalkStderr.red.bold('✗') })
    print(`Make sure that have an active internet connection and that you're logged in to a user that has access to this project.`)
  }
}

const infoCommand = async(options) => {
  await displayUserProfile();
  await displayProjectConfiguration();
  await displayProjectConnectionStatus();
}

export default infoCommand