import chalk from 'chalk'
import printers from '../lib/printers.js'
import requests from '../lib/requests.js'
import config from '../lib/config.js'

const setup = async(project_id) => {
  const { say, error: errorSay, success: successSay } = printers()
  const { getFilePath, createConfig } = config()
  const { get } = requests()
  const filePath = await getFilePath()

  if (filePath) {
    errorSay("Oops! You can't setup a new project here. A kiqr.json file exist at:")
    say(filePath)
    return
  }

  try {
    const project = await get('/v1/projects/' + project_id + '/setup');
    const newFilePath = createConfig(project)

    if (newFilePath) {
      say(`Your project "${project.name}" was ${chalk.bold("successfully")} initialized at:`)
      say(newFilePath)
    } else {
      errorSay("Could not initialize the project right now. Please try again later.")
    }

  } catch (error) {
   if (error.code == 404) { errorSay("Please check that the PROJECT_ID is correct.") }
   else throw error
  }
}

export default setup