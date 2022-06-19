import chalk from 'chalk';
import Configstore from 'configstore';

import { createSpinner } from 'nanospinner'

import print from '../lib/print.js'

const logoutCommand = async(options) => {
  const conf = new Configstore('kiqr-cli');

  if (conf.get('token')) {
    const spinner = createSpinner('Removing token file..').start()
    conf.delete('token')
    spinner.success({ text: 'Successfully logged out!', mark: chalk.green.bold('✓') })
  } else {
    print(`You are already logged out.`)
  }
}

export default logoutCommand