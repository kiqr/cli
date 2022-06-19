import printers from '../lib/printers.js'
import userSession from '../lib/user-session.js'

const login = async() => {
  const { say, success, error } = printers()
  const { collectCredentialsForm, loginWithCredentials, config } = userSession()

  say("Login with your kiqr.cloud credentials. If you don't have a KIQR account, head over to https://kiqr.cloud to create one.")
  const credentials = await collectCredentialsForm()

  if (await loginWithCredentials(credentials)) {
    success("You successfully logged in!")
  } else {
    error("Invalid username or password.")
  }

}

export default login