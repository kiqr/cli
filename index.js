#!/usr/bin/env node

import { Command } from 'commander'
import { fileURLToPath } from 'url'
import path from 'path'

// Import commands
import create from './commands/create.js'
import login from './commands/login.js'
import logout from './commands/logout.js'
import me from './commands/me.js'
import setup from './commands/setup.js'
import push from './commands/push.js'

// Setup global variable with root path.
global.cliRootPath = path.dirname(fileURLToPath(import.meta.url));

const program = new Command();

program
  .name('kiqr')
  .description('Command line tool for KIQR Headless CMS')
  .version('0.1.0');

  program
  .command('create')
  .description('Create a content type')
  .argument('slug', 'A url friendly id for the project. (Example: "posts")')
  .option('-n, --name <name>', 'Human friendly name of the content type. (Example: "Posts")')
  .option('-k, --kind <kind>', 'What kind of content type. (Default: "collection")')
  .option('-f, --fields <fields>', 'Quick add fields to your content type. (Example: "body:editor")")')
  .action(create)

  program
  .command('login')
  .description('Login to a kiqr.cloud user account.')
  .action(login)

  program
  .command('logout')
  .description('Logout from a kiqr.cloud user account.')
  .action(logout)

  program
  .command('me')
  .description('Display current user information')
  .action(me)

  program
  .command('push')
  .description('Publish a specific content type')
  .argument('[content_type]')
  .action(push)

  program
  .command('setup')
  .description('Initialize a project in your local environment.')
  .argument('<project_id>')
  .action(setup)

program.parse()