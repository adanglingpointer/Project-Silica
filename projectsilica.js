// works like a charm, immediately disconnects

const { processLineByLine } = require("./logblock");

const { exec, execSync } = require("child_process");

const { promisify } = require("util");
const interval = 3000; // milliseconds
const threshold = 300; // not being used
//const blockTime = 3600; // seconds
const blockTime = 30; // seconds
const maxConnectionsPerIP = 10;
const readline = require("readline");
const os = require("os");
const ProgressBar = require("progress");
const spinner = require("cli-spinners").dots;
const fs = require("fs");
const path = require("path");
const { stdout } = require("process");
const https = require('https');
const request = require('request');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

console.log('Project Silica');

let opSys = os.type();
let opVer = os.version();
let ufwStatus = 0;
let timestamp = Date.now();
let date = new Date(timestamp);
let formattedDate = date.toLocaleString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});
//const lockFilePath = "/usr/local/sbin/projectsilica.lock";
let checkRestart = 0;
let ourFirstRun = 0;
let commandResponse = '';
let remoteIP = '127.0.0.1'
let startLogBlock = 0;
let verboseMode = 0;
let verboseSeconds = 30; // declare a variable to store the number after -v

function uninstallSilica() {
  function runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${command}`);
          console.error(error);
          reject(error);
        } else {
          console.log(`Command executed successfully: ${command}`);
          resolve(stdout);
        }
      });
    });
  }
  
  async function removeProjectSilica() {
    try {
      await runCommand('systemctl stop projectsilica');
      await runCommand('systemctl disable projectsilica');
      await runCommand('rm /etc/systemd/system/projectsilica.service');
      await runCommand('systemctl daemon-reload');
      await runCommand('rm /usr/local/sbin/projectsilica');
      await runCommand('rm -rf /var/log/projectsilica');
      await runCommand('rm -rf /etc/projectsilica/');
      console.log('Project Silica has been uninstalled.  Good bye =[');
      setTimeout(() => {process.exit(0)}, 500);
    } catch (error) {
      console.error('Error while uninstalling, exiting...');
      setTimeout(() => {process.exit(0);}, 500);
    }
  }
  
  removeProjectSilica();
}

function licenseKey() {
  console.log('Displaying license key information...');

  /* ---------------------------- */
/// license key checking stuff ///

const licenseFile = '/etc/projectsilica/license.key';
// const apiUrl = 'https://api.projectsilica.com:3031/client/';
const apiUrl = 'http://localhost:3031/client/';

function getLicenseKey() {
  const rl3 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false // add this line
  });

  return new Promise(resolve => {
    rl3.question('Please enter your license key: ', key => {
      rl3.close();
      resolve(key);
    });
  });
}

let connectAttempts = 0;

async function askForKey() {
  const licenseKey = await getLicenseKey();
  //console.log(`License key: ${myLicenseKey}`);
  
  function sendLicenseKey() {
    connectAttempts++;
    request(apiUrl + licenseKey, function (error, response, body) {
      if (error) {
        console.log(`Error connecting to API server, trying again in 10 seconds...`);
        if (connectAttempts==3){
          console.log(`No response from server. Please check internet and try again. Exiting...`);
          process.exit(0)
        }
        setTimeout(sendLicenseKey, 10000); // retry after 10 seconds
        return;
      }
  
      const result = JSON.parse(body);
  
      if (result.message === 'License not found') {
        console.log(`License key ${licenseKey} is invalid.`);
        process.exit(0);
      } else if (result.message === 'Registered') {
        if (result.type==3) {
          console.log(`License key has expired. Please purchase a valid one from https://www.projectsilica.com/`);
          process.exit(0);
        } else if (result.type!=3) {
        console.log(`License key ${licenseKey} is registered as type: ${result.type}.`);
        // Create the directory if it doesn't exist
        const licenseDir = '/etc/projectsilica';
        if (!fs.existsSync(licenseDir)) {
          fs.mkdirSync(licenseDir, { recursive: true });
        }

        fs.writeFile(licenseFile, licenseKey, (err) => {
          if (err) {
            console.log(`${err}`);
            process.exit(1);
          }
          console.log(`${licenseKey} is valid and has been installed`);
          //checkAndUpdateProjectSilica();
        });
      }
      } else {
        //console.log(`Unexpected response from API server: ${body}`);
        console.log(`Error connecting to API server, trying again in 10 seconds...`);
        if (connectAttempts==3){
          console.log(`No response from server. Please check internet and try again. Exiting...`);
          process.exit(0)
        }
        setTimeout(sendLicenseKey, 10000); // retry after 10 seconds
        return;
      }
    });
  }
  
  sendLicenseKey();
}

askForKey();
/* -------------------- */
/// end license key stuff
}

