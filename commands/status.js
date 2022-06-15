import chalk, { chalkStderr } from 'chalk'
import { createSpinner } from 'nanospinner'
import { kiqrConfig, request } from '../lib/index.js'
import { loginInstructions, setupInstructions } from '../lib/notifications/index.js'

// Check if user is logged in.
const checkAuthenticationStatus = async() => {
  const spinner = createSpinner('Checking authentication status...').start()
  try {
    const user = await request('/v1/me');
    spinner.success({ text: `You are signed in as ${user.name}.`, mark: chalk.green.bold('✓') })
  } catch (error) {
    spinner.error({ text: error, mark: chalkStderr.red.bold('✗') })
    loginInstructions()
  }
}

// Check project configuration.
const checkProjectConfiguration = async() => {
  const { filePath, hasConfig } = await kiqrConfig();
  const spinner = createSpinner('Checking configuration status...').start()

  if (hasConfig) {
    spinner.success({ text: `Configuration file found at: ${filePath}.`, mark: chalk.green.bold('✓') })
  } else {
    spinner.error({ text: 'Missing configuration file: kiqr.json', mark: chalkStderr.red.bold('✗') })
    setupInstructions()
  }
}

// Check if the current user has access to the project.
const checkProjectConnection = async(options) => {
  const { config, hasConfig } = await kiqrConfig();
  if (!hasConfig) { return }

  const spinner = createSpinner('Checking project status').start()
  try {
    const project = await request('/v1/projects/' + config.get('projectId'));
    spinner.success({ text: `Connected to project: ${chalk.bold(project.name)}. Everything\'s ok!`, mark: chalkStderr.green.bold('✓') })
  } catch (error) {
    spinner.error({ text: 'Could not connect to project. Make sure that have an active internet connection and that you are logged in to a user that has access to this project.', mark: chalkStderr.red.bold('✗') })
  }
}

const statusCommand = async(options) => {
  await checkAuthenticationStatus()
  await checkProjectConfiguration()
  await checkProjectConnection()
}

export default statusCommand