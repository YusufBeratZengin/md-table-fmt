#!/usr/bin/env node

import { runCli } from '../src/cli.js';

const exitCode = await runCli(process.argv);
process.exit(exitCode);