function mainSilica() {

try {
  remoteIP = execSync(`curl -s https://api.ipify.org`, { stdio: 'pipe' }).toString();
  //console.log(`Command output: ${commandResponse}`);
} catch (err) {
  //console.error("Failed to execute command");
}

const runSpinner = () => {
  let i = 0;
  const interval2 = setInterval(() => {
    process.stdout.write(`\r${spinner.frames[i]} Listening...`);
    i = (i + 1) % spinner.frames.length;
  }, 100);
};

function checkForSilicaUpdates() {
  https.get('https://dl.projectsilica.com/v.txt', (res) => {
      let data = '';
      res.on('data', (chunk) => {
          data += chunk;
      });
      res.on('end', () => {
        //console.log(`return data for update is ${data}`);
          if (data.trim() === '2') {
            writeLog(`Updated Project Silica to v1.0.1\n${formattedDate}\n`);
              const file = fs.createWriteStream('/usr/local/sbin/projectsilica2');
              https.get('https://dl.projectsilica.com/2', (response) => {
                  response.pipe(file);
                  file.on('finish', () => {
                    fs.chmodSync('/usr/local/sbin/projectsilica2', '755');
                      file.close();

                      exec(
                        `mv /usr/local/sbin/projectsilica2 /usr/local/sbin/projectsilica`,
                        (error, stdout, stderr) => {
                          if (error) {
                            writeLog(
                              `Error writing binary to /usr/local/sbin/projectsilica\n${error}\n${formattedDate}\n`
                            );
                            console.log(
                              `Error. See log file. Exiting...`
                            );
                            process.exit(1);
                          } else {
                            console.log(
                              `Installed Project Silica update.  Restarting as background process...`
                            );
                            setTimeout(() => {process.exit(0)},500);
                          }
                        }
                      );

                      
                  });
              });
          } else {
//
          }
      });
  });
}

const startProgressBar = () => {
  console.log("Loading...");
  const total = 9;
  let completed = 0;

  // Initialize the progress bar with the total number of items
  const bar = new ProgressBar("  [:bar] :percent :etas", {
    complete: "=",
    incomplete: " ",
    width: 20,
    total: total,
  });

  const firstStart = () => {
    // declare functions first

    // Function to check if the Project Silica files exist
    function checkProjectSilicaFilesExist() {
      const binPath = "/usr/local/sbin/projectsilica";
      const servicePath = "/etc/systemd/system/projectsilica.service";
      const binExists = fs.existsSync(binPath);
      const serviceExists = fs.existsSync(servicePath);
      return binExists && serviceExists;
    }

    // Function to enable and start the projectsilica service
    async function enableAndStartProjectSilica() {
      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl enable projectsilica"
        );
        if (stdout) {
          // normal response
          console.log("Project Silica has been enabled successfully!");
        }
        if (stderr) {
          // error
          if (!stderr.toString().includes("symlink")) {
            writeLog(
              `Error enabling projectsilica as a system service\nCommand: sudo systemctl enable projectsilica\n${stderr}\n${formattedDate}\n`
            );
            console.log(
              `Error. See log file. Exiting...`
            );
            process.exit(1);
          }
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error enabling projectsilica as a system service\nCommand: sudo systemctl enable projectsilica\n${error}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl daemon-reload"
        );
        if (stdout) {
          // normal response
        }
        if (stderr) {
          // error
          writeLog(
            `Error enabling projectsilica as a system service\nCommand: sudo systemctl daemon-reload\n${stderr}\n${formattedDate}\n`
          );
          console.log(`Error. See log file. Exiting...`);
          process.exit(1);
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error enabling projectsilica as a system service\nCommand: sudo systemctl daemon-reload\n${error}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl stop projectsilica"
        );
        if (stdout) {
          // normal response
        }
        if (stderr) {
          // error
          writeLog(
            `Error stopping projectsilica as a system service\nCommand: sudo systemctl stop projectsilica\n${stderr}\n${formattedDate}\n`
          );
          console.log(`Error. See log file. Exiting...`);
          process.exit(1);
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error stopping projectsilica as a system service\nCommand: sudo systemctl stop projectsilica\n${stderr}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl start projectsilica"
        );
        if (stdout) {
          // normal response
          console.log("Project Silica has been started successfully!");
        }
        if (stderr) {
          // error
          writeLog(
            `Error enabling projectsilica as a system service\nCommand: sudo systemctl start projectsilica\n${stderr}\n${formattedDate}\n`
          );
          console.log(`Error. See log file. Exiting...`);
          process.exit(1);
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error enabling projectsilica as a system service\nCommand: sudo systemctl start projectsilica\n${stderr}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      await ufwInstaller();

      await lsofInstaller();

      startProgram();
    }

    let firstRun = checkProjectSilicaFilesExist();
    if (firstRun == true) {
      // files exist, not first run
      //console.log('files exist, not first run');
      checkAndCreateLockFile();
      startProgram();
    } else {
      ourFirstRun = 1;
      //console.log('files dont exist, this is first run');
      writeLog(`Installing Project Silica\n${formattedDate}\n`);
      writeBan("\n");
      // Contents of the file
      const fileContents = `[Unit]
Description=projectsilica
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/sbin/projectsilica > /dev/null 2>&1
Restart=always
RestartSec=10s
StartLimitInterval=350s
StartLimitBurst=0
StandardOutput=null
StandardError=null

[Install]
WantedBy=multi-user.target`;

      // Path to the file to be created
      const filePath = "/etc/systemd/system/projectsilica.service";

      // Write the contents to the file
      fs.writeFile(filePath, fileContents, (err) => {
        if (err) {
          writeLog(
            `Error writing service file to /etc/systemd/system/projectsilica.service\n${err}\n ${formattedDate}\n`
          );
          console.log("Error. See log file. Exiting...");
          process.exit(1);
        }
        console.log(`${filePath} has been created successfully!`);
      });

      // Get the directory and filename of the currently running script
      const currentDirectory = path.dirname(process.argv[0]);
      const currentBinaryName = path.basename(process.argv[0]);

      // Overwrite the currently running program with the new binary
      exec(
        `mv ${path.join(
          currentDirectory,
          currentBinaryName
        )} /usr/local/sbin/projectsilica`,
        (error, stdout, stderr) => {
          if (error) {
            writeLog(
              `Error writing binary to /usr/local/sbin/projectsilica\n${error}\n${formattedDate}\n`
            );
            console.log(
              `Error. See log file. Exiting...`
            );
            process.exit(1);
          } else {
            console.log(
              `Installed Project Silica to /usr/local/sbin/projectsilica`
            );
          }
        }
      );

      enableAndStartProjectSilica();
    }
  };

  firstStart();
};

function unbanPickup() {
  function checkIfBanLogFileExists() {
    const banLogFile = "/var/log/projectsilica/ban.log";
    try {
      // Check if the ban log file exists
      fs.accessSync(banLogFile, fs.constants.F_OK);
      //console.log(`${banLogFile} exists`);
      return true;
    } catch (err) {
      //console.error(`${banLogFile} does not exist`);
      return false;
    }
  }

  let doesBanFileExist = checkIfBanLogFileExists();

  if (doesBanFileExist == false) {
    return;
  }

  // Read the IP.log file
  const data = fs.readFileSync("/var/log/projectsilica/ban.log", "utf8");
  // Split the data into an array of IPs
  const ips = data.split("\n").filter((ip) => ip);
  // For each IP in the array
  ips.forEach((ip) => {
    // Unban the IP using ufw

    try {
      commandResponse = execSync(`ufw delete deny from ${ip}`, { stdio: 'pipe' }).toString();
      //console.log(`Command output: ${commandResponse}`);
    } catch (err) {
      writeLog(
        `Error running command:\nufw delete deny from ${ip}\n${err}\n ${formattedDate}\n`
       );
       console.log("Error. See log file. Exiting...");
    }

    // Remove the unbanned IP from the log file
    let newData = fs.readFileSync("/var/log/projectsilica/ban.log", "utf8");
    fs.writeFileSync(
      "/var/log/projectsilica/ban.log",
      newData.replace(`${ip}\n`, ""),
      "utf8"
    );
    //console.log(`Removed ${ip} from log file`);
  });
}

const writeBan = (troublemaker) => {
  // Create the antidos directory if it doesn't exist
  const logDir = "/var/log/projectsilica";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Write to the IP.log file
  const logFile = path.join(logDir, "ban.log");
  fs.appendFileSync(logFile, `${troublemaker}\n`);
};

const writeLog = (msg) => {
  // Create the antidos directory if it doesn't exist
  const logDir = "/var/log/projectsilica";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Write to the IP.log file
  const logFile = path.join(logDir, "log.log");
  fs.appendFileSync(logFile, `${msg}\n`);
};

async function checkAdmin() {
  return new Promise((resolve, reject) => {
    exec("id -u", (error, stdout, stderr) => {
      if (error) {
        console.log(
          "You are not running this application with elevated privileges!  Exiting..."
        );
        process.exit(0);
      } else {
        if (stdout.trim() === "0") {
          //console.log("You are running this application as a superuser.\n");
          startProgressBar();
          return true;
        } else {
          console.log(
            "You are not running this application with elevated privileges!  Exiting..."
          );
          process.exit(0);
        }
        resolve();
      }
    });
  });
}

async function ufwInstaller() {
  try {
    const { stdout, stderr } = await promisify(exec)("sudo ufw status");
    if (stdout) {
      // if ufw is installed but not enabled
      // also if installed and enabled
      // console.log(`caught in stdout: ${stdout}`);
      if (stdout.toString().includes("inactive")) {
        console.log("UFW is inactive, activating...");
        const { stdout: stdout2, stderr: stderr2 } = await promisify(exec)(
          `sudo ufw --force enable && sudo ufw default allow incoming`
        );
        if (stderr2) {
          writeLog(`Error activating UFW: \n${stderr2}\n{formattedDate}\n`);
          console.log("Error. See log file. Exiting...");
          process.exit(1);
        }
        if (stdout2) {
          console.log("UFW has been enabled successfully!");
        }
      }
      if (stdout.toString().includes(": active")) {
        //console.log('ufw is already active');
      }
    }
    if (stderr) {
      writeLog(`Error activating UFW:\n${stderr}\n{formattedDate}\n`);
      console.log("Error. See log file. Exiting...");
      process.exit(1);
    }
  } catch (error) {
    // if ufw is not installed
    // console.log(`caught in error: ${error}`);
    if (error.toString().includes("command not found")) {
      console.log("UFW not installed, installing...");
      const { stdout: stdout3, stderr: stderr3 } = await promisify(exec)(
        `sudo apt update && sudo apt install ufw -y && sudo ufw --force enable && sudo ufw default allow incoming`
      );
      if (stderr3) {
        if (!stderr3.toString().includes("stable CLI interface")) {
          writeLog(`Error installing UFW:\n${stderr3}\n${formattedDate}\n`);
          console.log("Error. See log file. Exiting...");
          process.exit(1);
        }
      }
      if (stdout3) {
        console.log("UFW successfully installed and enabled!");
      }
    }
  }
}

async function lsofInstaller() {
  try {
    const { stdout, stderr } = await promisify(exec)("lsof -v");
    if (stdout) {
      //console.log('stdout is ' + stdout.toString());
    }
    if (stderr) {
      if (stderr.toString().includes("version information")) {
        //console.log('lsof already installed!');
        return;
      }

      //console.log('lsof not installed, installing...');
      const { stdout: stdoutb, stderr: stderrb } = await promisify(exec)(
        `apt-get update && apt-get install lsof -y`
      );
      if (stderrb) {
        if (!stderrb.toString().includes("stable CLI interface")) {
          writeLog(
            `Unable to install lsof\n${stderrb}\n${formattedDate}\n`
          );
          console.log("Error. See log file. Exiting...");
          process.exit(1);
        }
      }
      if (stdoutb) {
        //console.log('lsof successfully installed');
        return;
      }
    }
  } catch (error) {
    if (error.code === "ENOENT" || error.toString().includes("not found")) {
      //console.log('lsof not installed, installing...');
      const { stdout: stdout3, stderr: stderr3 } = await promisify(exec)(
        `apt-get update && apt-get install lsof -y`
      );
      if (stderr3) {
        if (!stderr3.toString().includes("stable CLI interface")) {
          writeLog(
            `Unable to install lsof\n${stderr3}\n${formattedDate}\n`
          );
          console.log("Error. See log file. Exiting...");
          process.exit(1);
        }
      }
      if (stdout3) {
        //console.log('lsof successfully installed');
      }
    } else {
      writeLog(
        `Unable to install lsof\n${error}\n${formattedDate}\n`
      );
      console.log("Error. See log file. Exiting...");
      process.exit(1);
    }
  }
}

const startProgram = async () => {
  console.clear();

  //checkAdmin();
  async function checkUFW() {
    await ufwInstaller();
  }

  async function checkLsof() {
    await lsofInstaller();
  }

  await checkUFW();
  await checkLsof();
  

  setTimeout(() => {
    console.clear();
    console.log(`
    ═══════════════════════════════════════════════════════════
    ║███████████████████████████████████████████████████v1.0.0║
    ║▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒║
    ║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║
    ║███┬██╗░██████╗░░█████╗░░░░░░██╗███████╗░█████╗░████████╗║
    ║██─┼─██╗██╔══██╗██╔══██╗░░░░░██║██╔════╝██╔══██╗╚══██╔══╝║
    ║███┴██╔╝██████╔╝██║░░██║░░░░░██║█████╗░░██║░░╚═╝░░░██║░░░║
    ║██╔═══╝░██╔══██╗██║░░██║██╗░░██║██╔══╝░░██║░░██╗░░░██║░░░║
    ║██║░░░░░██║░░██║╚█████╔╝╚█████╔╝███████╗╚█████╔╝░░░██║░░░║
    ║╚═╝░░░░░╚═╝░░╚═╝░╚════╝░░╚════╝░╚══════╝░╚════╝░░░░╚═╝░░░║
    ║✰✰✰✰✰✰▀▀▀▀▀▀▀▀▀▀▀▀:░██████╗██╗██╗░░░░░██╗░█████╗░░█████╗░║
    ║✰✰✰✰✰✰            :██╔════╝██║██║░░░░░██║██╔══██╗██╔══██╗║
    ║✰✰✰✰✰✰▀▀▀▀▀▀▀▀▀▀▀▀:╚█████╗░██║██║░░░░░██║██║░░╚═╝███████║║
    ║                  :░╚═══██╗██║██║░░░░░██║██║░░██╗██╔══██║║
    ║▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀:██████╔╝██║███████╗██║╚█████╔╝██║░░██║║
    ║                  :╚═════╝░╚═╝╚══════╝╚═╝░╚════╝░╚═╝░░╚═╝║
    ║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║
    ║▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ God Bless America ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒║
    ║███████████████████████████████████████|©2023 David Hucks║
    ═══════════════════════════════════════════════════════════

    You may close this window/terminal/session; Project Silica will continue to run as a service.
`);

function leavingNow() {
  process.exit(0);
}

function leavingVerbose() {

  try {
    let stopSilica = execSync(`sudo systemctl start projectsilica`, { stdio: 'pipe' }).toString();
    //console.log(`Command output: ${commandResponse}`);
  } catch (err) {
    //console.error("Failed to execute command");
  }

  process.exit(0);
}

if (checkRestart==1) {
  console.log(`Update detected.  Restarting to run as service...`);
  setTimeout(leavingNow, 1500);
}

if (verboseMode==0 && ourFirstRun==1) {
  setTimeout(leavingNow, 1500);
}

if (verboseMode==1) {
  setTimeout(leavingVerbose, verboseSeconds * 1000);
}

    runSpinner();
    startLogBlock=1;
  }, 2300);

  setInterval(() => {
    if (startLogBlock==1){
      processLineByLine();
    }
  }, 30000);

  /*
  setInterval(() => {
    unbanPickup();
  }, blockTime * 2000);
  */

  setInterval(() => {
    console.log('Checking for updates');
    checkForSilicaUpdates();
  }, 86400000);

  setInterval(() => {
    //console.log(`first, we trigger an lsof`);
    exec(
      `lsof -i -n -P | awk '$9 ~ /.->./ {split($9,a,\"->\"); split(a[2],b,\":\"); print b[1]}' | sort | uniq -c | sort -nr`,
      (error, stdout, stderr) => {
        //console.log(`stdout from lsof is ${stdout}`);
        if (error) {
          writeLog(`Error reading connections \nCommand: lsof \n${error}\n${formattedDate}\n`);
          console.log("Error. See log file. Exiting...");
          process.exit(1);
        }

        const connections = stdout
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            const [count, ip] = line.trim().split(" ");
            return { count: parseInt(count, 10), ip };
          })
          .filter(
            ({ count, ip }) =>
              count > maxConnectionsPerIP &&
              ip !== "127.0.0.1" &&
              ip !== remoteIP
          );

        if (connections.length > 0) {
          //console.log(`at least one connection so we are going to map connections as ipAddresses`);
          const ipAddresses = connections.map(({ ip }) => ip);

          // Iterate over each IP address and execute the ufw command for each one separately
          ipAddresses.forEach((ipAddress) => {
            exec(
              `sudo ufw status numbered | grep ${ipAddress}`,
              (error, stdout, stderr) => {
                if (stdout.trim().length > 0) {
                  //console.log(`IP address ${ipAddress} is already blocked in ufw`);
                  //return;
                } else {
                  console.log(`Blocking IP: ${ipAddress}`);
                  //writeLog(`Blocking IP: ${ipAddress}\n${formattedDate}\n`);
                  writeLog(`Blocking IP: ${ipAddress}\n${formattedDate}\n`);
                  writeBan(ipAddress);
                  exec(
                    `sudo ufw deny from ${ipAddress} to any`,
                    (error, stdout, stderr) => {
                      //
                      if (error) {
                        //
                      }

                      /*
                      setTimeout(() => {
                        exec(
                          `sudo ufw delete deny from ${ipAddress} to any`,
                          (error, stdout, stderr) => {
                            if (error) {
                              //console.log('Error U3. Please see logs (/var/logs/projectsilica.log) and report error. Exiting.');
                              //writeLog(`U3: Error blocking IP in UFW: ${error}\n${formattedDate}\n`);
                              //process.exit(0);
                              //console.log(
                              //  `error to ufw delete deny from ${ipAddress}: ${error}`
                              //);
                            }
                            console.log(`Unblocking IP: ${ipAddress}`);
                            //console.log(`response to ufw delete deny from ${ipAddress}: ${stdout}`);
                          }
                        );
                      }, blockTime * 1000);
                      */

                    }
                  );
                }
                exec(
                  `sudo lsof -i | grep ${ipAddress} | awk '{print $2}' | sort | uniq | xargs kill -9`,
                  (error, stdout, stderr) => {
                    if (error) {
                      //console.log(
                      //  "Error L2. Please see logs (/var/logs/projectsilica.log) and report error. Exiting."
                      //);
                      //writeLog(
                      //  `L2: Error blocking IP in UFW: ${error}\n${formattedDate}\n`
                      //);
                      //process.exit(0);
                    } else {
                      console.log(
                        `Killing processes associated with IP ${ipAddress}`
                      );
                    }
                  }
                );
              }
            );
          });
        }
      }
    );
  }, interval);
};

