import _ from "lodash"

import printers from "../lib/printers.js"
import ContentType from "../src/ContentType.js"

const { say, success: successSay, error: errorSay, bold } = printers()

function create(slug, options) {
  options = _.defaults(options, {
    "name": _.capitalize(_.startCase(slug)),
    "kind": "collection",
    "fields": ""
  })

  // Check if there's a local version of the content type.
  if (ContentType.exist(slug)) {
    errorSay(`The content type ${bold(slug)} exist already.`)
    errorSay(`Run ${bold("kiqr edit --help")} for more info on how to edit a content type.`)
    process.exit()
  }

  try {
    let schema = {}
    _.each(options.fields.split(' '), (field) => {
      const [name, type] = field.split(":")
      schema[name] = { "type": (type || "string") }
    })
  
    const data = {
      "name": options.name,
      "kind": options.kind,
      "schema": schema
    }

    const contentType = new ContentType(slug, data)
    const result = contentType.save()
    if (result === false) {
      errorSay("Could not create content type.")
      process.exit()
    }

    successSay(`The content type ${bold(slug)} was created at: ` + result.filePath)
    say(`Run the command ${bold("kiqr push posts")} to publish your changes.`)

  } catch (error) {
    if (error.messages) {
      _.each(error.messages, (error) => {
        if (error.keyword === "discriminator") {
          errorSay(`Invalid value: ${bold(error.params.tagValue)} (path: ${error.instancePath})`)
        } else {
          errorSay(error.message)
        }
      })
    } else {
      errorSay(error)
    }
  }
}

export default create