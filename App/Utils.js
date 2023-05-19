import fs from "fs";
import path from "path";
import spawn from "child_process";
import crypto from "crypto";
import { fileURLToPath } from 'url';
import {
  writeConfig,
  getConfig,
  getMinerPath,
  getMinerFile,
} from "./ConfigUnpacker.js";
import {
  python,
  pip,
  pythonVenvPath,
  pipVenvPath,
} from "./OSHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function cleanupFiles() {
    let directory = "./Tmp";
    if (!fs.existsSync(directory)){
      fs.mkdirSync(directory);
    }
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(directory, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

export function removeFile(filePath) {
  console.log("Removing: " + filePath);
  if(fs.existsSync(filePath)) { // TODO: Consider alternative to below if we want to make sure the file is there. However, this should never happen so maybe bugs like that should crash the program instead to quickly identify and fix the critical issue
  // if(filePath) { // Only delete paths that actually exist. This will prevent crashing when streams are stopped.
    fs.unlink(filePath, (err) => {
      if (err) {
        throw err;
      }

      console.log("Delete File successfully.");
    });
  }
}

export function isObjEmpty (obj) {
  return Object.keys(obj).length === 0;
}

export function appendUrl(urls = []){
  let concatPath = "";
  urls.forEach(url => {
    concatPath = path.join(concatPath, url.toString());
  });
  return new URL(concatPath);
}

export function streamToString (stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}
// Use like this:
// streamToString(data._streams[1])
// .then(res => {
//     console.log(res);
// });
