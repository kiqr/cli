import chalk, { chalkStderr } from 'chalk'
import print from '../print.js'

const loginInstructions = () => {
  print(`If your session has expired, run ${chalk.bold('kiqr login')} again to login using your kiqr.cloud credentials.`)
  print(`If you don\'t have an account, please sign up first at ${chalk.blue('https://kiqr.cloud')}`)
}

export default loginInstructions