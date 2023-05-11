import os from "os";

export function python() {
  switch (os.type()) {
    case "Windows_NT":
      return "python";
    case "Linux":
      return "python3";
    default:
      throw new Error("Unsupported OS");
  }
}

export function pip() {
  switch (os.type()) {
    case "Windows_NT":
      return "pip";
    case "Linux":
      return "pip3";
    default:
      throw new Error("Unsupported OS");
  }
}

export function cmdExe() {
  switch (os.type()) {
    case "Windows_NT":
      return "cmd.exe";
    case "Linux":
      return "wine";
    default:
      throw new Error("Unsupported OS");
  }
}


export function pythonVenvPath() {
  switch (os.type()) {
    case "Windows_NT":
      return "env/Scripts/python.exe";
    case "Linux":
      return "env/bin/python3";
    default:
      throw new Error("Unsupported OS");
  }
}

export function pipVenvPath() {
  switch (os.type()) {
    case "Windows_NT":
      return "env/Scripts/pip.exe";
    case "Linux":
      return "env/bin/pip3";
    default:
      throw new Error("Unsupported OS");
  }
}

export function createVirtualEnvironmentString() {
  return {
    command: "python",
    args: "-m venv env",
  };
}