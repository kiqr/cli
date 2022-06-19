import { createSpinner } from 'nanospinner'
import chalk from 'chalk'
import fetch from 'node-fetch'
import _ from 'lodash'

import auth from '../lib/auth.js'

const requests = () => {
  const getAccessToken = async() => {
    const { token } = auth()
    return token?.access_token
  }

  const statusCodeToError = (errorCode) => {
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

  const get = async(endpoint, options = {}) => {
    options = _.defaults(options, {})

    const token = await getAccessToken()
    const spinner = createSpinner(`Connecting to ${chalk.bold("kiqr.cloud")}...`).start()

    try {
      const response = await fetch('http://localhost:3000' + endpoint, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      })
  
      if (response.ok) {
        spinner.success()
        return await response.json()
      } else {
        let error = statusCodeToError(response.status)
        error.response = await response.json()
        throw error
      }
    } catch (error) {
      spinner.error({ text: error })
      throw error
    }
  }

  return { get }
}

export default requests