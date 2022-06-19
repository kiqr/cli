import { chalkStderr } from 'chalk'

const printError = (message) => {
  console.log(chalkStderr.red.bold('✗'), message)
}

export default printError