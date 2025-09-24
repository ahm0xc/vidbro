import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { input, select, confirm } from "@inquirer/prompts";
import yoctoSpinner from "yocto-spinner";
import pc from "picocolors";

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

  if (images.length === 0) {
    console.log("No images found. Please add images to the images directory.");
    return;
  }

  const musicSpinner = yoctoSpinner({
    text: "Getting musics...",
    color: "yellow",
  }).start();

  const musics = await getMusic();

  musicSpinner.success();
  musicSpinner.stop();

  if (musics.length === 0) {
    console.log("No musics found. Please add musics to the musics directory.");
    return;
  }

  const ctaSpinner = yoctoSpinner({
    text: "Getting CTAs...",
    color: "yellow",
  }).start();

  const ctas = await getCTAs();

  ctaSpinner.success();
  ctaSpinner.stop();

  if (ctas.length === 0) {
    console.log("No CTAs found. Please add CTAs to the CTAs directory.");
    return;
  }

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

  const selectedCTA = await select({
    message: "Select CTA:",
    choices: ctas.map((c) => ({
      name: c.name,
      value: c.path,
    })),
  });

  const extraImages = images.length % Number(slideCountInEachVideo);
  const imagesToUse = images.slice(0, images.length - extraImages);
  const totalVideos = imagesToUse.length / Number(slideCountInEachVideo);

  const textsOnVid = [];

  for (let i = 0; i < totalVideos; i += 1) {
    const textOnVid = await input({
      message: `Enter text on video ${i + 1}:`,
      required: true,
    });
    textsOnVid.push(textOnVid);
  }

  const generationSpinner = yoctoSpinner({
    text: `Generated 0/${totalVideos} videos`,
    color: "yellow",
  }).start();

  for (let i = 0; i < totalVideos; i += 1) {
    const imagesPaths = imagesToUse.slice(
      i * Number(slideCountInEachVideo),
      (i + 1) * Number(slideCountInEachVideo)
    );
    const slideshowPath = path.join(appConfig.tempDir, `${nanoid()}.mp4`);
    const outputPath = path.join(appConfig.exportsDir, `${nanoid()}.mp4`);

    generationSpinner.text = `Generated ${i + 1}/${totalVideos} videos`;
    await generateVideo({
      imagesPaths: imagesPaths.map((i) => i.path),
      musicPath: selectedMusic,
      duration: Number(videoDuration),
      slideCount: Number(slideCountInEachVideo),
      text: textsOnVid[i]!,
      outputPath: slideshowPath,
      fontSize: configJson.fontSize,
    });

    const { concatVideoWithCTA } = await import("~/lib/utils");
    await concatVideoWithCTA({
      baseVideoPath: slideshowPath,
      ctaPath: selectedCTA,
      outputPath,
    });

    try {
      fs.rmSync(slideshowPath);
    } catch {}
  }

  generationSpinner.success();

  generationSpinner.stop();

  console.log(pc.green("Videos generated successfully."));

  const wantToDeleteUsedImages = await confirm({
    message: pc.red("Do you want to delete used images?"),
    default: false,
  });

  if (wantToDeleteUsedImages) {
    const deleteUsedImagesSpinner = yoctoSpinner({
      text: "Deleting used images...",
      color: "red",
    }).start();
    for (const image of images) {
      fs.rmSync(image.path);
    }
    deleteUsedImagesSpinner.success();
    deleteUsedImagesSpinner.stop();
    console.log(pc.green("Used images deleted successfully."));
  } else {
    console.log(pc.green("Used images not deleted."));
  }
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

async function getCTAs() {
  const ctaPaths = fs.readdirSync(appConfig.ctaDir);

  return ctaPaths.map((p) => ({
    name: path.basename(p),
    path: path.join(appConfig.ctaDir, p),
  }));
}
