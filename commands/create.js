import _ from 'lodash'

import config from '../lib/config.js'
import printers from '../lib/printers.js'

async function create(slug, options) {
  const { say, error: errorSay, success: successSay } = printers()
  const { getProjectId } = config()
  const projectId = await getProjectId()

  options = _.defaults(options, {
    "name": _.capitalize(_.startCase(slug)),
    "kind": "collection",
    "fields": {}
  })

  console.log("Project ID", projectId)
  console.log("Options", options)
}

export default create