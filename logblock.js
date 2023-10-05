const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const exec = promisify(require('child_process').exec);

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

const ongoingAddRuleCalls = {};

const writeBan2 = (troublemaker) => {
  // Create the antidos directory if it doesn't exist
  const logDir = "/var/log/projectsilica";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Write to the IP.log file
  const logFile = path.join(logDir, "ban.log");
  fs.appendFileSync(logFile, `${troublemaker}\n${formattedDate}\n`);
};

const writeLog2 = (msg) => {
  // Create the antidos directory if it doesn't exist
  const logDir = "/var/log/projectsilica";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Write to the IP.log file
  const logFile = path.join(logDir, "log.log");
  fs.appendFileSync(logFile, `${msg}\n${formattedDate}\n\n`);
};

const ufw = {
addRule: async (ip) => {
    // Check if there is already an ongoing call to addRule for this IP address
    if (ongoingAddRuleCalls[ip]) {
      //console.log(`Skipping adding rule for IP ${ip} because there is already an ongoing call`);
      return;
    }

    // Set ongoingAddRuleCalls[ip] to true to indicate that there is an ongoing call to addRule for this IP address
    ongoingAddRuleCalls[ip] = true;
  if (await ufw.isBlocked(ip)) {
    //console.log(`Skipping adding existing rule for IP ${ip}`);
    // Remove the IP address from the ipCounts object
    delete ipCounts[ip];
    return;
  }

  const formattedIP = ip.includes(':') ? `[${ip}]` : ip; // Check if it's IPv6 and enclose in brackets if needed
  const { stdout, stderr } = await exec(`sudo ufw deny from ${formattedIP}`);
  //const { stdout, stderr } = await exec(`sudo ufw deny from ${ip}`);
  if (stderr) {
    //console.error(stderr);
    //throw new Error('Error occurred while adding rule to UFW');
  } else {
  console.log(`Blocking IP: ${ip} [logblock]`);
  writeLog2(`[logblock] Blocking IP: ${ip}`);
  writeBan2(ip);
  console.log(stdout.trim());
  }

  // Remove the IP address from the ipCounts object
  delete ipCounts[ip];

  // Add the IP address to the blockedIps object
  blockedIps[ip] = true;

/*
  setTimeout(async () => {
    console.log(`Unblocking IP ${ip}`);
    await ufw.deleteRule(ip);
    // Remove the IP address from the blockedIps object
    delete blockedIps[ip];
  }, blockTime * 1000);
*/

    // Set ongoingAddRuleCalls[ip] back to false at the end of the function
    delete ongoingAddRuleCalls[ip];
},
  deleteRule: async (ip) => {
    const { stdout, stderr } = await exec(`sudo ufw delete deny from ${ip}`);
    if (stderr) {
      //console.error(stderr);
      //throw new Error('Error occurred while deleting rule from UFW');
    }
    //console.log(stdout.trim());
  },
isBlocked: async (ip) => {
  try {
    const { stdout } = await exec(`sudo ufw status | grep ${ip}`);
    //return !!stdout.trim();
    if (stdout.toString().trim()!=''){return true;}
  } catch (err) {
    // Handle the case when the IP address is not found
    if (err.code === 1) {
      return false;
    } else {
      throw false;
    }
  }
}

};

async function processLineByLine() {
const vhostFolders = [];

// Check if /etc/apache2/sites-enabled exists
if (fs.existsSync('/etc/apache2/sites-enabled')) {
  // Find all vhost folders in /etc/apache2/sites-enabled
  const sitesEnabledVhostFolders = fs.readdirSync('/etc/apache2/sites-enabled')
    .map(file => `/etc/apache2/sites-enabled/${file}`)
    .filter(file => fs.lstatSync(file).isSymbolicLink())
    .map(file => fs.realpathSync(file));

  // Add vhost folders to the list
  vhostFolders.push(...sitesEnabledVhostFolders);
}

// Check if /etc/apache2/plesk.conf.d/vhosts exists
if (fs.existsSync('/etc/apache2/plesk.conf.d/vhosts')) {
  // Find all vhost files in /etc/apache2/plesk.conf.d/vhosts
  const pleskVhostFiles = fs.readdirSync('/etc/apache2/plesk.conf.d/vhosts')
    .map(file => `/etc/apache2/plesk.conf.d/vhosts/${file}`)
    .filter(file => fs.lstatSync(file).isSymbolicLink())
    .map(file => fs.realpathSync(file));

  // Add vhost files to the list
  vhostFolders.push(...pleskVhostFiles);
}

//console.log(`vhostFolders: ${vhostFolders}`);

// Find the access log file for each vhost
const accessLogFiles = vhostFolders.map(vhostFolder => {
  const configFile = vhostFolder;
  const configFileContent = fs.readFileSync(configFile, 'utf8');
  const match = configFileContent.match(/CustomLog\s+(\S+)/);
  if (match) {
    const logFile = match[1].replace('${APACHE_LOG_DIR}', '/var/log/apache2');

   // console.log(`found log location: ${logFile}`);

    return logFile;
  } else {
    return null;
  }
}).filter(file => file !== null);

// Add /var/log/apache2/access.log to the list of log files
if (fs.existsSync('/var/log/apache2/access.log')) {
accessLogFiles.push('/var/log/apache2/access.log');
}

//console.log(`accessLogFiles: ${accessLogFiles}`);

/*
//////
const configFile2 = '/etc/apache2/plesk.conf.d/vhosts/unlimitedweb.space.conf';
console.log('configFile2');
const configFileContent2 = fs.readFileSync(configFile2, 'utf8');
const match2 = configFileContent2.match(/CustomLog\s+(\S+)/);
if (match2) {
  const logFile2 = match2[1].replace('${APACHE_LOG_DIR}', '/var/log/apache2');

  console.log(`found log location: ${logFile2}`);
} else {
  console.log('Could not find log location');
}
//////
*/

  // Process each log file
  for (const logFile of accessLogFiles) {
    const fileStream = fs.createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      let matchIp = line.match(/^(\S+)/);
      let matchTime = line.match(/\[(\d+\/\w+\/\d+:\d+:\d+:\d+) /);
      if (matchIp && matchTime) {
        let ip = matchIp[1];
        let timeStr = matchTime[1];
        let timeObj = new Date(timeStr.replace(':', ' '));

        // Skip processing the IP address if it is already being processed
        if (blockedIps[ip]) {
          continue;
        }

        if (!ipCounts[ip]) {
          ipCounts[ip] = [];
        }

    // Filter out any timestamps that are older than 2 minutes
    ipCounts[ip] = ipCounts[ip].filter(time => (Date.now() - time) <= 120000);
        ipCounts[ip].push(timeObj.getTime());
      }
    }
  }

  // Block any IP that meets the threshold
  for (let ip in ipCounts) {
    let timesArraySorted=ipCounts[ip].sort();
    if (!(await ufw.isBlocked(ip))) {
      for(let i=0;i<timesArraySorted.length-threshold;i++){
        if(timesArraySorted[i+threshold]-timesArraySorted[i]<=timeLimit){
          //console.log(`Blocking IP ${ip} for ${blockTime} seconds`);
          await ufw.addRule(ip);
        }
      }
    }
  }
  console.log('Finished processing log files');
}


const ipCounts = {};
const blockedIps = {};
const threshold = 25; // Number of requests required to trigger blocking
const timeLimit = 1000; // Time limit in milliseconds between requests to trigger blocking
const blockTime = 3600; // Block time in seconds

/*
processLineByLine().catch(err => {
//console.error(err);
//process.exit(1);
});
*/

module.exports = { ufw, processLineByLine };