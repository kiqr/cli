import inquirer from 'inquirer'
import chalk, { chalkStderr } from 'chalk'
import fetch from 'node-fetch'

import Configstore from 'configstore'
import { createSpinner } from 'nanospinner'

import print from '../lib/print.js'

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

const me = async(options) => {
  const spinner = createSpinner('Loading user profile').start()
  try {
    const user = await request('/v1/me');
    spinner.success({ text: 'Signed in user:', mark: chalkStderr.green.bold('✓') })
    print(chalk.bold(user.name) + ' (' + user.id + ')')
    print(user.email)
  } catch (error) {
    spinner.error({ text: error, mark: chalkStderr.red.bold('✗') })
  }
}

export default me