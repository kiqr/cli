import chalk, { chalkStderr } from 'chalk'

const printers = () => {
  const bold = chalk.bold

  const success = (message) => {
    console.log(chalk.green.bold('✓'), message)
  }

  const error = (message) => {
    console.error(chalkStderr.red.bold('✗'), message)
  }

  const say = (message) => {
    console.log(chalk.bold("➺"), message)
  }

  return { say, success, error, bold }
}

export default printers