#!/usr/bin/env node

import { Command } from 'commander'

import loginCommand from './commands/login.js'
import logoutCommand from './commands/logout.js'
import infoCommand from './commands/info.js'
import setupCommand from './commands/setup.js'

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

program.command('info')
  .description('Get current user and project configuration')
  .action(infoCommand)

program.command('setup')
  .description('Initialize KIQR in the current directory')
  .argument('<project_id>', 'Project ID')
  .action(setupCommand)


program.parse();