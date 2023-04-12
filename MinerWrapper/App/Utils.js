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
  fs.unlink(filePath, (err) => {
    if (err) {
      throw err;
    }

    console.log("Delete File successfully.");
  });
}
