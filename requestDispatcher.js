var http = require("http");
var https = require("https");

var HOSTNAME = "localhost";
var PORT = 8080;
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

function hasWinningCards(cards, callback)
{
    var options = {
        hostname: "localhost",
        port: 3001,
        method: "POST",
        headers: {"Content-Type": "application/json"}
    };

    sendRequest(options, cards, callback);
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

function getUserCredentials(username, callback)
{
    var options =
    {
        hostname: HOSTNAME,
        port: PORT,
        path: DB_COLLECTION_PATH + "?username=" + username
    };

    sendRequest(options, null, function(response)
    {
        var user = response.results.pop();

        if(user)
        {
            callback({
                username: user.username,
                password: user.password,
                salt: user.salt
            });
        } else
        {
            callback(null);
        }
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
        callback(data);
    });
}

function getFacebookInfo(accessToken, callback)
{
    var options =
    {
        hostname: "graph.facebook.com",
        path: "/v2.5/me?access_token=" + accessToken + "&fields=id,name,email,picture"
    };

    sendRequest(options, null, callback, https);
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
            //console.log(data);
            var jsonData = JSON.parse(data);
            callback(jsonData);
        });
    });

    if(submitData)
    {
        request.write(JSON.stringify(submitData));
    }

    request.end();
}

module.exports =
{
    checkUsernameAvailability : checkUsernameAvailability,
    loginUser : loginUser,
    getUserCredentials: getUserCredentials,
    createUser : createUser,
    getFacebookInfo : getFacebookInfo,
    hasWinningCards : hasWinningCards,
    doUserExistByFacebookId : doUserExistByFacebookId
};
