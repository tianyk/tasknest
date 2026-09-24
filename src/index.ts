#!/usr/bin/env bun
import { main } from './cli/main';

process.exitCode = main(Bun.argv.slice(2));