function checkAndCreateLockFile() {
  // Execute the command 'ps -aux' and get the output
  exec("ps -aux", (error, stdout, stderr) => {
    // If there is an error, log it and return
    if (error) {
      //console.error(`exec error: ${error}`);
      //return;
      writeLog(`Error checking for instance of projectsilica running\nCommand: ps -aux\n${error}\n${formattedDate}\n`);
      console.log(`Error. See log file. Exiting...`);
      process.exit(1);
    }
    // If there is any standard error output, log it and return
    if (stderr) {
      //console.error(`stderr: ${stderr}`);
      //return;
      writeLog(`Error checking for instance of projectsilica running\nCommand: ps -aux\n${error}\n${formattedDate}\n`);
      console.log(`Error. See log file. Exiting...`);
      process.exit(1);
    }
    // Split the standard output by line breaks
    let lines = stdout.split("\n");
    // Initialize a counter for the number of times 'projectsilica' is found
    let count = 0;
    // Loop through each line
    for (let line of lines) {
      // Check if the line contains the word 'projectsilica'
      if (line.includes("projectsilica")) {
        // If yes, increment the counter by one
        count++;
        // Check if the counter has reached two
        if (count == 2 && verboseMode == 0) {
          // If yes, log a message and exit the process with code 1
          console.log("Project Silica is already running. Exiting...");
          process.exit(0);
        }
      }
    }
    // If no line contains the word 'projectsilica' twice, log a message and continue
    //console.log("Project Silica is not running twice. Continuing...");
  });
}

    // Function to enable and start the projectsilica service
    async function enableAndStartProjectSilicaUpdate() {

          // Function to check if the Project Silica files exist
    function checkIfFirstRun() {
      const binPath2 = "/usr/local/sbin/projectsilica";
      const servicePath2 = "/etc/systemd/system/projectsilica.service";
      const binExists2 = fs.existsSync(binPath2);
      const serviceExists2 = fs.existsSync(servicePath2);
      return binExists2 && serviceExists2;
    }

    let isThisNew = checkIfFirstRun();

    //console.log(`isThisNew = ${isThisNew}`);

    if (isThisNew == false) { // this is new
      writeLog(`first run : ${formattedDate} \n`);
      writeBan("\n");
      // Contents of the file
      const fileContents2 = `[Unit]
Description=projectsilica
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/sbin/projectsilica > /dev/null 2>&1
Restart=always
RestartSec=10s
StartLimitInterval=350s
StartLimitBurst=0
StandardOutput=null
StandardError=null

[Install]
WantedBy=multi-user.target`;

      // Path to the file to be created
      const filePath2 = "/etc/systemd/system/projectsilica.service";

      // Write the contents to the file
      fs.writeFile(filePath2, fileContents2, (err) => {
        if (err) {
          writeLog(
            `Error writing service file to /etc/systemd/system/projectsilica.service\n${err}\n ${formattedDate}\n`
          );
          console.log("Error. See log file. Exiting...");
          process.exit(1);
        }
        console.log(`${filePath2} has been created successfully!`);
      });

      // Get the directory and filename of the currently running script
      const currentDirectory2 = path.dirname(process.argv[0]);
      const currentBinaryName2 = path.basename(process.argv[0]);

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl enable projectsilica"
        );
        if (stdout) {
          // normal response
          console.log("Project Silica has been enabled successfully!");
        }
        if (stderr) {
          // error
          if (!stderr.toString().includes("symlink")) {
            writeLog(
              `Error enabling projectsilica as a system service\n${stderr}\n${formattedDate}\n`
            );
            console.log(
              `Error. See log file. Exiting...`
            );
            process.exit(1);
          }
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error enabling projectsilica as a system service\n${error}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl start projectsilica"
        );
        if (stdout) {
          // normal response
          console.log("Project Silica has been started successfully!");
        }
        if (stderr) {
          // error
          writeLog(
            `Error enabling projectsilica as a system service\n${stderr}\n${formattedDate}\n`
          );
          console.log(`Error. See log file. Exiting...`);
          process.exit(1);
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error enabling projectsilica as a system service\n${error}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl daemon-reload"
        );
        if (stdout) {
          // normal response
        }
        if (stderr) {
          // error
          writeLog(
            `Error reloading daemon\n${stderr}\n${formattedDate}\n`
          );
          console.log(`Error. See log file. Exiting...`);
          process.exit(1);
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error reloading daemon\n${error}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      await ufwInstaller();

      await lsofInstaller();

      startProgram();
    } else {


      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl stop projectsilica"
        );
        if (stdout) {
          // normal response
        }
        if (stderr) {
          // error
          //console.log(`Error code ES5.  See log for more details.  Exiting...`);
          //writeLog(
          //  `ES5: Error enabling projectsilica as a system service\n${stderr}\n${formattedDate}\n`
          //);
          //process.exit(0);
        }
      } catch (error) {
        // command not found
        //console.log(`Error code ES6.  See log for more details.  Exiting...`);
        //writeLog(
        //  `ES6: Error enabling projectsilica as a system service\n${error}\n${formattedDate}\n`
        //);
        //process.exit(0);
      }

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl daemon-reload"
        );
        if (stdout) {
          // normal response
        }
        if (stderr) {
          // error
          writeLog(
            `Error reloading daemon\n${stderr}\n${formattedDate}\n`
          );
          console.log(`Error. See log file. Exiting...`);
          process.exit(1);
        }
      } catch (error) {
        // command not found
        writeLog(
          `Error reloading daemon\n${error}\n${formattedDate}\n`
        );
        console.log(`Error. See log file. Exiting...`);
        process.exit(1);
      }

      try {
        const { stdout, stderr } = await promisify(exec)(
          "sudo systemctl start projectsilica"
        );
        if (stdout) {
          // normal response
          console.log("Project Silica has been started successfully!");
        }
        if (stderr) {
          // error
          //console.log(`Error code ES7.  See log for more details.  Exiting...`);
          //writeLog(
          //  `ES7: Error enabling projectsilica as a system service\n${stderr}\n${formattedDate}\n`
          //);
          //process.exit(0);
        }
      } catch (error) {
        // command not found
        //writeLog(
        //  `ES81: Error enabling projectsilica as a system service\n${error}\n${formattedDate}\n`
        //);
        //console.log(`Error code ES81.  See log for more details.  Exiting...`);
        //process.exit(0);
      }

      await ufwInstaller();

      await lsofInstaller();

      startProgram();
    }
    }

