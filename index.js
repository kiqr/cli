#!/usr/bin/dev node

import { Command } from 'commander'

import login from './commands/login.js'
import me from './commands/me.js'

const program = new Command();

program
  .name('kiqr')
  .description('Command line tool for KIQR Headless CMS')
  .version('0.1.0');

program.command('login')
  .description('Login to your user account')
  .action(login);

program.command('me')
  .description('View information about the current signed in user.')
  .action(me);

program.parse();