import _ from 'lodash'
import fs from 'fs'

import { request, kiqrConfig, print, printError } from '../lib/index.js'

import path from 'path'

function findJsonConfigFiles(targetDirectory) {
  const dir = fs.opendirSync(targetDirectory)
  let dirent
  let files = []
  while ((dirent = dir.readSync()) !== null) {
    files.push(targetDirectory + '/' + dirent.name)
  }
  dir.closeSync()

  return files
}

const contentTypeFileManager = async() => {
  const contentTypeDirectory = path.resolve() + '/kiqr/content-types'
  const contentTypeFilePaths = findJsonConfigFiles(contentTypeDirectory)

  function findBySlug(slug) {
    let filePath = contentTypeDirectory + '/' + slug + '.json'
    
    if (contentTypeFilePaths[_.indexOf(contentTypeFilePaths, filePath)] === undefined) {
      return false
    }

    let content = JSON.parse(fs.readFileSync(filePath))
    return { content, filePath }
  }

  return { contentTypeFilePaths, findBySlug }
}

// Command for creating a new content type.
const createCommand = async(content_type_slug, options) => {
  const { projectId } = await kiqrConfig();
  const { contentTypeFilePaths, findBySlug } = await contentTypeFileManager()

  options = _.defaults(options, {
    "name": _.capitalize(_.startCase(content_type_slug)),
    "kind": "collection",
    "fields": {}
  })

  const { content: contentType, filePath: contentTypeFilePath } = findBySlug(content_type_slug)
  if (contentType) {
    print("The content type exists already. Edit it with your favorite code editor and upload your changes with the command: kiqr push")
    return
  }

  const body = { 'content_type': {
    'slug': content_type_slug,
    'name': options['name'],
    'kind': options['kind'],
    'fields': options['fields']
  } }

  try {
    const content_type = await request(`/v1/projects/${projectId}/content_types`, { body, method: 'POST' })
    print(content_type)
  } catch(error) {
    _.each(error?.response?.full_messages, (message) => {
      printError(message)
    })
  }
  
}

export default createCommand