import chalk, { chalkStderr } from 'chalk'

const print = (message) => {
  console.log(chalk.bold('|'), message)
}

export default print