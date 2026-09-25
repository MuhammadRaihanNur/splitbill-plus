import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, join } from "node:path";

const root = process.cwd();
const runtime = join(root, "public/ocr/runtime");
const assets = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  [
    "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    "lang/eng.traineddata.gz",
  ],
  [
    "node_modules/@tesseract.js-data/ind/4.0.0_best_int/ind.traineddata.gz",
    "lang/ind.traineddata.gz",
  ],
];

async function requireFile(relativePath) {
  const absolutePath = join(root, relativePath);
  try {
    if (!(await stat(absolutePath)).isFile()) throw new Error("not a file");
  } catch (error) {
    throw new Error(`OCR_ASSET_SOURCE_MISSING: ${relativePath}`, {
      cause: error,
    });
  }
  return absolutePath;
}

await rm(runtime, { recursive: true, force: true });
await mkdir(join(runtime, "lang"), { recursive: true });
await mkdir(join(runtime, "core"), { recursive: true });

for (const [source, destination] of assets) {
  await cp(await requireFile(source), join(runtime, destination));
}

const coreDirectory = join(root, "node_modules/tesseract.js-core");
const coreFiles = (await readdir(coreDirectory)).filter((name) =>
  /^tesseract-core.*\.(?:js|wasm|wasm\.js)$/.test(name),
);
if (coreFiles.length === 0) {
  throw new Error(
    "OCR_ASSET_SOURCE_MISSING: node_modules/tesseract.js-core/tesseract-core*",
  );
}
for (const file of coreFiles) {
  await cp(
    await requireFile(join("node_modules/tesseract.js-core", file)),
    join(runtime, "core", basename(file)),
  );
}

console.log(
  `OCR runtime synchronized: ${assets.length + coreFiles.length} files`,
);
