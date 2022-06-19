import fetch from 'node-fetch'
import Configstore from 'configstore'
import { createSpinner } from 'nanospinner'
import _ from 'lodash'

const statusCodeToError = async(errorCode) => {
  const messages = {
    0: 'An unknown error occurred while fetching the data.',
    401: 'No user is signed in. (Invalid or expired access token).',
    403: 'You are not authorized to access this resource.',
    404: 'Resource could not be found on server.',
    422: 'Resource validation error.'
  }

  const error = new Error(messages?.[errorCode] || messages[0])
  error.code = errorCode
  return error
}

const request = async (path, options) => {
  const spinner = createSpinner('Connecting to API...').start()

  options = _.defaults(options, {
    method: 'GET',
    body: {},
    customErrors: {} 
  })

  try {
    const conf = new Configstore('kiqr-cli')
    const token = conf.get('token')
    const response = await fetch('http://localhost:3000' + path, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      method: options['method'],
      body: (options['method'] === 'GET' ? null : JSON.stringify(options['body']))
    })

    if (response.ok) {
      spinner.success({ text: 'Connection established..' })
      return await response.json()
    } else {
      let error = await statusCodeToError(response.status)
      error.response = await response.json()
      throw error
    }
  } catch (error) {
    spinner.error({ text: error })
    throw error
  }
}

export default request