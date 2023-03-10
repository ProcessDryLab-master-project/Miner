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
};

export const sendResourceToRepo = async (repositoryPath, minerResult, incomingFileId, resourceType) => {
  const filePath = minerResult;
  const nameWithoutExtension = filePath.split('\\').pop().split('/').pop().split('.').pop(); // Removes path and extension from filePath to get file name.
  const fileExtension = filePath.split('.').pop();
  const formdata = new FormData();
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(filePath);
  formdata.append('field-name', fileStream, { knownLength: fileSizeInBytes });
  formdata.append('fileLabel', nameWithoutExtension);
  formdata.append('resourceType', resourceType);
  formdata.append('fileExtension', fileExtension);
  formdata.append('basedOnId', incomingFileId);
  var requestOptions = {
    agent: agent,
    method: 'POST',
    body: formdata,
    redirect: 'follow'
  };
  let fetchData  = await fetch(repositoryPath, requestOptions)
  let response = await fetchData.json();
  return response;
};

// export function getResource(destination, resourceType, resourceName) {
//   const data = {
//     resourceType: resourceType,
//     resourceName: resourceName,
//   };

//   fetch(destination, {
//     method: "GET", // or 'PUT'
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(data),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       return data;
//     })
//     .catch((error) => {
//       console.error("Error:", error);
//     });
// }

// export const sendResource = async (url, result) => {
//   const response = await fetch(url, {
//     agent: agent,
//     method: "POST",
//     headers: {
//       "Content-Type": "text/xml",
//     },
//     body: result,
//   })
//     .then((response) => {
//       console.log("Response status: " + response.status);
//       return response.text();
//     })
//     .then((responseText) => {
//       console.log("Response text: " + responseText);
//     })
//     .catch((error) => {
//       console.log("Error caught: " + error);
//     });
//   return response;
// };
