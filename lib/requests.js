import { createSpinner } from 'nanospinner'
import chalk from 'chalk'
import fetch from 'node-fetch'
import _ from 'lodash'

import auth from '../lib/auth.js'

const defaults = {
  "spinnerText": "Connecting to API"
}

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
      422: 'The resource failed the validation:',
      500: 'Internal server error'
    }
  
    const error = new Error(messages?.[errorCode] || messages[0])
    error.code = errorCode
    return error
  }

  const get = async(endpoint, options = {}) => {
    options = _.defaults(options, defaults)

    const token = await getAccessToken()
    const spinner = createSpinner(options.spinnerText).start()

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

  const patch = async(endpoint, body, options = {}) => {
    options = _.defaults(options, defaults)

    const token = await getAccessToken()
    const spinner = createSpinner(options.spinnerText).start()

    try {
      const response = await fetch('http://localhost:3000' + endpoint, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        method: "PATCH",
        body: JSON.stringify(body)
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

  const post = async(endpoint, body, options = {}) => {
    options = _.defaults(options, defaults)

    const token = await getAccessToken()
    const spinner = createSpinner(options.spinnerText).start()

    try {
      const response = await fetch('http://localhost:3000' + endpoint, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        method: "POST",
        body: JSON.stringify(body)
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

  return { get, patch, post }
}

export default requests