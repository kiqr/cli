import printers from '../lib/printers.js'
import auth from '../lib/auth.js'

const logout = async() => {
  const { success, error } = printers()
  const { hasToken, logout } = auth()

  if (hasToken) {
    logout();
    success("Successfully logged out!")
  } else {
    error("You are already logged out.")
  }
}

export default logout