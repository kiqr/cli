import fs from 'fs'
import path from 'path'
import nconf from 'nconf'

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

const kiqrConfig = async () => {
  let filePath = await findConfigFile('kiqr.json');
  let hasConfig = false
  let config = null

  if (filePath) {
    hasConfig = true
    config = nconf.file(filePath)
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

  return { filePath, hasConfig, config, initialize }
}

export default kiqrConfig