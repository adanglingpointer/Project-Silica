const fs = require('fs');
const request = require('request');
const readline = require('readline');

const licenseFile = '/etc/projectsilica/license.key';
// const apiUrl = 'https://api.projectsilica.com:3031/client/';
const apiUrl = 'http://localhost:3031/client/';

function getLicenseKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('Please enter your license key: ', key => {
      rl.close();
      resolve(key);
    });
  });
}

async function askForKey() {
  let connectAttempts = 0;
  const licenseKey = await getLicenseKey();
  //console.log(`License key: ${myLicenseKey}`);
  
  function sendLicenseKey() {
    connectAttempts++;
    request(apiUrl + licenseKey, function (error, response, body) {
      if (error) {
        console.log(`Error connecting to API server, trying again in 10 seconds...`);
        if (connectAttempts==3){process.exit(0)}
        setTimeout(sendLicenseKey, 10000); // retry after 10 seconds
        return;
      }
  
      const result = JSON.parse(body);
  
      if (result.message === 'License not found') {
        console.log(`License key ${licenseKey} is not valid.`);
        process.exit(0);
      } else if (result.message === 'Registered') {
        if (result.type==3) {
          console.log(`License key has expired. Please purchase a valid one from https://www.projectsilica.com/`);
          process.exit(0);
        }
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
        });

      } else {
        console.log(`Unexpected response from API server: ${body}`);
      }
    });
  }
  
  sendLicenseKey();
}


// Read license key from file
fs.readFile(licenseFile, 'utf8', function(err, data) {
  if (err) {
    //console.log(`Error reading license file: ${err}`);
    //return;
    askForKey();
  } else {

    const licenseKey = data.trim();

    // Send license key to API server
    request(apiUrl + licenseKey, function (error, response, body) {
      if (error) {
        console.log(`Error connecting to API server: ${error}`);
        return;
      }
  
      const result = JSON.parse(body);
  
      if (result.message === 'License not found') {
        console.log(`License key ${licenseKey} is not registered.`);
      } else if (result.message === 'Registered') {
        console.log(`License key ${licenseKey} is registered.`);
      } else {
        console.log(`Unexpected response from API server: ${body}`);
      }
    });
  }
});




