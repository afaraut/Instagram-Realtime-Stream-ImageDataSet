var express = require("express");
var app = express();
var settings = require('./settings');
var Instagram = require('instagram-node-lib');
var fs = require('fs');
var https = require("https");
var querystring = require('querystring');
var url = require('url');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

app.listen(settings.appPort);

Instagram.set('client_id', settings.CLIENT_ID);
Instagram.set('client_secret', settings.CLIENT_SECRET);
Instagram.set('redirect_uri', settings.basePath);

app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.use(express.static(__dirname + '/views'));
    app.use(express.errorHandler());
});

Instagram.tags.unsubscribe_all({
    complete: function(data, pagination) {
        if (data == null){
            console.log("unsubscribe_all OK");
        }
    }
});

//Instagram.subscriptions.unsubscribe({ id: '***' });

Instagram.subscriptions.subscribe({
    object: 'tag',
    object_id: 'nice',
    aspect: 'media',
    callback_url: settings.basePath + '/callback',
    type: 'subscription',
    id: settings.CLIENT_ID
});

app.get('/callback', function(req, res){
    Instagram.subscriptions.handshake(req, res);
    console.log("subscription OK");
});

app.post('/callback', function(req, res) {
    var data = req.body;
    console.log("-- POST REQUEST RECEIVED --");
    if (data == undefined) {
        res.writeHead(200);
        res.end();
        return console.log("NO DATA AVAILABLE");
    }
    data.forEach(function(tag) {
        var req = https.get({
            host: 'api.instagram.com',
            path: '/v1/tags/' + tag.object_id + '/media/recent' +
            '?' + querystring.stringify({client_id: settings.CLIENT_ID}),
        }, function(res){
            var raw = "";
            res.on('data', function(chunk) {
                raw += chunk;
            });
            // When the whole body has arrived, it has to be a valid JSON, with data,
            res.on('end', function() {
                for (var i=0; i<40; i++) {
                    var info = JSON.parse(raw).data[i];
                    if (info != undefined){
                        var imgUrl = info["images"].standard_resolution.url;
                        var path = settings.mainDirectory + settings.directory + info.id + '.' + (url.parse(imgUrl).pathname).split('.').pop();
                        if (!fs.existsSync(path)) {
                            
                            // Warning ! Be careful !! 
                            // It's important to save the picure, because in the next loop iteration, I will check if the file is already saved
                            // If It's not, I will save it and store the data into the database
                            // If It's already saved, I have nothing to do !
                            saveJSONfile(info.id, info); // Save json info file
                            download_file_httpget(imgUrl, path); // Download the image
                            if (info.type == "video"){
                                var urlVideo = info["videos"].standard_resolution.url;
                                var pathVideo = settings.mainDirectory + settings.directory + info.id + '.' + urlVideo.split('.').pop();
                                download_file_httpget(urlVideo, pathVideo); // Download the video if exists
                            }
    
                            (function(jsonTweet) {
                                MongoClient.connect(settings.mongoDBURL, info, function(err, db) {
                                    //assert.equal(null, err);
                                    if (err) {
                                        console.log('Unable to connect to the mongoDB server. Error:', err);
                                    } else {
                                        insertDocument(db, settings.collection_MongoDB, jsonTweet, function() {
                                            db.close();
                                        });
                                    }
                                });
                            })(info);
                        }
                    }
                }
            });
        });
        req.on('error', function(error) {
            console.log("******************************");
            console.error(error);
            console.log("******************************");
        });
    });
    
    res.writeHead(200);
    res.end();
});


var saveJSONfile = function (id,  content) {
    fs.writeFile(settings.mainDirectory + settings.directory + id + '.json', JSON.stringify(content, null, 4), function (err) {
        if (err) return console.log(err);
    });
};

var download_file_httpget = function(file_url, filename) {
    var options = {
        host: url.parse(file_url).host,
        port: 443,
        path: url.parse(file_url).pathname
    };

    var file = fs.createWriteStream(filename);
    var req = https.get(options, function(res) {
        res.on('data', function(data) {
            file.write(data);
        }).on('end', function() {
            file.end();
            console.log(filename + ' downloaded');
        });
    });
    req.on('error', function(error) {
        console.log("******************************");
        console.error(error);
        console.log("******************************");
    });    
};

var insertDocument = function(db, collection, document, callback) {
    db.collection(String(collection)).insertOne( document, function(err, result) {
        assert.equal(err, null);
        console.log('Document inserted into the collection named %s', String(collection));
        callback(result);
    });
};

console.log("Listening on port " + settings.appPort);