function checkAndUpdateProjectSilica() {
  https.get('https://dl.projectsilica.com/v.txt', (res) => {
      let data = '';
      res.on('data', (chunk) => {
          data += chunk;
      });
      res.on('end', () => {
        //console.log(`return data for update is ${data}`);
          if (data.trim() === '2') {
            writeLog(`Updated Project Silica to v1.0.1\n${formattedDate}\n`);
            //console.log(`data.trim === 2 is true`)
            checkRestart = 1;
              const file = fs.createWriteStream('/usr/local/sbin/projectsilica2');
              https.get('https://dl.projectsilica.com/2', (response) => {
                  response.pipe(file);
                  file.on('finish', () => {
                    fs.chmodSync('/usr/local/sbin/projectsilica2', '755');
                      file.close();

                      exec(
                        `mv /usr/local/sbin/projectsilica2 /usr/local/sbin/projectsilica`,
                        (error, stdout, stderr) => {
                          if (error) {
                            writeLog(
                              `Error writing binary to /usr/local/sbin/projectsilica\n${error}\n${formattedDate}\n`
                            );
                            console.log(
                              `Error. See log file. Exiting...`
                            );
                            process.exit(1);
                          } else {
                            console.log(
                              `Installed Project Silica to /usr/local/sbin/projectsilica`
                            );
                          }
                        }
                      );

                      setTimeout(enableAndStartProjectSilicaUpdate, 1000);
                      //enableAndStartProjectSilicaUpdate();
                  });
              });
          } else {
            setTimeout(() => {
              if (opSys != "Linux") {
                const continueF = async () => {
                  const answer = await new Promise((resolve) => {
                    rl.question(
                      "Unfortunately, your OS is not supported.  Continue anyway? [y/n] ",
                      resolve
                    );
                  });
                  if (answer.toLowerCase() == "y") {
                    checkAdmin();
                  } else if (answer.toLowerCase() == "n") {
                    process.exit(0);
                  } else {
                    continueF();
                  }
                  rl.close(); // close the readline interface after the user's input is handled
                };
                continueF();
              } else {
                checkAdmin();
              }
            }, 1000);
          }
      });
  });
}

