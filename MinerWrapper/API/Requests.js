import fetch from "node-fetch";
import https from "https";
import fs from "fs";
import FormData from "form-data";
import os from "os";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export const getResourceFromRepo = async (url, filePath) => {
  let result = fetch(url, { agent })
  .then(
    res =>
      new Promise((resolve, reject) => {
        const fileWriteStream = fs.createWriteStream(filePath);
        res.body.pipe(fileWriteStream);
        res.body.on("end", () => resolve("File saved"));
        fileWriteStream.on("error", reject);
      })
  )
  .then(success => success)
  .catch(error => error);
  return result;
}

export const updateMetadata = async (url, overwriteId, isDynamic) => {
  const fileURL = new URL(overwriteId, "https://localhost:4000/resources/metadata/").toString()
  const data = new FormData();
  // const data = new URLSearchParams(); 
  data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: agent,
    method: "PUT",
    body: data,
    redirect: "follow",
  };
  let responseData = await fetch(fileURL, requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
}

export const sendResourceToRepo = async (output, parents, generatedFrom, minerResult, resourceOutputExtension, resourceOutputType, overwriteId, isDynamic) => {
  let description = `Miner result from some miner`;

  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  parents = JSON.stringify(parents);
  generatedFrom = JSON.stringify(generatedFrom);

  const data = new FormData();
  // const data = new URLSearchParams(); 
  data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  data.append("ResourceLabel", output.ResourceLabel);
  data.append("ResourceType", resourceOutputType);
  data.append("FileExtension", resourceOutputExtension);
  data.append("Description", description);
  data.append("GeneratedFrom", generatedFrom);
  data.append("Parents", parents);
  if(overwriteId != undefined) data.append("OverwriteId", overwriteId);
  if(isDynamic) data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: agent,
    method: "POST",
    body: data,
    redirect: "follow",
  };
  let responseData = await fetch(output.Host, requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  // console.log(`REQUESTS: Sent file to repository with status ${responseData.ok} and response ${response}`);
  return responseObj;
};

// export const initiateResourceOnRepo = async (output, resourceOutputExtension, resourceOutputType) => {
//   const formdata = new FormData();

//   formdata.append("ResourceLabel", output.ResourceLabel);
//   formdata.append("ResourceType", resourceOutputType);
//   formdata.append("FileExtension", resourceOutputExtension);

//   var requestOptions = {
//     agent: agent,
//     method: "POST",
//     body: formdata,
//     redirect: "follow",
//   };
//   let fetchData = await fetch(output.HostInit, requestOptions);
//   let response = await fetchData.json();
//   console.log("Repository init response: " + response);
//   return response;
// };

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

// async function createTmpFile(extension) {
//   let tmpPath = `./Downloads/tmp.${extension}`;
//   // let tmpPath = `./Tmp/tmp.${extension}`;
//   let result = {};
//   let output = JSON.stringify(result);
//   try {
//     let x = await fs.promises.writeFile(tmpPath, output, "utf8", (err) =>
//       console.log(err)
//     );
//     return tmpPath;
//   } catch (err) {
//     console.error("Error occurred while reading directory!", err);
//   }
// }

function isEmptyOrSpaces(str){
  return str === null || str.match(/^ *$/) !== null;
}
