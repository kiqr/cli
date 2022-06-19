import Configstore from 'configstore'

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

const auth = () => {
  const config = new Configstore('kiqr-cli')

  let token = config.get('token')
  let hasToken = (token ? true : false)

  const loginWithCredentials = async(credentials) => {
    try {
      const token = await auth0.passwordGrant({
        audience: 'https://management-api.kiqr.cloud/',
        username: credentials.username,
        password: credentials.password
      })
      
      config.set('token', token)
      return true
    } catch(error) {
      return false
    }
  }

  const logout = async() => {
    config.delete('token')
    return true
  }

  return { token, hasToken, config, loginWithCredentials, logout }
}

export default auth