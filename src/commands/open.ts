import path from "node:path";
import os from "node:os";

import pkg from "~/../package.json";
import { openPath } from "~/lib/utils";

export async function openCommand() {
  const containerDir = path.join(os.homedir(), `.${pkg.name}`);

  openPath(containerDir);
}
