import { input } from "@inquirer/prompts";
import fs from "node:fs";

import pkg from "~/../package.json";

import { appConfig } from "~/lib/utils";

export async function configCommand() {
  const config = fs.readFileSync(appConfig.configFile, "utf-8");

  if (!config) {
    console.log(`No config found. Please run \`${pkg.name} init\` first.`);
    return;
  }

  const configJson = JSON.parse(config);

  const fontSize = await input({
    message: "Font size:",
    default: configJson.fontSize,
  });

  const fontFamily = await input({
    message: "Font family:",
    default: configJson.fontFamily,
  });

  configJson.fontSize = fontSize;
  configJson.fontFamily = fontFamily;

  fs.writeFileSync(appConfig.configFile, JSON.stringify(configJson, null, 2));

  console.log(
    `Config updated successfully. Please run \`${pkg.name} generate\` to generate videos.`
  );
}