exec("id -u", (error, stdout, stderr) => {
  if (error) {
    console.log(
      "You are not running this application with elevated privileges!  Exiting..."
    );
    process.exit(0);
  } else {
    if (stdout.trim() === "0") {
      //console.log("You are running this application as a superuser.\n");
      //startProgressBar();
      return true;
    } else {
      console.log(
        "You are not running this application with elevated privileges!  Exiting..."
      );
      process.exit(0);
    }
    resolve();
  }
});

/* ---------------------------- */
/// license key checking stuff ///

const licenseFile = '/etc/projectsilica/license.key';
// const apiUrl = 'https://api.projectsilica.com:3031/client/';
const apiUrl = 'http://localhost:3031/client/';

function getLicenseKey() {
  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false // add this line
  });

  return new Promise(resolve => {
    rl2.question('Please enter your license key: ', key => {
      rl2.close();
      resolve(key);
    });
  });
}

let connectAttempts = 0;

async function askForKey() {
  const licenseKey = await getLicenseKey();
  //console.log(`License key: ${myLicenseKey}`);
  
  function sendLicenseKey() {
    connectAttempts++;
    request(apiUrl + licenseKey, function (error, response, body) {
      if (error) {
        console.log(`Error connecting to API server, trying again in 10 seconds...`);
        if (connectAttempts==3){
          console.log(`No response from server. Please check internet and try again. Exiting...`);
          process.exit(0)
        }
        setTimeout(sendLicenseKey, 10000); // retry after 10 seconds
        return;
      }
  
      const result = JSON.parse(body);
  
      if (result.message === 'License not found') {
        console.log(`License key ${licenseKey} is invalid.`);
        process.exit(0);
      } else if (result.message === 'Registered') {
        if (result.type==3) {
          console.log(`License key has expired. Please purchase a valid one from https://www.projectsilica.com/`);
          process.exit(0);
        } else if (result.type!=3) {
        console.log(`License key ${licenseKey} is registered as type: ${result.type}.`);
        // Create the directory if it doesn't exist
        const licenseDir = '/etc/projectsilica';
        if (!fs.existsSync(licenseDir)) {
          fs.mkdirSync(licenseDir, { recursive: true });
        }

        fs.writeFile(licenseFile, licenseKey, (err) => {
          if (err) {
            console.log(`${err}`);
            process.exit(1);
          }
          console.log(`${licenseKey} is valid and has been installed`);
          checkAndUpdateProjectSilica();
        });
      }
      } else {
        //console.log(`Unexpected response from API server: ${body}`);
        console.log(`Error connecting to API server, trying again in 10 seconds...`);
        if (connectAttempts==3){
          console.log(`No response from server. Please check internet and try again. Exiting...`);
          process.exit(0)
        }
        setTimeout(sendLicenseKey, 10000); // retry after 10 seconds
        return;
      }
    });
  }
  
  sendLicenseKey();
}

