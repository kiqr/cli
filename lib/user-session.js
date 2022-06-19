import Configstore from 'configstore'
import inquirer from 'inquirer';

// Define 'require'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const AuthenticationClient = require('auth0').AuthenticationClient;
const auth0 = new AuthenticationClient({
  clientId: 'Dc3Y13bLmaWIBEdVPo4p49TD7SkUriUc',
  domain: 'kiqr.eu.auth0.com',
  audience: 'https://management-api.kiqr.cloud/',
  scope: 'offline_access'
})

const userSession = () => {
  const config = new Configstore('kiqr-cli')

  let current = config.get('userSession')
  let isLoggedIn = (current ? true : false)

  const loginWithCredentials = async(credentials) => {
    try {
      const token = await auth0.passwordGrant({
        audience: 'https://management-api.kiqr.cloud/',
        username: credentials.username,
        password: credentials.password
      })
      
      config.set('userSession', { 'username': credentials.username, "token": token })
      return true
    } catch(error) {
      return false
    }
  }

  const logout = async() => {
    config.delete('userSession')
    return true
  }

  const collectCredentialsForm = async() => {
    return await inquirer.prompt([
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
  }

  return { current, isLoggedIn, config, collectCredentialsForm, loginWithCredentials, logout }
}

export default userSession