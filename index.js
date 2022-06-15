#!/usr/bin/env node

import { Command } from 'commander'
import {
  loginCommand,
  logoutCommand,
  setupCommand,
  statusCommand,
  meCommand 
} from './commands/index.js'

const program = new Command();

program
  .name('kiqr')
  .description('Command line tool for KIQR Headless CMS')
  .version('0.1.0');

program.command('login')
  .description('Login to your user account')
  .action(loginCommand);

program.command('logout')
  .description('Logout from user account')
  .action(logoutCommand);

program.command('me')
  .description('Get current signed in user')
  .action(meCommand)

program.command('setup')
  .description('Initialize a project locally')
  .argument('project_id', 'The project ID')
  .action(setupCommand)

program.command('status')
  .description('Get current project status')
  .action(statusCommand)

program.parse();