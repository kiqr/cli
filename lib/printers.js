import chalk, { chalkStderr } from 'chalk'

const printers = () => {
  const say = (message) => {
    console.log(message)
  }

  const success = (message) => {
    console.log(chalk.green.bold('✓'), message)
  }

  const error = (message) => {
    console.log(chalkStderr.red.bold('✗'), message)
  }

  return { say, success, error }
}

export default printers