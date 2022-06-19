import printers from '../lib/printers.js'
import userSession from '../lib/user-session.js'

const logout = async() => {
  const { success, error } = printers()
  const { isLoggedIn, logout } = userSession()

  if (isLoggedIn) {
    logout();
    success("Successfully logged out!")
  } else {
    error("You are already logged out.")
  }
}

export default logout