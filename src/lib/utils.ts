import { exec } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import sharp from "sharp";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fluentffmpeg from "fluent-ffmpeg";

import pkg from "~/../package.json";

fluentffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const ffmpeg = fluentffmpeg;

export const homeDir = os.homedir();

const containerDir = path.join(homeDir, `.${pkg.name}`);

export const appConfig = {
  homeDir,
  containerDir,
  tempDir: os.tmpdir(),
  configFile: path.join(containerDir, "config.json"),
  imagesDir: path.join(containerDir, "images"),
  musicsDir: path.join(containerDir, "musics"),
  ctaDir: path.join(containerDir, "cta"),
  exportsDir: path.join(containerDir, "exports"),
};

/**
 * Opens a file or folder in the default system app.
 * Works on Windows, macOS, and Linux.
 *
 * @param targetPath - Absolute or relative path to the file/folder
 * @returns Promise<void>
 */
export function openPath(targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const resolvedPath = path.resolve(targetPath);

    let command: string;
    switch (process.platform) {
      case "win32": // Windows
        command = `start "" "${resolvedPath}"`;
        break;
      case "darwin": // macOS
        command = `open "${resolvedPath}"`;
        break;
      default: // Linux and others
        command = `xdg-open "${resolvedPath}"`;
        break;
    }

    exec(command, (err) => {
      if (err) {
        reject(new Error(`Failed to open ${resolvedPath}: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

export interface ResizeImageOptions {
  inputPath: string;
  outputPath?: string;
  width: number;
  height: number;
  fit?: "contain" | "cover";
  background?: { r: number; g: number; b: number; alpha: number };
}

export async function resizeImage({
  inputPath,
  outputPath,
  width,
  height,
  fit = "cover",
  background = { r: 0, g: 0, b: 0, alpha: 1 },
}: ResizeImageOptions): Promise<string> {
  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput =
    outputPath ?? path.join(process.cwd(), `resized_${width}x${height}.jpg`);

  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

  await sharp(resolvedInput)
    .resize(width, height, {
      fit, // keeps aspect ratio, adds padding if needed
      background, // black padding
    })
    .toFile(resolvedOutput);

  return resolvedOutput;
}

interface GenerateVideoOptions {
  imagesPaths: string[];
  outputPath: string;
  musicPath: string;
  duration: number;
  slideCount: number;
  text: string;
  fontSize?: number;
}

/**
 * Generate a video by stitching images together evenly with background music.
 */
export async function generateVideo({
  imagesPaths,
  musicPath,
  duration,
  slideCount,
  text,
  outputPath,
  fontSize,
}: GenerateVideoOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    if (imagesPaths.length < slideCount) {
      return reject(
        new Error("Not enough images provided for the requested slideCount")
      );
    }

    const selectedImages = imagesPaths.slice(0, slideCount);
    const slideDuration = duration / slideCount;

    // Make a temporary text file for ffmpeg concat
    const listFile = path.join(os.tmpdir(), "images.txt");
    const listContent = selectedImages
      .map(
        (img) =>
          `file '${path.resolve(img)}'\nduration ${slideDuration.toFixed(2)}`
      )
      .join("\n");
    fs.writeFileSync(listFile, listContent, "utf-8");

    const resolvedOutput = outputPath ?? path.join(process.cwd(), "output.mp4");

    const command = ffmpeg()
      .input(listFile)
      .inputOptions(["-f concat", "-safe 0"])
      .input(musicPath)
      .outputOptions([
        "-shortest",
        "-pix_fmt yuv420p",
        "-c:v libx264",
        "-r 30",
      ]);

    if (text && text.trim()) {
      const escapeForDrawtext = (s: string) =>
        s
          .replace(/\r?\n/g, " ")
          .replace(/\\/g, "\\\\")
          .replace(/:/g, "\\:")
          .replace(/'/g, "\\\\'");

      const candidateFonts: string[] =
        process.platform === "darwin"
          ? [
              "/System/Library/Fonts/Supplemental/Arial.ttf",
              "/Library/Fonts/Arial.ttf",
              "/System/Library/Fonts/Helvetica.ttc",
              "/System/Library/Fonts/SFNS.ttf",
            ]
          : process.platform === "win32"
          ? [
              "C:/Windows/Fonts/arial.ttf",
              "C:/Windows/Fonts/ARIAL.TTF",
              "C:/Windows/Fonts/segoeui.ttf",
            ]
          : [
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
            ];

      const overrideFont = process.env.FONTFILE;

      const fontfile = [overrideFont, ...candidateFonts].find((p) => {
        try {
          return !!p && fs.existsSync(p);
        } catch {
          return false;
        }
      });

      const drawtext =
        `drawtext=` +
        `text='${escapeForDrawtext(text.trim())}':` +
        (fontfile ? `fontfile='${fontfile.replace(/:/g, "\\:")}':` : "") +
        `fontsize=${fontSize ?? 20}:` +
        `fontcolor=white:` +
        `bordercolor=black:` +
        `borderw=2:` +
        `x=(w-text_w)/2:` +
        `y=(h-text_h)/2`;

      command.videoFilters(drawtext);
    }

    if (process.env.DEBUG === "1") {
      command.on("stderr", (line: string) => {
        try {
          console.error(line);
        } catch {}
      });
    }

    command
      .on("end", () => {
        fs.unlinkSync(listFile);
        resolve(resolvedOutput);
      })
      .on("error", (err) => {
        fs.unlinkSync(listFile);
        reject(err);
      })
      .save(resolvedOutput);
  });
}

interface ConcatWithCTAOptions {
  baseVideoPath: string;
  ctaPath: string;
  outputPath: string;
}

export async function concatVideoWithCTA({
  baseVideoPath,
  ctaPath,
  outputPath,
}: ConcatWithCTAOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(path.resolve(baseVideoPath))
      .input(path.resolve(ctaPath))
      .complexFilter(
        [
          "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v0]",
          "[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v1]",
          "[0:a]aformat=channel_layouts=stereo,aresample=async=1[a0]",
          "[1:a]aformat=channel_layouts=stereo,aresample=async=1[a1]",
          "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
        ],
        ["v", "a"]
      )
      .outputOptions([
        "-map [v]",
        "-map [a]",
        "-c:v libx264",
        "-c:a aac",
        "-pix_fmt yuv420p",
        "-r 30",
      ])
      .on("end", () => {
        resolve(path.resolve(outputPath));
      })
      .on("error", (err) => {
        reject(err);
      })
      .save(path.resolve(outputPath));
  });
}
