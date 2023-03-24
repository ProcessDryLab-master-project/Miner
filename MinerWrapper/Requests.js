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

export const sendResourceToRepo = async (output, metadataObject, minerResult, resourceOutputExtension, resourceOutputType, overwriteId) => {
  let description = `Miner result from ${metadataObject.ResourceLabel}.`

  const formdata = new FormData();
  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  let parents = [
    metadataObject.ResourceId
  ]
  parents = JSON.stringify(parents);

  formdata.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  formdata.append("ResourceLabel", output.ResourceLabel);
  formdata.append("ResourceType", resourceOutputType);
  formdata.append("FileExtension", resourceOutputExtension);
  formdata.append("Description", description);
  formdata.append("Parents", parents);
  formdata.append("OverwriteId", overwriteId);
  var requestOptions = {
    agent: agent,
    method: "POST",
    body: formdata,
    redirect: "follow",
  };
  let fetchData = await fetch(output.Host, requestOptions);
  let response = await fetchData.json();
  console.log("Repository send file response: " + response);
  return response;
};

export const initiateResourceOnRepo = async (output, resourceOutputExtension, resourceOutputType) => {
  const formdata = new FormData();

  formdata.append("ResourceLabel", output.ResourceLabel);
  formdata.append("ResourceType", resourceOutputType);
  formdata.append("FileExtension", resourceOutputExtension);

  var requestOptions = {
    agent: agent,
    method: "POST",
    body: formdata,
    redirect: "follow",
  };
  let fetchData = await fetch(output.HostInit, requestOptions);
  let response = await fetchData.json();
  console.log("Repository init response: " + response);
  return response;
};

// export const initiateResourceOnRepo = async (output, metadataObject, resourceOutputType) => {
//   let description = `Streaming result from ${metadataObject.ResourceLabel}.`
//   let tmpPath = await createTmpFile(output.FileExtension);
//   const formdata = new FormData();
//   const stats = fs.statSync(tmpPath);
//   const fileSizeInBytes = stats.size;
//   const fileStream = fs.createReadStream(tmpPath);
//   let parents = [
//     metadataObject.ResourceId
//   ]
//   parents = JSON.stringify(parents);

//   formdata.append("field-name", fileStream, { knownLength: fileSizeInBytes });
//   formdata.append("ResourceLabel", output.ResourceLabel);
//   formdata.append("ResourceType", resourceOutputType);
//   formdata.append("FileExtension", output.FileExtension);
//   formdata.append("Description", description);
//   formdata.append("Parents", parents);

//   var requestOptions = {
//     agent: agent,
//     method: "POST",
//     body: formdata,
//     redirect: "follow",
//   };
//   let fetchData = await fetch(output.Host, requestOptions);
//   let response = await fetchData.json();
//   console.log("repository resp: " + response);
//   return response;
// };

async function createTmpFile(extension) {
  let tmpPath = `./Downloads/tmp.${extension}`;
  // let tmpPath = `./Tmp/tmp.${extension}`;
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
