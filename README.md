## VidBro

Create short, vertical videos from a folder of images in seconds — with background music and centered overlay text — all from your terminal.

### Why VidBro?
- **Fast setup**: One command initializes a ready-to-use workspace in your home directory.
- **Simple workflow**: Drop images and music into folders, then generate.
- **Consistent output**: Images are auto-resized to 1080x1920, encoded with H.264, 30fps.
- **Portable**: Bundles FFmpeg via `@ffmpeg-installer/ffmpeg` — no system install required.

## Install

Use Bun (preferred):

```bash
bun add -g vidbro
```

Or run ad-hoc without installing globally:

```bash
bunx vidbro --help
```

## Quick Start

```bash
# 1) Initialize the workspace (~/.vidbro)
bunx vidbro init

# 2) Open the workspace folder in your file manager
bunx vidbro open

# 3) Add files
#   - Put input images into ~/.vidbro/images
#   - Put music files into ~/.vidbro/musics
#   - (Optional) cta assets into ~/.vidbro/cta (future)

# 4) Generate videos (guided prompts)
bunx vidbro generate
```

When generation finishes, your videos will be in `~/.vidbro/exports`.

## Commands

- **init**: Create the VidBro workspace and default config.
  ```bash
  bunx vidbro init
  ```

- **open**: Open the VidBro workspace in your OS file manager.
  ```bash
  bunx vidbro open
  ```

- **generate**: Interactive flow to build one or more videos.
  - Select a music file
  - Enter total video duration (seconds)
  - Enter slide count (number of images per video)
  - Provide overlay text for each video
  - Optionally delete used images after export
  ```bash
  bunx vidbro generate
  ```

- **config**: Update config values (currently `fontSize`).
  ```bash
  bunx vidbro config
  ```

## Workspace Layout

VidBro uses a folder in your home directory: `~/.vidbro`

```
~/.vidbro/
  config.json     # tool configuration
  images/         # drop input images here (any common format)
  musics/         # drop background music files here (e.g. .mp3, .wav)
  cta/            # reserved for future call-to-action features
  exports/        # generated .mp4 videos land here
```

## Configuration

Edit via `bunx vidbro config` or directly in `~/.vidbro/config.json`.

- **fontSize**: Number. Size of the centered overlay text (default: 20).

## How it works

- Images are resized with `sharp` to 1080x1920 (portrait) for consistent output.
- Videos are stitched with `fluent-ffmpeg` using H.264 (`libx264`), 30fps, yuv420p.
- Total duration is split evenly across slides: `duration / slideCount` per image.
- Overlay text is rendered centrally with a thin black border for readability.

## Tips

- Keep your `slideCount` reasonable for the total `duration` to avoid overly fast cuts.
- Provide high-resolution images for the best upscaling results.
- Use shorter, punchy overlay text; long text is automatically escaped and centered.

## Environment variables

- `FONTFILE`: Absolute path to a `.ttf` font to override the default font discovery.
  ```bash
  FONTFILE="/Library/Fonts/Arial.ttf" bunx vidbro generate
  ```
- `DEBUG=1`: Prints FFmpeg logs to stderr for troubleshooting.
  ```bash
  DEBUG=1 bunx vidbro generate
  ```

## Troubleshooting

- Nothing happens when opening the workspace: ensure your OS supports `open`/`xdg-open` (VidBro uses the default command per platform).
- Generation fails immediately: double-check that `~/.vidbro/images` and `~/.vidbro/musics` are not empty.
- Exported video has no text: leave the prompt non-empty; you can rerun `generate` to try again.

## Development

Build the CLI locally with Bun:

```bash
bun install
bun run build
```

Run the built binary:

```bash
bun run dist/index.js --help
```

---

Made with ❤️ by Ahmed (`ahm0xc`).


