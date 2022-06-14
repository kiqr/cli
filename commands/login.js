import inquirer from 'inquirer';
import chalk, { chalkStderr } from 'chalk';
import Configstore from 'configstore';

import { createRequire } from 'module';
import { createSpinner } from 'nanospinner'

import print from '../lib/print.js'

// Define 'require'
const require = createRequire(import.meta.url);

var AuthenticationClient = require('auth0').AuthenticationClient;

var auth0 = new AuthenticationClient({
  clientId: 'Dc3Y13bLmaWIBEdVPo4p49TD7SkUriUc',
  domain: 'kiqr.eu.auth0.com',
  audience: 'https://management-api.kiqr.cloud/',
  scope: 'offline_access'
})

const loginCommand = async(options) => {
  const conf = new Configstore('kiqr-cli');

  print(`If you don\'t have an account, please sign up first at ${chalk.blue('https://kiqr.cloud')}`)
  print(`Enter your ${chalk.bold('kiqr.cloud')} credentials to login:`)

  var credentials = await inquirer.prompt([
    {
      name: 'username',
      message: 'Username (email):',
      validate: function( value ) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter your username or e-mail address.';
        }
      }
    },
    {
      name: 'password',
      message: 'Password:',
      type: 'password',
      mask: '*',
      validate: function(value) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter your password.';
        }
      }
    },
  ])

  const spinner = createSpinner('Signing in...').start()
  auth0.passwordGrant(
    {
      audience: 'https://management-api.kiqr.cloud/',
      username: credentials.username,
      password: credentials.password
    },
    function (error, token) {
      if (error) {
        spinner.error({ text: 'Invalid email and/or password', mark: chalkStderr.red.bold('✗') })
        return
      }

      // Successfully logged in.
      spinner.success({ text: 'Successfully logged in!', mark: chalk.green.bold('✓') })
      print(`You can confirm that you're logged in to ${chalk.bold('kiqr.cloud')} by running the command ${chalk.bold('kiqr info')} in the console.`)
      conf.set('token', token.access_token)
    }
  );
}

export default loginCommand