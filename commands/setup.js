import chalk, { chalkStderr } from 'chalk'
import { createSpinner } from 'nanospinner'
import { kiqrConfig, print, request } from '../lib/index.js'

const setupCommand = async(project_id) => {
  const { filePath, hasConfig, initialize } = await kiqrConfig();

  if (hasConfig) {
    // Halt setup if a config file already exists.
    console.log(chalkStderr.red.bold('✗') + ' A KIQR config file already exists in the current directory.')
    print('Configuration file: ' + filePath)
    print('Please remove the existing config file before running this command.')
    return
  }

  const spinner = createSpinner('Connecting to kiqr.cloud').start()

  try {
    const project = await request('/v1/projects/' + project_id);
    spinner.success({ text: 'Your project was successfully setup!', mark: chalkStderr.green.bold('✓') })

    let newFilePath = initialize(project)
    print(`A configuration file was created at: ${newFilePath}`)
    print(`You can check your project configuration at any time by running ${chalk.bold('kiqr status')}:`)
  } catch (error) {
    spinner.error({ text: error, mark: chalkStderr.red.bold('✗') })
    print('Please check that the PROJECT_ID is correct and that you are connected to internet.')
  }
}

export default setupCommand