function workingTheKeys() {
// Read license key from file
fs.readFile(licenseFile, 'utf8', function(err, data) {
  if (err) {
    //console.log(`Error reading license file: ${err}`);
    //return;
    askForKey();
  } else {

    const licenseKey = data.trim();

    // Send license key to API server
    connectAttempts++;
    request(apiUrl + licenseKey, function (error, response, body) {
      if (error) {
        console.log(`Error connecting to API server, trying again in 10 seconds...`);
        if (connectAttempts==3){
          console.log(`No response from server. Please check internet and try again. Exiting...`);
          process.exit(0)
        }
        setTimeout(workingTheKeys, 10000); // retry after 10 seconds
        return;
      }
  
      const result = JSON.parse(body);
  
      if (result.message === 'License not found') {
        console.log(`License key ${licenseKey} is invalid.`);
      } else if (result.message === 'Registered') {
        console.log(`License key ${licenseKey} is registered.`);
        if (result.type==3) {
          console.log(`License key has expired. Please purchase a valid one from https://www.projectsilica.com/`);
          process.exit(0);
        } else if (result.type!=3){
          checkAndUpdateProjectSilica();
        }
      } else {
        console.log(`Unexpected response from API server: ${body}`);
      }
    });
  }
});
}

/* -------------------- */
/// end license key stuff

