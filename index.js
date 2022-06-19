#!/usr/bin/env node

import { Command } from 'commander'

// Import commands:
import me from './commands/me.js'
import login from './commands/login.js'
import logout from './commands/logout.js'

const program = new Command();

program
  .name('kiqr')
  .description('Command line tool for KIQR Headless CMS')
  .version('0.1.0');

  program
  .command('me')
  .description('Display current user information')
  .action(me)

  program
  .command('login')
  .description('Login to a kiqr.cloud user account.')
  .action(login)

  program
  .command('logout')
  .description('Logout from a kiqr.cloud user account.')
  .action(logout)

// program.command('me')
//   .description('Get information about the current signed in user.')
//   .action(meCommand)

// program.command('setup')
//   .description('Initialize a project locally')
//   .argument('project_id', 'The project ID')
//   .action(setupCommand)

//   program.command('create')
//   .description('Create a new content type')
//   .argument('slug', 'A url friendly id for the project. (Example: blog-posts)')
//   .option('-n, --name <name>', 'Human friendly name of the content type. (Example: "Blog Posts")')
//   .option('-k, --kind <kind>', 'What kind of content type. (Example: "collection")')
//   .option('-f, --fields <fields>', 'Quick add fields to your content type. (Example: "body:editor")")')
//   .action(createCommand)

program.parse();