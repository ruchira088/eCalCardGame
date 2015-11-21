var express = require('express');
var router = express.Router();
var database = require('../database');
var WebSocketServer = require('ws').Server;
var myObjects = require('../myObjects');

var Constants = require('../public/javascripts/shared').Constants;

var Game = myObjects.CardGame;
var Card = myObjects.Card;
var wss = new WebSocketServer({port: 8080});
var game;

var webSocketMap = new Map();
var actionMap;

var onlineUsers = [];
myObjects.extendArray(onlineUsers);

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
            console.log(card);
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

    webSocket.sendValue({type: event, value: card});
}

onlineUsers.putIfAbsent = function (value) {
    if (this.indexOf(value) === -1) {
        this.push(value);
    }
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


router.get("/login", function (request, response) {
    response.render("login");
});

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

router.post("/home", function (request, response)
{
    var next = function (success) {
        if (success)
        {
            var user = request.body.username;
            var verify = request.body.verify;

            onlineUsers.putIfAbsent(user);

            if(verify)
            {
                response.send("success");
            }
            else
            {
                broadcast({type: Constants.LoggedInUser, value: user});
                response.render("home", {user: user, onlineUsers: onlineUsers});
            }
        }
        else
        {
            response.send("fail");
        }
    };

    var user = {username: request.body.username, password: request.body.password};
    database.login(user, next);
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