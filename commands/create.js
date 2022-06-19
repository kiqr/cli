import _ from 'lodash'

import { request, kiqrConfig, print, printError } from '../lib/index.js'

// Command for creating a new content type.
const createCommand = async(content_type_slug, options) => {
  const { projectId } = await kiqrConfig();

  options = _.defaults(options, {
    "name": _.capitalize(_.startCase(content_type_slug)),
    "kind": "collection",
    "fields": {}
  })

  const body = { 'content_type': {
    'slug': content_type_slug,
    'name': options['name'],
    'kind': options['kind'],
    'fields': options['fields']
  } }

  try {
    const content_type = await request(`/v1/projects/${projectId}/content_types`, { body, method: 'POST' })
    print('success')
  } catch(error) {
    _.each(error?.response?.full_messages, (message) => {
      printError(message)
    })
  }
  
}

export default createCommand