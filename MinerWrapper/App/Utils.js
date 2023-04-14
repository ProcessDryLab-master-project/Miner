import fs from "fs";
import path from "path";

export function cleanupFiles() {
    let directory = "./Tmp";
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
  // if(fs.existsSync(filePath)) { // TODO: Consider alternative to below if we want to make sure the file is there. However, this should never happen so maybe bugs like that should crash the program instead to quickly identify and fix the critical issue
  if(filePath) { // Only delete paths that actually exist. This will prevent crashing when streams are stopped.
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
