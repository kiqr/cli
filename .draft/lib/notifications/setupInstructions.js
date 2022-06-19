import chalk, { chalkStderr } from 'chalk'
import print from '../print.js'

const setupInstructions = () => {
  print(`Start by creating a project at ${chalk.blue('https://kiqr.cloud')} and make sure you have the ${chalk.bold('PROJECT_ID')} in hand.`)
  print(`You can then initialize the project locally by running: ${chalk.bold('kiqr setup [project_id]')}.`)
  print('We recommend installing KIQR at the root of your frontend repository.')
}

export default setupInstructions