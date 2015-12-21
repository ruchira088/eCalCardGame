var http = require("http");

var HOSTNAME = "localhost";
var PORT = 8081;

function checkUsernameAvailability(user, callback)
{
    var options =
    {
        hostname: HOSTNAME,
        port: PORT,
        path: "/Rest_DB/database/CardGame/users?username=" + user.username
    };

    sendRequest(options, function(response)
    {
        callback(response.count == 0);
    });
}

function loginUser(user, callback)
{
    var options =
    {
        hostname: HOSTNAME,
        port: PORT,
        path: "/Rest_DB/database/CardGame/users?username=" + user.username + "&password=" + user.password
    };

    sendRequest(options, function(response)
    {
        callback(response.count == 1);
    });
}


function sendRequest(options, callback)
{
    var request = http.request(options, function(response)
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

    request.end();
}

//checkUsernameAvailability("ab", function(data)
//{
//    console.log(data);
//    console.log(data.count == 0);
//});

module.exports =
{
    checkUsernameAvailability : checkUsernameAvailability,
    loginUser : loginUser
};