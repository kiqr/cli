import inquirer from 'inquirer';

import printers from '../lib/printers.js'
import auth from '../lib/auth.js'

const login = async() => {
  const { say, success, error } = printers()
  const { loginWithCredentials } = auth()

  say("Login with your kiqr.cloud credentials. If you don't have a KIQR account, head over to https://kiqr.cloud to create one.")
  const credentials = await inquirer.prompt([
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

  if (await loginWithCredentials(credentials)) {
    success("You successfully logged in!")
  } else {
    error("Invalid username or password.")
  }

}

export default login