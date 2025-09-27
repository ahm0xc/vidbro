import fs from "node:fs";
import path from "node:path";

import pkg from "~/../package.json";
import { appConfig } from "~/lib/utils";

const DEFAULT_CONFIG = {
  fontSize: 20,
  fontFamily: "Arial",
  width: 1080,
  height: 1920,
  fit: "cover",
};

export async function initCommand() {
  if (fs.existsSync(appConfig.configFile)) {
    console.log(
      `${pkg.name} is already initialized. Use '${pkg.name} config' to configure ${pkg.name}.`
    );
    return;
  }

  if (!fs.existsSync(appConfig.containerDir)) {
    fs.mkdirSync(appConfig.containerDir, { recursive: true });
  }

  if (!fs.existsSync(appConfig.configFile)) {
    fs.writeFileSync(
      appConfig.configFile,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
  }

  const folders = [
    appConfig.imagesDir,
    appConfig.musicsDir,
    appConfig.ctaDir,
    appConfig.exportsDir,
  ];

  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }

  fs.writeFileSync(path.join(appConfig.containerDir, "help.txt"), helpTxt);
}

export const helpTxt = `
${pkg.name} is a CLI tool for creating videos.

Usage:
Put images in ${appConfig.imagesDir}
Put musics in ${appConfig.musicsDir}
Put cta in ${appConfig.ctaDir}

Run '${pkg.name} open' to open the ${pkg.name} folder.
Run '${pkg.name} help' to show the help.

Run '${pkg.name} create' to create new videos.
it will use the images, musics and cta in the ${pkg.name} folder.
Put exports in ${appConfig.exportsDir}
`;