setTimeout(workingTheKeys, 3000);
//setTimeout(checkAndUpdateProjectSilica, 1000);

}

// Check for command-line arguments
const args = process.argv.slice(2); // Remove the first two default arguments: node and script path

if (args.includes('-l')) {
    licenseKey();
} else if (args.includes('-u')) {
    uninstallSilica();
} else if (args.includes('-v')) {
    verboseMode = 1;

    let vIndex = args.indexOf('-v'); // find the index of -v in args array
    if (vIndex !== -1 && vIndex < args.length - 1) { // check if -v is present and has an element after it
        let nextArg = args[vIndex + 1]; // get the element after -v
        let parsedArg = parseInt(nextArg); // try to parse it as a number
        if (!isNaN(parsedArg)) { // check if parsing succeeded and returned a valid number
            verboseSeconds = parsedArg; // assign it to verboseSeconds
        } else {
            verboseSeconds = 30; // assign 30 to verboseSeconds if parsing failed or returned NaN
        }
    }

    try {
      let stopSilica = execSync(`sudo systemctl stop projectsilica`, { stdio: 'pipe' }).toString();
      //console.log(`Command output: ${commandResponse}`);
    } catch (err) {
      //console.error("Failed to execute command");
    } finally {
      mainSilica();
    }
} else {
    mainSilica();
}


//  TODO:
//    - add a verbose arguement, because silica hangs on ctrl+c/ctrl+\