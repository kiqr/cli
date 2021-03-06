import fs from 'fs'
import path from 'path'
import nconf from 'nconf'

import printError from './printError.js'
import { setupInstructions } from './notifications/index.js'

function findConfigFile(filename) {
  const __dirname = path.resolve()

  return new Promise((resolve, reject) => {
    let lastFound = null;
    let lastScanned = __dirname;

    if (fs.existsSync(path.join(__dirname, filename))) {
      lastFound = path.join(__dirname, filename);
    } else {
      __dirname.split('/').slice(1).reverse().forEach(dir => {
        const parentPath = path.resolve(lastScanned, '../');
        if (fs.existsSync(path.join(parentPath, filename))) {
          lastFound = path.join(parentPath, filename);
        }
        lastScanned = parentPath;
      });
    }
    
    resolve(lastFound);
  });
}

const kiqrConfig = async (skipCheck = false) => {
  let filePath = await findConfigFile('kiqr.json');
  let config = null
  let projectId = null

  if (filePath) {
    config = nconf.file(filePath)
    projectId = config.get('projectId')
  } else if (!skipCheck) {
    printError('Could not find kiqr.json in the current project.')
    setupInstructions()
    process.exit()
  }

  const initialize = (project) => {
    filePath = path.join(process.cwd(), 'kiqr.json');
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    config = nconf.file(filePath)
    config.set('apiVersion', 'v1')
    config.set('projectId', project.id)
    config.save()

    return filePath
  }

  return { filePath, config, initialize, projectId}
}

export default kiqrConfig