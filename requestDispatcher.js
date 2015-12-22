var http = require("http");
var https = require("https");

var HOSTNAME = "localhost";
var PORT = 8081;
var DB_COLLECTION_PATH = "/Rest_DB/database/CardGame/users";

function checkUsernameAvailability(user, callback)
{
    var options =
    {
        hostname: HOSTNAME,
        port: PORT,
        path: DB_COLLECTION_PATH + "?username=" + user.username
    };

    sendRequest(options, null, function(response)
    {
        callback(response.count == 0);
    });
}

function doUserExistByFacebookId(user, callback)
{
    var options =
    {
        hostname: HOSTNAME,
        port: PORT,
        path: DB_COLLECTION_PATH + "?facebookId=" + user.facebookId
    };

    sendRequest(options, null, function(response)
    {
        callback(response.count == 1);
    });
}

function loginUser(user, callback)
{
    var options =
    {
        hostname: HOSTNAME,
        port: PORT,
        path: DB_COLLECTION_PATH + "?username=" + user.username + "&password=" + user.password
    };

    sendRequest(options, null, function(response)
    {
        callback(response.count == 1);
    });
}

function createUser(user, callback)
{
    var options =
    {
        hostname: HOSTNAME,
        port: PORT,
        path: DB_COLLECTION_PATH,
        method: "POST"
    };

    sendRequest(options, user, function(data)
    {
        callback(data.result == "success");
    });
}

function getFacebookInfo(accessToken, callback)
{
    var options =
    {
        hostname: "graph.facebook.com",
        path: "/v2.5/me?access_token=" + accessToken + "&fields=id,name,email,picture"
    };

    sendRequest(options, null, function(data)
    {
        callback(data);
    }, https);
}

function sendRequest(options, submitData, callback, protocol)
{
    if(!protocol)
    {
        protocol = http;
    }

    var request = protocol.request(options, function(response)
    {
        console.log(response.statusCode);
        response.setEncoding('utf8');
        response.on("data", function(data)
        {
            var jsonData = JSON.parse(data);
            console.log(jsonData);
            callback(jsonData);
        });
    });

    if(submitData)
    {
        request.write(JSON.stringify(submitData));
    }

    request.end();
}

//checkUsernameAvailability({username: "b"}, function(data)
//{
//    console.log(data);
//});

//createUser(
//    {
//        name: "Hello",
//        game: "World"
//    }, function(result)
//    {
//        console.log(result);
//    });



module.exports =
{
    checkUsernameAvailability : checkUsernameAvailability,
    loginUser : loginUser,
    createUser : createUser,
    getFacebookInfo : getFacebookInfo,
    doUserExistByFacebookId : doUserExistByFacebookId
};