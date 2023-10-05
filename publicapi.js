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

app.listen(3031, () => {
  console.log('Server is listening on port 3031');
});
