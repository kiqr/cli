import fs from 'fs'
import path from 'path'

import chalk, { chalkStderr } from 'chalk';
import { createSpinner } from 'nanospinner'

import print from './print.js'

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
  const spinner = createSpinner('Searching for kiqr.json').start()
  const filePath = await findConfigFile('kiqr.json');

  let foundConfig = false
  let config = {}

  if (filePath) {
    spinner.success({ text: `${chalk.bold('Found config file:')} ` + filePath, mark: chalk.green.bold('✓') })
    config = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    foundConfig = true
  } else {
    spinner.error({ text: `Couldn't find a KIQR config file in the current directory.`, mark: chalkStderr.red.bold('✗') })
    print(`Run ${chalk.bold('kiqr setup [PROJECT_ID]')} from your projects root directory to initialize a project.`)
    print(`If you don't have a project yet, open https://kiqr.cloud in a web browser and follow the instructions there.`)
    print(`Alternatively, you can run ${chalk.bold('kiqr projects')} from the command line to see a list of all your available PROJECT_IDs.`)
  }

  return { filePath, config, foundConfig }
}

export default kiqrConfig