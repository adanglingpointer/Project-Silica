const express = require('express');
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect("mongodb://localhost:27017/psapi", {useNewUrlParser: true});

const clientSchema = new mongoose.Schema({
  email: String,
  license: String,
  type: Number,
  licenseAdded: {
    type: Date,
    default: Date.now
  }
})

// 1 - free [30 day trial]
// 2 - paid
// 3 - expired

const Client = new mongoose.model("Client", clientSchema);

// the route used by the application
app.get("/client/:sLicense", (req, res) => {
  let sentLicense = req.params.sLicense;
  Client.findOne({license: sentLicense})
    .then(foundLicense => {
      if (!foundLicense) {
        res.json({message: "License not found"});
      } else {
        res.json({
          message: 'Registered',
          type: foundLicense.type
        });
      }
    })
    .catch(err => {
      res.json({message: "Error.", error: err});
    });
});

// update all 30 day free trial licenses to expired if they are 30+ days old
app.get('/purge', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await Client.updateMany(
      { type: 1, licenseAdded: { $lte: thirtyDaysAgo } },
      { type: 3 }
    );

    res.status(200).send('Licenses updated successfully');
  } catch (error) {
    console.error('Error updating licenses:', error);
    res.status(500).send('Error updating licenses');
  }
});

// a testing function that updates all records to have a date of 31 days ago,
// used to test purge, should not be used in production
/*
app.get('/testpurge', async (req, res) => {
  try {
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    await Client.updateMany(
      {},
      { licenseAdded: thirtyOneDaysAgo }
    );

    res.status(200).send('All license dates updated to 31 days ago');
  } catch (error) {
    console.error('Error updating license dates:', error);
    res.status(500).send('Error updating license dates');
  }
});
*/

// update all paid licenses to expired if they are 365+ days old
app.get('/purgepaid', async (req, res) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    await Client.updateMany(
      { type: 2, licenseAdded: { $lte: oneYearAgo } },
      { type: 3 }
    );

    res.status(200).send('Paid licenses updated successfully');
  } catch (error) {
    console.error('Error updating paid licenses:', error);
    res.status(500).send('Error updating paid licenses');
  }
});

// renew a license
app.get('/update/:sLicense', async (req, res) => {
  try {
    const { sLicense } = req.params;
    const currentDate = new Date();

    const result = await Client.updateOne(
      { license: sLicense },
      { licenseAdded: currentDate },
      { type: 2 }
    );

    if (result.nModified > 0) {
      res.status(200).send(`License date updated for ${sLicense}`);
    } else {
      res.status(404).send(`License not found for ${sLicense}`);
    }
  } catch (error) {
    console.error('Error updating license date:', error);
    res.status(500).send('Error updating license date');
  }
});


// add a client license
app.post("/addclient/:sLicense/:sEmail/:sType", (req, res) => {
  const newClient = new Client({
    email: req.params.sEmail,
    license: req.params.sLicense,
    type: req.params.sType
  });
  newClient.save()
    .then(() => {
      res.json({message: "License added."});
    })
    .catch(err => {
      res.json({message: "Error.", error: err});
    });
});

// delete a client license
app.post("/delete/:sLicense", (req, res) => {
  let sentLicense = req.params.sLicense;
  Client.deleteOne({license: sentLicense})
    .then(() => {
      res.json({message: "License deleted."});
    })
    .catch(err => {
      res.json({message: "Error.", error: err});
    });
});

app.listen(3032, () => {
  console.log('Server is listening on port 3032');
});
