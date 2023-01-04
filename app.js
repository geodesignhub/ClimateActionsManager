var express = require("express");
var req = require('request');
var async = require('async');
var bodyParser = require('body-parser');
var app = express();
var ejs = require('ejs');
app.set('view engine', 'ejs');
var axios = require('axios');
app.use(express.static(__dirname + '/views'));
app.use('/assets', express.static('static'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json())

// var baseurl = 'http://local.test:8000/api/v1/projects/';
var baseurl = 'https://www.geodesignhub.com/api/v1/projects/';

app.get('/', function (request, response) {

    if (request.query.apitoken && request.query.projectid) {

        var api_token = request.query.apitoken;
        var project_id = request.query.projectid;

        var cred = "Token " + api_token;

        var systems = baseurl + project_id + '/systems/';
        var diagrams = baseurl + project_id + '/diagrams/';        
        var tags = baseurl + project_id + '/tags/';

        var URLS = [systems, diagrams, tags];

        async.map(URLS, function (url, done) {
            req({
                url: url,
                headers: {
                    "Authorization": cred,
                    "Content-Type": "application/json"
                }
            }, function (err, response, body) {
                if (err || response.statusCode !== 200) {
                    if (response.statusCode == 429) {
                        return done(err || new Error("Too many requests from your profie"));
                    }
                    else {
                        return done(err || new Error());
                    }
                }
                return done(null, JSON.parse(body));
            });
        }, function (err, results) {

            if (err) return response.sendStatus(500);

            response.render('index', {
                "status": 1,
                "data": results,
                "api_token": api_token,
                "project_id": project_id
            });
        });

    } else {
        response.status(400).send('Not all parameters supplied.');

    };
});


app.listen(process.env.PORT || 5001);