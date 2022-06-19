#!/usr/bin/env node

import { Command } from 'commander'
import {
  loginCommand,
  logoutCommand,
  setupCommand,
  infoCommand,
  createCommand,
  meCommand 
} from './commands/index.js'

const program = new Command();

program
  .name('kiqr')
  .description('Command line tool for KIQR Headless CMS')
  .version('0.1.0');

program.command('login')
  .description('Login to your user account.')
  .action(loginCommand);

program.command('logout')
  .description('Logout from user account.')
  .action(logoutCommand);

program.command('me')
  .description('Get information about the current signed in user.')
  .action(meCommand)

program.command('info')
  .description('Get current project information')
  .action(infoCommand)

program.command('setup')
  .description('Initialize a project locally')
  .argument('project_id', 'The project ID')
  .action(setupCommand)

  program.command('create')
  .description('Create a new content type')
  .argument('slug', 'A url friendly id for the project. (Example: blog-posts)')
  .option('-n, --name <name>', 'Human friendly name of the content type. (Example: "Blog Posts")')
  .option('-k, --kind <kind>', 'What kind of content type. (Example: "collection")')
  .option('-f, --fields <fields>', 'Quick add fields to your content type. (Example: "body:editor")")')
  .action(createCommand)

program.parse();