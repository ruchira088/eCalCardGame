var express = require('express');
var router = express.Router();
var requestDispatcher = require('../requestDispatcher');
var WebSocketServer = require('ws').Server;
var myObjects = require('../myObjects');

var Constants = require('../public/javascripts/shared').Constants;

var Game = myObjects.CardGame;
var Card = myObjects.Card;
var wss = new WebSocketServer({port: 8080});
var game;

var webSocketMap = new Map();
var actionMap;

var onlineUsersInfo = new Map();
var onlineUsers = [];
myObjects.extendArray(onlineUsers);


onlineUsersInfo.getCookieInformation = function(user)
{
    var info = null;
    var value = this.get(user);

    if(typeof value != "undefined")
    {
        info = user + "&" + value.token;
    }

    return info;
};
wss.on("connection", function (ws)
{
    ws.sendValue = function (value) {
        ws.send(JSON.stringify(value));
    };

    ws.on("message", function (jsonMessage)
     {
         console.log(jsonMessage);
         var message = JSON.parse(jsonMessage);

         var action = getActionMap().get(message.type);
         action(message.value, ws);

         //ws.username = message;
         //webSocketMap.set(ws.username, ws);
         //count++;
         //console.log(message);
         //ws.send(count.toString());
     });

    ws.on("close", function () {
        webSocketMap.delete(ws.username);
        console.log(ws.username);
    });

});

function getActionMap()
{
    if (!actionMap)
    {
        var locked = false;

        var isCurrentUser = function (webSocket) {
            var currentUser = false;

            if (onlineUsers.getCurrentUser() === webSocket.username) {
                currentUser = true;
            }

            return currentUser;
        };

        actionMap = new Map();

        actionMap.set(Constants.Login, function (value, webSocket) {
            webSocket.username = value;
            webSocketMap.set(webSocket.username, webSocket);
        });

        actionMap.set(Constants.CardPickUp, function (value, webSocket)
        {
            if (isCurrentUser(webSocket) && !locked)
            {
                cardPickUp(value, webSocket);
                locked = true;
            }
            else
            {
                var message = {type: Constants.WaitForTurn, value: onlineUsers.getCurrentUser()};
                webSocket.sendValue(message);
            }


        });

        actionMap.set(Constants.Information, function (value, webSocket)
        {
            console.log(value);
        });

        actionMap.set(Constants.DeclareVictory, function (value, webSocket) {
            sendToOthers({
                type: Constants.VictoryAnnouncement,
                value: {winner: webSocket.username, markup: value}
            }, webSocket);
        });

        actionMap.set(Constants.CardDrop, function (value, webSocket)
        {
            var card = new Card(value.suit, value.number);
            locked = false;
            game.getPlayer(webSocket.username).removeCard(card);

            var playerCards = game.getPlayer(webSocket.username).showCards();
            requestDispatcher.hasWinningCards({cards : playerCards}, function(outcome)
            {
                if(outcome.result)
                {
                    webSocket.sendValue({type: Constants.Information, value: "You WON"});
                } else
                {
                    webSocket.sendValue({type: Constants.Information, value: "Still Going"});
                }
                console.log(JSON.stringify(outcome));
            });
            onlineUsers.nextUser();
            broadcast({type: Constants.UpdateDrawnCard, value: card});
            broadcast({type: Constants.ActiveUser, value: onlineUsers.getCurrentUser()});
        });

    }

    return actionMap;
}

function sendToOthers(message, webSocket) {
    webSocketMap.forEach(function (socket) {
        if (webSocket != socket) {
            socket.sendValue(message);
        }
    });
}


function cardPickUp(value, webSocket) {
    var event;
    var card;

    if (value == Constants.CARD_SOURCE.DECK) {
        card = game.getDeck().pickUpCard();
        event = Constants.DeckCardPickUp;
    }
    else {
        card = game.getDrawnCards().getTopCard();
        event = Constants.DrawnCardPickUp;
    }

    game.getPlayer(webSocket.username).cards.push(card);
    webSocket.sendValue({type: event, value: card});
}

onlineUsers.remove = function(user)
{
    var index = onlineUsers.indexOf(user);

    if(index >= 0)
    {
        onlineUsers.splice(index, 1);
    }

};

onlineUsers.putIfAbsent = function (value)
{
    if (this.indexOf(value) === -1)
    {
        this.push(value);
        onlineUsersInfo.set(value, {token: Math.random().toString(36).slice(2)});
        return true;
    }

    return false;
};

onlineUsers.currentPosition = 0;

onlineUsers.nextUser = function ()
{
    this.currentPosition++;

    if(this.length <= this.currentPosition)
    {
        this.currentPosition = 0;
    }

    return onlineUsers[this.currentPosition];
};

