import fs from "fs"
import path from "path"
import nconf from 'nconf'
import Ajv from "ajv/dist/jtd.js"

function config() {
  const __dirname = path.resolve()
  const filename = "kiqr.json"
  const projectFilesPath = path.join(__dirname, 'kiqr')

  const createConfig = (project) => {
    const targetPath = path.join(__dirname, filename)    
    const config = {
      "_id": project.id,
      "name": project.name,
      "remote": {
        "origin": "https://management-api.kiqr.cloud/v1/",
        "updated_at": project.updated_at,
      }
    }

    if (validConfig(config)) {
      fs.writeFileSync(targetPath, JSON.stringify(config, null, 2))
      return targetPath
    } else {
      return false
    }
  }

  const validConfig = (object) => {
    const schemaPath = path.join(cliRootPath, "schemas", "kiqr.jtd.json")
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"))
    const ajv = new Ajv() 
    const validate = ajv.compile(schema)

    return validate(object)
  }

  const getFilePath = async () => {
    return new Promise((resolve, reject) => {
      let lastFound = null
      let lastScanned = __dirname

      if (fs.existsSync(path.join(__dirname, filename))) {
        lastFound = path.join(__dirname, filename)
      } else {
        __dirname.split("/").slice(1).reverse().forEach(dir => {
          const parentPath = path.resolve(lastScanned, "../")
          if (fs.existsSync(path.join(parentPath, filename))) {
            lastFound = path.join(parentPath, filename)
          }
          lastScanned = parentPath
        })
      }

      resolve(lastFound)
    })
  }

  const getProjectId = async () => {
    var filePath = await getFilePath();
    if (!filePath) { throw new Error("Project config can not be found.") }

    var config = nconf.file(filePath)
    return config.get("_id")
  }

  const getBasePath = (subDir = null) => {
    let absolutePath = path.join(projectFilesPath, subDir)
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }
    return absolutePath
  }

  return { createConfig, getFilePath, getProjectId, validConfig, getBasePath }
}

export default config