import fs from 'fs'
import path from 'path'
import nconf from 'nconf'

function config() {
  const __dirname = path.resolve()
  const filename = "kiqr.json"

  const createConfig = (project) => {
    const filePath = path.join(__dirname, filename)
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2))
    config = nconf.file(filePath)
    config.set('apiVersion', 'v1')
    config.set('projectId', project.id)
    config.save()
    return filePath
  }

  const getFilePath = async () => {
    return new Promise((resolve, reject) => {
      let lastFound = null
      let lastScanned = __dirname

      if (fs.existsSync(path.join(__dirname, filename))) {
        lastFound = path.join(__dirname, filename)
      } else {
        __dirname.split('/').slice(1).reverse().forEach(dir => {
          const parentPath = path.resolve(lastScanned, '../')
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
    if (filePath) {
      var config = nconf.file(filePath)
      return config.get('projectId')
    }
    return null
  }

  return { createConfig, getFilePath, getProjectId }
}

export default config