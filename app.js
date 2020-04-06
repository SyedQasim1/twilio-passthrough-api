const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const axios =  require('axios');
const { Parser } = require("json2csv");

require('dotenv').config();

const Twilio = require('twilio');
const client = new Twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('server is working')
});

app.post('/twilio/sms/bulk', upload.single('myCsv'), function (req, res) {
    var csvData=[];
    const toBindingObject = [];
    fs.createReadStream(`uploads/${req.file.filename}`)
        .pipe(csv())
        .on('data', (row) => {
            csvData.push(row);
        })
        .on('end', () => {
            csvData.forEach(data => {
                const addressData = data.PHON_NUMB_1? data.PHON_NUMB_1: data['35'];
                toBindingObject.push(JSON.stringify({ binding_type: 'sms', address: addressData}))
            });
            client.notify.services(process.env.NOTIFY_SERVICE_ID).notifications
                .create({
                    toBinding: toBindingObject,
                    body: req.body.textBody,
                }).then(notification => {
                console.log(notification);
                res.send(notification);
            }).catch(error => { res.status(error.status).send(error) });

        });
});

function csvJSON(csv) {
    const lines = csv.split('\n')
    const result = []
    const headers = lines[0].split(',')

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i])
            continue
        const obj = {}
        const currentline = lines[i].split(',')

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j]
        }
        result.push(obj)
    }
    return result
}

async function validatePhoneNumber(number) {
    const result = await axios.get(`http://apilayer.net/api/validate?access_key=${process.env.ACCESS_KEY}&number=${number}`)
    return result.data;
}
app.post('/numbers/verifications/bulk', upload.single('mobileNumbersCsv'), async function (req, res) {
    var csvData=[];
    let queryObject = [];
    const myMap = fs.readFileSync(`uploads/${req.file.filename}`, 'utf8');
    const data = csvJSON(myMap)
    for (const item of data) {
        if (item.PHONE_NUMBER) {
            queryObject.push(await validatePhoneNumber(item.PHONE_NUMBER));
        }
    }
    let fields = ["valid", "number", "local_format", "international_format", "country_prefix",
        "country_code", "country_name", "location", "carrier", "line_type"]
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(queryObject);
    fs.writeFileSync(`OutputCSV/csv-${new Date()}`, csv, 'utf-8');
    res.send({success: true});
});

app.listen(3001, function () {
    console.log('Example app listening on port 3001!');
});
