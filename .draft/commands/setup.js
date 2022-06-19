import chalk, { chalkStderr } from 'chalk'
import { kiqrConfig, print, printError, request } from '../lib/index.js'

const handleConfigExistsError = (filePath) => {
  printError('A KIQR config file already exists in the current directory.')
  print('Configuration file: ' + filePath)
  print('Please remove the existing config file before running this command.')
  process.exit()
}

const setupCommand = async(project_id) => {
  const { filePath, initialize } = await kiqrConfig({ 'skipCheck': true });
  if (filePath) { handleConfigExistsError(filePath) }

  try {
    const project = await request('/v1/projects/' + project_id + '/setup');
    let newFilePath = initialize(project)
  
    print('Your project was successfully initialized!')
    print(`A configuration file was created at: ${newFilePath}`)
    print(`You can check your project configuration at any time by running ${chalk.bold('kiqr info')}.`)
  } catch (error) {
    if (error.code == 404) { printError('Please check that the PROJECT_ID is correct and that you are connected to internet.') }
  }
  
}

export default setupCommand