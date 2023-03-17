import fetch from "node-fetch";
import https from "https";
import fs from "fs";
import FormData from "form-data";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export const getResourceFromRepo = async (url, filePath) => {
  const res = await fetch(url, { agent });
  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
  console.log(`Log saved to ${filePath}`);
};

export const sendResourceToRepo = async (output, metadataObject, minerResult, resourceOutputType) => {
  let description = `Miner result from ${output.ResourceLabel}.`

  const formdata = new FormData();
  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  formdata.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  formdata.append("ResourceLabel", output.ResourceLabel);
  formdata.append("ResourceType", resourceOutputType);
  formdata.append("FileExtension", output.FileExtension);
  formdata.append("Description", description);
  formdata.append("Parents", metadataObject.ResourceId);
  var requestOptions = {
    agent: agent,
    method: "POST",
    body: formdata,
    redirect: "follow",
  };
  let fetchData = await fetch(output.Host, requestOptions);
  let response = await fetchData.json();
  return response;
};

export const initiateResourceOnRepo = async (
  repositoryPath,
  resourceLabel,
  resourceType,
  fileExtension
) => {
  let tmpPath = await createTmpFile(fileExtension);
  const formdata = new FormData();
  const stats = fs.statSync(tmpPath);
  const fileSizeInBytes = stats.size;
  const readStream = fs.createReadStream(tmpPath);
  formdata.append("field-name", readStream, { knownLength: fileSizeInBytes });
  formdata.append("resourceLabel", resourceLabel);
  formdata.append("resourceType", resourceType);
  formdata.append("fileExtension", fileExtension);
  var requestOptions = {
    agent: agent,
    method: "POST",
    body: formdata,
    redirect: "follow",
  };
  let fetchData = await fetch(repositoryPath, requestOptions);
  let response = await fetchData.json();
  console.log("rep resp: " + response);
  return response;
};

async function createTmpFile(extension) {
  let tmpPath = `./Downloads/tmp.${extension}`;
  let result = {};
  let output = JSON.stringify(result);
  try {
    let x = await fs.promises.writeFile(tmpPath, output, "utf8", (err) =>
      console.log(err)
    );
    return tmpPath;
  } catch (err) {
    console.error("Error occurred while reading directory!", err);
  }
}

function isEmptyOrSpaces(str){
  return str === null || str.match(/^ *$/) !== null;
}
