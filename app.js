var express = require("express");

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

var baseurl = process.env.GEODESIGNHUB_API_URL || 'http://local.test:8000/api/v1/projects/';

function getSystemName(systemsResponse, diagramSystem) {
    let systemName = '';
    for (let index = 0; index < systemsResponse.length; index++) {
        const currentSystem = systemsResponse[index];
        if (currentSystem.id == diagramSystem) {
            systemName = currentSystem.name;
            break;
        }
    }
    return systemName
}

function getDiagramTags(tagsResponse, diagramID) {
    let relevantTags = [];
    let existingTagsStr = ''
    for (let index = 0; index < tagsResponse.length; index++) {
        const currentTagDetails = tagsResponse[index];
        const currentDiagrams = currentTagDetails['diagrams'];
        if (currentDiagrams.includes(diagramID)) {
            relevantTags.push(currentTagDetails['tag']);
        }
    }
    return relevantTags;
}


app.post('/bulk_update', function (request, response) {

    const map_state_str = request.body.map_state_ele;

    model_state = JSON.parse(map_state_str);


    var api_token = request.body.api_token;
    var project_id = request.body.project_id;
    var cteam_id = request.body.cteam_id;
    var synthesis_id = request.body.synthesis_id;

    var cred = "Token " + api_token;
    let axios_instance = axios.create({
        headers: {
            'Content-Type': 'application/json',
            'Authorization': cred
        }
    });
    const all_diagram_urls = [];

    for (let diagram_id in model_state) {
        let tags_str = model_state[diagram_id];
        let selected_tags = tags_str.split('|');
        selected_tags = selected_tags.filter(n => n);     
        if (selected_tags.length > 0)   {
        const tags_url = baseurl + project_id + '/diagrams/' + diagram_id + '/tags/';
        const request_post = axios_instance.post(tags_url, selected_tags);
        all_diagram_urls.push(request_post);
        }
    }

    axios.all(all_diagram_urls).then(axios.spread((...responses) => {
        response.render('success', {
            "api_token": api_token,
            "project_id": project_id,
            "cteam_id": cteam_id,
            "synthesis_id": synthesis_id
        });
    })).catch(errors => {
        // react on errors.
        if (errors) return response.sendStatus(500);
    });
});


// app.post('/update', function (request, response) {

//     const raw_diagrams = request.body.diagrams;
//     const selected_tags = request.body.tags;
//     let selected_diagrams = []
//     const is_array = Array.isArray(raw_diagrams);
//     if (is_array) {
//         console.log("Input diagrams OK..");
//         selected_diagrams = raw_diagrams;
//     } else {
//         selected_diagrams = [raw_diagrams];
//     }
//     var api_token = request.body.api_token;
//     var project_id = request.body.project_id;

//     var cred = "Token " + api_token;
//     let axios_instance = axios.create({
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': cred
//         }
//     });
//     const all_diagram_urls = [];

//     for (let d = 0; d < selected_diagrams.length; d++) {
//         const diagram_id = selected_diagrams[d];
//         const tags_url = baseurl + project_id + '/diagrams/' + diagram_id + '/tags/';
//         const request_post = axios_instance.post(tags_url, [selected_tags]);
//         all_diagram_urls.push(request_post);
//     }

//     axios.all(all_diagram_urls).then(axios.spread((...responses) => {
//         response.render('success', {
//             "api_token": api_token,
//             "project_id": project_id
//         });
//     })).catch(errors => {
//         // react on errors.
//         if (errors) return response.sendStatus(500);
//     });
// });

app.get('/', function (request, response) {
    response.status(200).send('This is not the endpoint you are looking for.');
});
app.get('/design', async function (request, response) {
    const { apitoken, projectid, cteamid, synthesisid } = request.query;

    if (!apitoken || !projectid) {
        return response.status(400).send('Not all parameters supplied.');
    }

    const api_token = apitoken;
    const project_id = projectid;
    const cteam_id = cteamid;
    const synthesis_id = synthesisid;

    const cred = "Token " + api_token;

    const endpoints = {
        systems: `${baseurl}${project_id}/systems/`,
        design: `${baseurl}${project_id}/cteams/${cteam_id}/${synthesis_id}/`,
        tags: `${baseurl}${project_id}/tags/`,
        tagCredits: `${baseurl}${project_id}/tags/attribution/`,
        bounds: `${baseurl}${project_id}/bounds/`
    };

    const axios_instance = axios.create({
        headers: {
            'Content-Type': 'application/json',
            'Authorization': cred
        }
    });

    try {
        const [
            systemsRes,
            designRes,
            tagsRes,
            boundsRes,
            tagCreditsRes
        ] = await Promise.all([
            axios_instance.get(endpoints.systems),
            axios_instance.get(endpoints.design),
            axios_instance.get(endpoints.tags),
            axios_instance.get(endpoints.bounds),
            axios_instance.get(endpoints.tagCredits)
        ]);

        response.render('design', {
            status: 1,
            data: [systemsRes.data, designRes.data, tagsRes.data],
            api_token,
            project_id,
            tagCredits: tagCreditsRes.data,
            cteam_id,
            synthesis_id,
            bounds: boundsRes.data.bounds
        });
    } catch (error) {
        response.sendStatus(500);
    }
});

app.listen(process.env.PORT || 5001);