import _ from 'lodash'
import ContentType from '../src/ContentType.js'
import config from '../lib/config.js'
import printers from '../lib/printers.js'
import requests from '../lib/requests.js'

const { post, patch } = requests()
const { say, error: errorSay, bold } = printers()
const { getProjectId } = config()

const pushContentType = async(projectId, slug) => {
  // Stop if there's a local version of the content type.
  if (!ContentType.exist(slug)) {
    errorSay(`The content type ${bold(slug)} does not exist.`)
    errorSay(`Run ${bold("kiqr edit --help")} for more info on how to edit a content type.`)
    process.exit()
  }

  const contentType = ContentType.find(slug)
  say(`Local source: ${contentType.filePath}`)

  try {
    if (contentType.metaData) {
      const options = { "spinnerText": `Pushing changes for ${bold(slug)} to server.`}
      const response = await patch(`/v1/projects/${projectId}/content_types/${contentType?.metaData?.id}`, contentType.toPayload(), options)
      contentType.setMeta({ "id": response.id, "version": response.updated_at })
    } else {
      const options = { "spinnerText": `Publishing content type: ${bold(slug)}`}
      const response = await post(`/v1/projects/${projectId}/content_types`, contentType.toPayload(), options)
      contentType.setMeta({ "id": response.id, "version": response.updated_at })    
    }
  } catch (error) {
    if (error.code == 422) {
      _.each(error?.response?.full_messages, (validationError) => {
        errorSay(validationError)
      })
    } else {
      throw error
    }
  }
}

const push = async(slug, options) => {
  if (slug === undefined) {
    errorSay("Please specify a content type. For example: " + bold("kiqr push posts"))
    return
  }

  // Load project ID
  const projectId = await getProjectId()
  say(`Project ID: ${bold(projectId)}`)

  pushContentType(projectId, slug)
}

export default push