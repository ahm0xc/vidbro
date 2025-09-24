import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { input, select } from "@inquirer/prompts";
import yoctoSpinner from "yocto-spinner";

import pkg from "~/../package.json";

import { appConfig, generateVideo, resizeImage } from "~/lib/utils";

export async function generateCommand() {
  const config = fs.readFileSync(appConfig.configFile, "utf-8");
  if (!config) {
    console.log(`No config found. Please run \`${pkg.name} init\` first.`);
    return;
  }

  const configJson = JSON.parse(config);

  const imageSpinner = yoctoSpinner({
    text: "Getting images...",
    color: "yellow",
  }).start();
  const images = await getImages();
  imageSpinner.success();
  imageSpinner.stop();

  const musicSpinner = yoctoSpinner({
    text: "Getting musics...",
    color: "yellow",
  }).start();
  const musics = await getMusic();
  musicSpinner.success();
  musicSpinner.stop();

  const videoDuration = await input({
    message: "Video duration (in seconds):",
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) && num > 0;
    },
    required: true,
    default: "10",
  });

  const slideCountInEachVideo = await input({
    message: "Slide count in each video:",
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) && num > 0;
    },
    required: true,
    default: "20",
  });

  const selectedMusic = await select({
    message: "Select music:",
    choices: musics.map((m) => ({
      name: m.name,
      value: m.path,
    })),
    pageSize: 10,
  });

  const selectedText = await input({
    message: "Enter text:",
    required: true,
  });

  // TODO: add cta feature

  const extraImages = images.length % Number(slideCountInEachVideo);
  const imagesToUse = images.slice(0, images.length - extraImages);
  const totalVideos = imagesToUse.length / Number(slideCountInEachVideo);

  const generationSpinner = yoctoSpinner({
    text: `Generated 0/${totalVideos} videos`,
    color: "yellow",
  }).start();

  for (let i = 0; i < totalVideos; i += 1) {
    const imagesPaths = imagesToUse.slice(
      i * Number(slideCountInEachVideo),
      (i + 1) * Number(slideCountInEachVideo)
    );
    const outputPath = path.join(appConfig.exportsDir, `${nanoid()}.mp4`);
    generationSpinner.text = `Generated ${i + 1}/${totalVideos} videos`;
    await generateVideo({
      imagesPaths: imagesPaths.map((i) => i.path),
      musicPath: selectedMusic,
      duration: Number(videoDuration),
      slideCount: Number(slideCountInEachVideo),
      text: selectedText,
      outputPath,
      fontSize: configJson.fontSize,
    });
  }

  generationSpinner.success();

  generationSpinner.stop();
}

async function getImages() {
  const unsafeImagePaths = fs.readdirSync(appConfig.imagesDir);

  const safeImagePaths = [];

  for (const unsafeImagePath of unsafeImagePaths) {
    const outputPath = path.join(appConfig.tempDir, `${nanoid()}.png`);
    try {
      await resizeImage({
        inputPath: path.join(appConfig.imagesDir, unsafeImagePath),
        outputPath,
        width: 1080,
        height: 1920,
      });
      safeImagePaths.push(outputPath);
    } catch (error) {
      // TODO: add colors
      console.info(`Error resizing image ${unsafeImagePath}: ${error}`);
      continue;
    }
  }

  return safeImagePaths.map((p) => ({
    name: path.basename(p),
    path: p,
  }));
}

async function getMusic() {
  const musicPaths = fs.readdirSync(appConfig.musicsDir);

  return musicPaths.map((p) => ({
    name: path.basename(p),
    path: path.join(appConfig.musicsDir, p),
  }));
}
