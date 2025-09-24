// !/usr/bin/env node

import { program } from "commander";

import pkg from "../package.json";
import handle from "./commands/_handle";

program.name(pkg.name).description(pkg.description).version(pkg.version);

handle(program);

program.parse(process.argv);
