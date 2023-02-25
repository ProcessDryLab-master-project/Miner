import spawn from "child_process";

export default function runMiner(body){

    const logPath = "example-log.xes";
    const pnmlPath = "running-example.pnml";
    const imgPath = "running-example.png";
    const pythonProcess = spawn.spawn('python',["./PythonMiner/main.py", body]);

    // var commandtoRun = "C:/Users/sebas/source/repos/PDL/PythonMiner/dist/main.exe";
    // const pythonProcess = spawn('cmd.exe', ["/c", commandtoRun, imgPath, pnmlPath, logPath])

    return new Promise((resolveFunc) => {
        pythonProcess.stdout.on('data', (data) => {
            console.log(data.toString());
            return "ok: " + data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.log(data.toString());
            return "ok: " + data.toString();
        });

        pythonProcess.on("exit", (code) => {
            resolveFunc(code);
        });
    });

    // return `runMiner says hello ${body.resource}`;
}







function miner(){
    // const spawn = require("child_process").spawn;
    // const logPath = "../PythonMiner/example-log.xes";
    // const pnmlPath = "../PythonMiner/running-example.pnml";
    // const imgPath = "../PythonMiner/running-example.png";
    const logPath = "./example-log.xes";
    const pnmlPath = "./running-example.pnml";
    const imgPath = "./running-example.png";
    const pythonProcess = spawn.spawn('python',["./PythonMiner/main.py", imgPath, pnmlPath, logPath]);

    // var commandtoRun = "C:/Users/sebas/source/repos/PDL/PythonMiner/dist/main.exe";
    // const pythonProcess = spawn('cmd.exe', ["/c", commandtoRun, imgPath, pnmlPath, logPath])

    pythonProcess.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
        console.log(data.toString());
    })
}

export default function runMiner2(){
    const minersReturnVal = async () => {
        await miner();
    }
    return `returned value that happens last`;
}

function miner2(){
    const spawn = require("child_process").spawn;
    const logPath = "../PythonMiner/example-log.xes";
    const pnmlPath = "C:/Users/sebas/source/repos/PDL/MinerNode/Resources/PNML/running-example.pnml";
    const imgPath = "C:/Users/sebas/source/repos/PDL/MinerNode/Resources/Images/running-example.png";
    // const pythonProcess = spawn('python',["C:/Users/sebas/source/repos/PDL/PythonMiner/main.py", imgPath, pnmlPath, logPath]);
    // const pythonProcess = spawn('python',["C:/Users/sebas/source/repos/PDL/PythonMiner/test.py", 1, 2, 3]);

    var commandtoRun = "C:/Users/sebas/source/repos/PDL/PythonMiner/dist/main.exe";
    const pythonProcess = spawn('cmd.exe', ["/c", commandtoRun, imgPath, pnmlPath, logPath])
    return new Promise((resolve, reject) => {
        pythonProcess.stdout.on('data', (data) => {
            console.log(data.toString());
        });
    
        pythonProcess.stderr.on('data', (data) => {
            console.log(data.toString());
        })
        pythonProcess.on("exit", (code) => {
            resolve(code);
        });
    });
}

// miner();

