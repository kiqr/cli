import chalk, { chalkStderr } from 'chalk'
import { createSpinner } from 'nanospinner'
import { kiqrConfig, print } from '../lib/index.js'

// Check project configuration.
const infoCommand = async(options) => {
  const { filePath, config, hasConfig } = await kiqrConfig();
  const spinner = createSpinner('Checking configuration status...').start()
  spinner.success({ text: `Configuration file found at: ${filePath}.`, mark: chalk.green.bold('✓') })
  print('Project configuration:')
  print(chalk.bold('Project ID') + ': ' + config.get('projectId'))
  print(chalk.bold('Api version') + ': ' + config.get('apiVersion'))
}

export default infoCommand