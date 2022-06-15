import chalk, { chalkStderr } from 'chalk'
import { createSpinner } from 'nanospinner'

import kiqrConfig from '../lib/kiqr-config.js'
import print from '../lib/print.js'

import request from '../lib/request.js'

const setupCommand = async(projectId) => {
  const { filePath, hasConfig, initialize } = await kiqrConfig();
  const prerequisiteSpinner = createSpinner('Searching for kiqr.json').start()

  if (hasConfig) {
    // Halt setup if a config file already exists.
    prerequisiteSpinner.error({ text: `A KIQR config file already exists in the current directory.`, mark: chalkStderr.red.bold('✗') })
    print('Please remove the existing config file before running this command.')
    print(chalk.bold('Found config: ') + filePath)
    return
  }

  prerequisiteSpinner.success({ text: `All checks ok.`, mark: chalkStderr.green.bold('✓') })
  const requestSpinner = createSpinner('Connecting to kiqr.cloud').start()

  try {
    const project = await request('/v1/projects/' + projectId);
    requestSpinner.success({ text: 'Your project was successfully setup!', mark: chalkStderr.green.bold('✓') })

    let newFilePath = initialize(project)
    print(`A configuration file was created at: ${newFilePath}`)
    print(`Run ${chalk.bold('kiqr info')} to view your projects configuration.`)
  } catch (error) {
    requestSpinner.error({ text: error, mark: chalkStderr.red.bold('✗') })
    print('Please check that the PROJECT_ID is correct and that you are connected to internet.')
  }
}

export default setupCommand