onlineUsers.getCurrentUser = function () {
    return onlineUsers[this.currentPosition];
};


router.get("/login", function (request, response)
{
    if(typeof request.cookies.userInfo != "undefined")
    {
        response.redirect("home");

        /*var user = getUserInfoFromCookie(userInfo);

        var info = onlineUsersInfo.get(user.username);

        if(typeof info != "undefined" && info.token === user.token)
        {
            response.render("home", {user: user.username, onlineUsers: onlineUsers, game: game});
        }
        else
        {
            response.render("login");
        }*/
    }
    else
    {
        response.render("login");
    }
});

function getUserInfoFromCookie(value)
{
    var values = value.split("&");

    return {username: values[0], token: values[1]};
}

router.post("/", function (request, response) {
    var user = request.body.user;

    if (!game)
    {
        game = new Game(onlineUsers);
        onlineUsers.randomise();
        game.dealCards();
    }

    var player = game.getPlayer(user);
    var drawnCards = game.getDrawnCards();

    response.render("game", {player: player, drawnCards: drawnCards, onlineUsers: onlineUsers});
});

function delegateRequest(request, response, success, fail)
{
    var userInfo = request.cookies.userInfo;

    if(typeof userInfo != "undefined")
    {
        var user = getUserInfoFromCookie(userInfo);

        var info = onlineUsersInfo.get(user.username);

        if(typeof info != "undefined" && info.token === user.token)
        {
            success(user.username, request, response);
        }
        else
        {
            fail(user.username, request, response);
        }
    }
    else
    {
        fail(user.username, request, response);
    }
}

router.get("/home", function (request, response)
{
    delegateRequest(request, response, function success(username)
    {
        response.render("home", {user: username, onlineUsers: onlineUsers, game: game});
    }, logoutUser);
});

router.get("/logout", function (request, response)
{
    delegateRequest(request, response, logoutUser, logoutUser)
});

function logoutUser(username, request, response)
{
    onlineUsers.remove(username);
    response.clearCookie("userInfo");
    response.redirect("login");
}

function facebookLogin(accessToken, callback)
{
    requestDispatcher.getFacebookInfo(accessToken, function(data)
    {
        console.log(data.id);
        var user = {facebookId : data.id};
        requestDispatcher.doUserExistByFacebookId(user, function(exist)
        {
            var username = data.name;
           if(!exist)
           {
               user.username = username;
               user.email = data.email;

               requestDispatcher.createUser(user, function(success)
               {
                   console.log(success);
                   if(success)
                   {
                       callback(username);
                   }
               });
           } else
           {
                console.log("User already exists.");
               callback(username);
           }
        });
    });
}

router.post("/home", function (request, response)
{
    var accessToken = request.body.token;

    var next = function (success) {
        if (success)
        {
            var user = request.body.username;
            var verify = request.body.verify;

            if(verify)
            {
                response.send("success");
            }
            else
            {
                logUser(user);
                response.redirect("home");
                //if(onlineUsers.putIfAbsent(user))
                //{
                //    broadcast({type: Constants.LoggedInUser, value: user});
                //}
                //
                //response.cookie("userInfo", onlineUsersInfo.getCookieInformation(user));
                //response.redirect("home");
                ////response.render("home", {user: user, onlineUsers: onlineUsers, game: game});
            }
        }
        else
        {
            response.send("fail");
        }
    };

    if(accessToken)
    {
        facebookLogin(accessToken, function(user)
        {
            logUser(user);
            response.send("success");
        });
    } else
    {
        var user = {username: request.body.username, password: request.body.password};
        requestDispatcher.loginUser(user, next);
    }

    function logUser(user)
    {
        if(onlineUsers.putIfAbsent(user))
        {
            broadcast({type: Constants.LoggedInUser, value: user});
        }

        response.cookie("userInfo", onlineUsersInfo.getCookieInformation(user));
    }
});

//router.post("/play", function (request, response)
//{
//    var pickedUpCard;
//
//    if(request.body.cardSource === "drawnPile")
//    {
//        pickedUpCard = game.getDrawnCards().getTopCard();
//
//        console.log("You picked up a card from the drawn pile");
//
//    }
//    else
//    {
//        pickedUpCard = game.getDeck().pickUpCard();
//
//        console.log("You picked up a card from the deck");
//    }
//
//    console.log(pickedUpCard);
//    response.send(pickedUpCard);
//});

function send(user, message) {
    var socket = webSocketMap.get(user);
    socket.sendValue(message);
}

function broadcast(message) {
    webSocketMap.forEach(function (socket) {
        socket.sendValue(message);
    });
}

module.exports = router;