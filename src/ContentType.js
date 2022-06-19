import _ from 'lodash'
import Ajv from "ajv"

import fs from "fs"
import path from "path"

import config from "../lib/config.js"
const { getBasePath } = config()

class ContentType {
  constructor(slug, data = {}) {
    this.slug = slug

    // The expected file path.
    this.filePath = path.join(getBasePath('content-types'), `${slug}.json`)
    
    // Make sure that "data" is valid when an instance is created.
    this.data = this.validatedData(data)

    // Make sure that "metadata" is valid when an instance is created.
    this.metaData = this.validatedMetadata(this.readMetaData())
  }

  validatedData(data) {
    const schemaPath = path.join(cliRootPath, "schemas", "content-type.json")
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"))
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    if (!validate(data)) {
      let error = new Error(validate.errors)
      error.messages = validate.errors
      throw error
    }

    return data
  }

  validatedMetadata(data) {
    const schemaPath = path.join(cliRootPath, "schemas", "content-type.meta.json")
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"))
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    if (!validate(data)) {
      return null
    }

    return data
  }

  readMetaData() {
    const filePath = path.join(getBasePath('content-types'), `${this.slug}.meta.json`)
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath))
    } else {
      return null
    }
  }

  toJson() {
    return JSON.stringify(this.data, null, 2)
  }

  toPayload() {
    return {
      "content_type": _.merge(this.data, { "slug": this.slug })
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, this.toJson(), 'utf8')
      return { "filePath": this.filePath, "contents": this.toJson() }
    } catch (error) {
      return false
    }
  }

  getField(field) {
    return this.data[field]
  }

  setMeta(metaData) {
    const filePath = path.join(getBasePath('content-types'), `${this.slug}.meta.json`)
    const contents = JSON.stringify(this.validatedMetadata(metaData), null, 2)
    fs.writeFileSync(filePath, contents, 'utf8')
    return { "filePath": filePath, "contents": contents }
  }

  static find(slug) {
    const filePath = path.join(getBasePath('content-types'), `${slug}.json`)
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
    return new this(slug, data)
  }

  static exist(slug) {
    const filePath = path.join(getBasePath('content-types'), `${slug}.json`)
    return fs.existsSync(filePath)
  }
}

export default ContentType