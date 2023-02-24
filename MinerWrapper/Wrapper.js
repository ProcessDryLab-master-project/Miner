export default function runMiner(args = {}){
    return `runMiner says hello ${args}`;
}

function miner(){
    const spawn = require("child_process").spawn;
    const logPath = "../PythonMiner/example-log.xes";
    const pnmlPath = "C:/Users/sebas/source/repos/PDL/MinerNode/Resources/PNML/running-example.pnml";
    const imgPath = "C:/Users/sebas/source/repos/PDL/MinerNode/Resources/Images/running-example.png";
    // const pythonProcess = spawn('python',["C:/Users/sebas/source/repos/PDL/PythonMiner/main.py", imgPath, pnmlPath, logPath]);
    // const pythonProcess = spawn('python',["C:/Users/sebas/source/repos/PDL/PythonMiner/test.py", 1, 2, 3]);

    var commandtoRun = "C:/Users/sebas/source/repos/PDL/PythonMiner/dist/main.exe";
    const pythonProcess = spawn('cmd.exe', ["/c", commandtoRun, imgPath, pnmlPath, logPath])

    pythonProcess.stdout.on('data', (data) => {
    console.log(data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
        console.log(data.toString());
    })
}

