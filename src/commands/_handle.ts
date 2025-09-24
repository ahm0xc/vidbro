import type { Command } from "commander";

import pkg from "~/../package.json";

import { initCommand } from "./init";
import { openCommand } from "./open";
import { generateCommand } from "./generate";
import { configCommand } from "./config";

export default function handle(program: Command) {
  program.command("init").description(`init ${pkg.name}`).action(initCommand);
  program
    .command("open")
    .description(`open ${pkg.name} folder`)
    .action(openCommand);
  program
    .command("generate")
    .description(`generate videos`)
    .action(generateCommand);

  program
    .command("config")
    .description(`config ${pkg.name}`)
    .action(configCommand);
}
