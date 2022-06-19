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
    console.log("|", message)
  }

  const br = () => {
    console.log("|")
  }

  return { say, success, error, br, bold }
}

export default printers