// Request body unpackers
export function getBodyInput(body) {
  return body.Input;
}

export function getAllMetadata(body) {
  return getBodyInput(body).Resources;
}

export function getSingleMetadata(body, key) {
  return getAllMetadata(body)[key];
}

export function getBodyOutput(body) {
  return body.Output;
}

export function getBodyOutputHost(body) {
  return getBodyOutput(body).Host;
}

export function getBodyOutputHostInit(body) {
  return getBodyOutput(body).HostInit;
}

export function getBodyOutputLabel(body) {
  return getBodyOutput(body).HostInit;
}

export function getBodyMinerId(body) {
  return body.MinerId;
}

export function hasStreamInput(body) {
  for (let key in getAllMetadata(body)) {
    if (metadataIsStream(getSingleMetadata(body, key))) return true;
  }
  return false;
}

// Metadata unpackers
export function metadataIsStream(metadataObject) {
  return getMetadataResourceType(metadataObject) == "EventStream";
}

export function getMetadataResourceId(metadataObject) {
  return metadataObject.ResourceId;
}
export function getMetadataResourceInfo(metadataObject) {
  return metadataObject.ResourceInfo;
}
export function getMetadataResourceType(metadataObject) {
  return getMetadataResourceInfo(metadataObject).ResourceType;
}

export function getMetadataFileExtension(metadataObject) {
  return getMetadataResourceInfo(metadataObject).FileExtension;
}

export function getMetadataHost(metadataObject) {
  return getMetadataResourceInfo(metadataObject).Host;
}

// Keys added through wrapper (e.g. save paths)

// From frontend.
// export function getFileHost(file){
//     return file.ResourceInfo.Host;
// }

// export function getFileResourceId(file){
//     return file.ResourceId;
// }

// export function getFileExtension(file){
//     return file.ResourceInfo.FileExtension;
// }

// export function getFileResourceLabel(file){
//     return file.ResourceInfo.ResourceLabel;
// }

// export function getFileResourceType(file){
//     return file.ResourceInfo.ResourceType;
// }

// export function getFileDynamic(file){
//     return file.ResourceInfo.Dynamic;
// }

// export function getFileDescription(file){
//     return file.ResourceInfo.Description;
// }

// export function getFileCreationDate(file){
//     return file.CreationDate;
// }

// export function getFileStreamTopic(file){
//     return file.ResourceInfo.StreamTopic;
// }

// export function getFileProcessId(file){
//     return file.processId;
// }

// export function fileBuilder(file, properties = {}){
//     return {
//         ResourceId: properties.ResourceId || getFileResourceId(file),
//         ResourceInfo: {
//             Host: properties.Host || getFileHost(file),
//             FileExtension: properties.FileExtension || getFileExtension(file),
//             ResourceLabel: properties.ResourceLabel || getFileResourceLabel(file),
//             ResourceType: properties.ResourceType || getFileResourceType(file),
//             Dynamic: properties.Dynamic || getFileDynamic(file),
//             Description: properties.Description || getFileDescription(file),
//             StreamTopic: properties.StreamTopic || getFileStreamTopic(file)
//         },
//         CreationDate: properties.CreationDate || getFileCreationDate(file),
//         fileContent: properties.fileContent || getFileContent(file)
//     }
// }
