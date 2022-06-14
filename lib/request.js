import fetch from 'node-fetch'
import Configstore from 'configstore'

const request = async (path) => {
  const conf = new Configstore('kiqr-cli')
  const token = conf.get('token')
  const response = await fetch('https://management-api-europe-west-1-ylpzkp5j6a-ew.a.run.app' + path, {
    headers: { 'Authorization': 'Bearer ' + token }
  })

  if (!response.ok) {
    let error = new Error('An error occurred while fetching the data.')

    if (response.status === 401) {
      error = new Error('Invalid or expired access token.')
    }

    if (response.status === 403) {
      error = new Error('You are not authorized to access this resource.')
    }
    
    error.status = response.status
    throw error
  }

  return response.json()
}

export default request