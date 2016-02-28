var express = require('express');
var router = express.Router();
var requestDispatcher = require('../requestDispatcher');
var WebSocketServer = require('ws').Server;
var myObjects = require('../myObjects');

var Constants = require('../public/javascripts/shared').Constants;

const AUTO_WIN = false;

var Game = myObjects.CardGame;
var Card = myObjects.Card;
var wss = new WebSocketServer({port: Constants.WEB_SOCKET_SERVER_PORT});
var game;

// <gameId, CardGame>
var gameMaps = new Map();

var actionMap;

// <username, webSocket>
var onlinePlayers = new Map();

// <username, token>
var playerTokens = (function()
{
    var tokenMap = new Map();

    tokenMap.addPlayer = function(username)
    {
        tokenMap.set(username, createRandomString());
    };

    tokenMap.getCookie = function(username)
    {
        return [username, tokenMap.get(username)].join("&");
    };

    return tokenMap;
})();

// TODO Remove soon
var onlineUsers = [];
myObjects.extendArray(onlineUsers);


function GamePlayers()
{
    this.currentPosition = 0;
    this.players = [];
    this.pendingInvitationList = [];

    this.remove = function(username)
    {
        this.players = this.players.filter(function(player)
        {
            return player.username != username;
        });
    };

    this.getPlayers = function()
    {
      return this.players;
    };

    this.get = function(username)
    {
          return this.players.filter(function(player)
          {
              return player.username === username;
          }).pop();
    };

    this.addPlayers = function(players)
    {
        players.forEach(function(player)
        {
            this.addPlayer(player);
        }.bind(this));
    };

    this.setPendingInvitationList = function(playerList)
    {
        this.pendingInvitationList = playerList.slice();
    };

    this.removeFromPendingInvitationList = function(playerName)
    {
        this.pendingInvitationList = this.pendingInvitationList.filter(function(username)
        {
            return playerName != username;
        });
    };

    this.hasPendingInvitations = function()
    {
      return this.pendingInvitationList.length != 0;
    };

    this.putIfAbsent = function(username)
    {
      if(!this.get(username))
      {
          this.addPlayer(username);
          return true;
      }
        return false;
    };

    this.addPlayer = function(username)
    {
        this.players.push({username: username});
    };

    this.nextUser = function()
    {
        this.currentPosition++;

        if(this.currentPosition >= this.players.length)
        {
            this.currentPosition = 0;
        }

        return this.players[this.currentPosition].username;
    };

    this.getCurrentUser = function()
    {
        return this.players[this.currentPosition].username;
    };

}

function CardGame(game, id)
{
    this.game = game;
    this.id = id;
    this.players = (function()
    {
        var gamePlayers = new GamePlayers();
        gamePlayers.addPlayers(Array.from(game.getPlayers().keys()));

        return gamePlayers;
    })();

    //<username, webSocket>
    this.webSocketMap = new Map();
    this.locked = false;
}

wss.on("connection", function (ws)
{
    ws.sendValue = function (value) {
        ws.send(JSON.stringify(value));
    };

    ws.on("message", function (jsonMessage)
     {
         console.log(jsonMessage);

         var message = JSON.parse(jsonMessage);

         var identity = extractIdentity(message.cookies);
         message.value.username = identity[Constants.UserInformation].username;

         var cardGame = gameMaps.get(identity[Constants.GameId]);
         var action = getActionMap().get(message.type);
         action(cardGame, message.value, ws);

         //if(value.gameType === Constants.GameTypeNone)
         //{
         //    onlinePlayers.set(value.username, ws);
         //    sendToOthers({type: Constants.LoggedInUser, value: value.username}, ws, onlinePlayers.getWebSockets());
         //} else
         //{
         //    var cardGame = gameMaps[value.gameType].get(value.username);
         //
         //    var action = getActionMap().get(message.type);
         //
         //    action(cardGame, value, ws);
         //}


         //ws.username = message;
         //webSocketMap.set(ws.username, ws);
         //count++;
         //console.log(message);
         //ws.send(count.toString());
     });

    ws.on("close", function ()
    {
        if(ws.gameId)
        {
            gameMaps.get(ws.gameId).webSocketMap.delete(ws.username);
        } else
        {
            onlinePlayers.delete(ws.username);
            //broadcast({type: Constants.UserLoggedOut, value:ws.username}, onlinePlayers);
        }

        //webSocketMap.delete(ws.username);
        //onlineUsers.remove(ws.username);
    });

});

function extractIdentity(cookie)
{
    var identity = cookie.split(";").reduce(function(result, value)
    {
        var map = value.split("=");
        result[map[0].trim()] = decodeURIComponent(map[1]);

        return result;
    }, {});

    identity[Constants.UserInformation] = getUserInfoFromCookie(identity[Constants.UserInformation]);

    return identity;
}

function getActionMap()
{
    if (!actionMap)
    {
        var locked = false;

        var isCurrentUser = function (cardGame, username)
        {
            var currentUser = false;

            if(cardGame.players.getCurrentUser() === username)
            {
                currentUser = true;
            }

            return currentUser;
        };

        actionMap = new Map();

        actionMap.set(Constants.Login, function (cardGame, value, webSocket)
        {
            webSocket.username = value.username;
            webSocket.gameId = cardGame.id;
            cardGame.webSocketMap.set(webSocket.username, webSocket);
        });

        actionMap.set(Constants.HomeLogin, function(cardGame, value, webSocket)
        {
            webSocket.username = value.username;
            onlinePlayers.set(webSocket.username, webSocket);
            sendToOthers({type: Constants.LoggedInUser, value: webSocket.username}, webSocket, onlinePlayers);
        });

        actionMap.set(Constants.GameInvitation, function(cardGame, players, webSocket)
        {
            var allPlayers = players.slice();
            allPlayers.push(webSocket.username);

            var multiPlayerGame = new CardGame(new Game(allPlayers), createRandomString());
            multiPlayerGame.webSocketMap.set(webSocket.username, webSocket);
            multiPlayerGame.players.setPendingInvitationList(players);
            //multiPlayerGame.game.dealCards();
            gameMaps.set(multiPlayerGame.id, multiPlayerGame);
            var gameInitiator = webSocket.username;

            players.forEach(function(playerName)
            {
                // TODO - Remember to remove the socket from the online player map (but NOT the game map), when the player is in a game
                var webSocket = onlinePlayers.get(playerName);
                multiPlayerGame.webSocketMap.set(playerName, webSocket);
                webSocket.sendValue({type: Constants.GameInvitation, value:{gameId: multiPlayerGame.id,
                    initiator: gameInitiator, players: allPlayers}});
            });

        });

        actionMap.set(Constants.AcceptInvitation, function(cardGame, values, webSocket)
        {
            broadcast({type: Constants.AcceptInvitation, value: {username: webSocket.username, response: Constants.AcceptInvitation}}, cardGame.webSocketMap);
            cardGame.players.removeFromPendingInvitationList(webSocket.username);

            if(!cardGame.players.hasPendingInvitations())
            {
                cardGame.game.dealCards();
                broadcast({type: Constants.StartGame, value: {gameId: cardGame.id}}, cardGame.webSocketMap);
            }
        });

        actionMap.set(Constants.RejectInvitation, function(cardGame, value, webSocket)
        {

        });

        actionMap.set(Constants.CardPickUp, function (cardGame, value, webSocket)
        {
            if (isCurrentUser(cardGame, webSocket.username) && !cardGame.locked)
            {
                cardPickUp(cardGame, value.cardSource, webSocket);
            }
            else
            {
                webSocket.sendValue({type: Constants.WaitForTurn, value: cardGame.players.getCurrentUser()});
            }
        });

        //actionMap.set(Constants.CardPickUp, function (value, webSocket)
        //{
        //
        //    if (isCurrentUser(webSocket) && !locked)
        //    {
        //        cardPickUp(value, webSocket);
        //        locked = true;
        //    }
        //    else
        //    {
        //        var message = {type: Constants.WaitForTurn, value: onlineUsers.getCurrentUser()};
        //        webSocket.sendValue(message);
        //    }
        //
        //});

        actionMap.set(Constants.Information, function (value, webSocket)
        {
            console.log(value);
        });



        actionMap.set(Constants.DeclareVictory, function (cardGame, value, webSocket)
        {
            var playerCards = cardGame.game.getPlayer(webSocket.username).showCards();

            requestDispatcher.hasWinningCards({cards : playerCards}, function(outcome)
            {
                if(outcome.result)
                {
                    webSocket.sendValue({type: Constants.Victory, value: {winner: webSocket.username, cardSets: outcome.cardSets}});
                    sendToOthers({type: Constants.VictoryAnnouncement, value: {winner: webSocket.username, cardSets: outcome.cardSets}}, webSocket, cardGame.webSocketMap);
                } else
                {
                    webSocket.sendValue({type: Constants.FalseVictoryDeclaration, value: playerCards});
                    sendToOthers({type: Constants.FalseVictoryAnnouncement, value: {player: webSocket.username, cards: playerCards}}, webSocket, cardGame.webSocketMap);
                }

                console.log(JSON.stringify(outcome));
            });
        });

        //actionMap.set(Constants.DeclareVictory, function (value, webSocket)
        //{
        //    var playerCards = game.getPlayer(webSocket.username).showCards();
        //
        //     requestDispatcher.hasWinningCards({cards : playerCards}, function(outcome)
        //        {
        //            if(outcome.result)
        //            {
        //                webSocket.sendValue({type: Constants.Victory, value: {winner: webSocket.username, cardSets: outcome.cardSets}});
        //                sendToOthers({type: Constants.VictoryAnnouncement, value: {winner: webSocket.username, cardSets: outcome.cardSets}}, webSocket);
        //            } else
        //            {
        //
        //                webSocket.sendValue({type: Constants.FalseVictoryDeclaration, value: playerCards});
        //                sendToOthers({type: Constants.FalseVictoryAnnouncement, value: {player: webSocket.username, cards: playerCards}}, webSocket);
        //            }
        //
        //            console.log(JSON.stringify(outcome));
        //        });
        //});

        actionMap.set(Constants.ChatMessage, function(value, webSocket)
        {
            var message = {sender: webSocket.username, message: value};
            broadcast({type: Constants.ChatMessage, value: message});
        });

        actionMap.set(Constants.CardDrop, function (cardGame, value, webSocket)
        {
            var newDrawnCard = value[Constants.NewDrawnCard];
            var card = new Card(newDrawnCard.suit, newDrawnCard.number);

            var otherCard = value[Constants.OtherCard];

            cardGame.locked = false;
            //cardGame.game.getDrawnCards().putCardOnTop();

            if(otherCard)
            {
                var player = cardGame.game.getPlayer(webSocket.username);
                player.cards.push(new Card(otherCard.suit, otherCard.number));
                player.removeCard(card);

                if(AUTO_WIN)
                {
                    var playerCards = game.getPlayer(webSocket.username).showCards();
                    requestDispatcher.hasWinningCards({cards: playerCards}, function (outcome) {
                        if (outcome.result) {
                            webSocket.sendValue({
                                type: Constants.Victory,
                                value: {winner: webSocket.username, cardSets: outcome.cardSets}
                            });
                            sendToOthers({
                                type: Constants.VictoryAnnouncement,
                                value: {winner: webSocket.username, cardSets: outcome.cardSets}
                            }, webSocket);
                            //broadcast({type: Constants.VictoryAnnouncement, value: {winner: webSocket.username, cardSets: outcome.cardSets}});
                            // webSocket.sendValue({type: Constants.VictoryAnnouncement, value: {winner: webSocket.username, cardSets: outcome.cardSets}});
                        } else {
                            webSocket.sendValue({type: Constants.Information, value: "Still Going"});
                        }
                        console.log(JSON.stringify(outcome));
                    });
                }
            }
            //console.log("Removing card " + JSON.stringify(card, null, 2));
            //game.getPlayer(webSocket.username).removeCard(card);

            cardGame.players.nextUser();
            broadcast({type: Constants.UpdateDrawnCard, value: card}, cardGame.webSocketMap);
            broadcast({type: Constants.ActiveUser, value: cardGame.players.getCurrentUser()}, cardGame.webSocketMap);

            //if(cardGame.type === Constants.MultiPlayer)
            //{
            //    broadcast({type: Constants.ActiveUser, value: onlineUsers.getCurrentUser()}, cardGame.webSocketMap);
            //}
        });

        //actionMap.set(Constants.CardDrop, function (value, webSocket, message)
        //{
        //    var card = new Card(value.suit, value.number);
        //    var srcCard = message.srcCard;
        //    locked = false;
        //
        //    if(srcCard)
        //    {
        //        var player = game.getPlayer(webSocket.username);
        //        player.cards.push(new Card(srcCard.suit, srcCard.number));
        //        player.removeCard(card);
        //
        //        if(AUTO_WIN)
        //        {
        //            var playerCards = game.getPlayer(webSocket.username).showCards();
        //            requestDispatcher.hasWinningCards({cards: playerCards}, function (outcome) {
        //                if (outcome.result) {
        //                    webSocket.sendValue({
        //                        type: Constants.Victory,
        //                        value: {winner: webSocket.username, cardSets: outcome.cardSets}
        //                    });
        //                    sendToOthers({
        //                        type: Constants.VictoryAnnouncement,
        //                        value: {winner: webSocket.username, cardSets: outcome.cardSets}
        //                    }, webSocket);
        //                    //broadcast({type: Constants.VictoryAnnouncement, value: {winner: webSocket.username, cardSets: outcome.cardSets}});
        //                    // webSocket.sendValue({type: Constants.VictoryAnnouncement, value: {winner: webSocket.username, cardSets: outcome.cardSets}});
        //                } else {
        //                    webSocket.sendValue({type: Constants.Information, value: "Still Going"});
        //                }
        //                console.log(JSON.stringify(outcome));
        //            });
        //        }
        //    }
        //    //console.log("Removing card " + JSON.stringify(card, null, 2));
        //    //game.getPlayer(webSocket.username).removeCard(card);
        //
        //
        //    onlineUsers.nextUser();
        //    broadcast({type: Constants.UpdateDrawnCard, value: card});
        //    broadcast({type: Constants.ActiveUser, value: onlineUsers.getCurrentUser()});
        //});

    }

    return actionMap;
}

function sendToOthers(message, webSocket, webSocketMap)
{
    broadcast(message, Array.from(webSocketMap.values()).filter(function(ws)
    {
        return webSocket != ws;
    }));
}


function cardPickUp(cardGame, value, webSocket)
{
    var event;
    var card;

    if (value == Constants.CARD_SOURCE.DECK) {
        card = cardGame.game.getDeck().pickUpCard();
        event = Constants.DeckCardPickUp;
        cardGame.locked = true;
    }
    else {
        card = cardGame.game.getDrawnCards().getTopCard();
        event = Constants.DrawnCardPickUp;
    }
    //
    //console.log("Pushing card " + JSON.stringify(card, null, 2) + " to " + webSocket.username);
    //game.getPlayer(webSocket.username).cards.push(card);
    webSocket.sendValue({type: event, value: card});
}

//onlineUsers.remove = function(user)
//{
//    var index = onlineUsers.indexOf(user);
//
//    if(index >= 0)
//    {
//        onlineUsers.splice(index, 1);
//    }
//
//};
//
//onlineUsers.putIfAbsent = function (value)
//{
//    if (this.indexOf(value) === -1)
//    {
//        this.push(value);
//        onlineUsersInfo.set(value, {token: createRandomString()});
//        return true;
//    }
//
//    return false;
//};
//
//onlineUsers.currentPosition = 0;
//
//onlineUsers.nextUser = function ()
//{
//    this.currentPosition++;
//
//    if(this.length <= this.currentPosition)
//    {
//        this.currentPosition = 0;
//    }
//
//    return onlineUsers[this.currentPosition];
//};
//
//onlineUsers.getCurrentUser = function () {
//    return onlineUsers[this.currentPosition];
//};


router.get("/login", function (request, response)
{
    if(typeof request.cookies[Constants.UserInformation] != "undefined")
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

    response.render("game", {player: player, drawnCards: drawnCards, type: Constants.MultiPlayer, onlineUsers: onlineUsers});
});

function delegateRequest(request, response, success, fail)
{
    var userInfo = request.cookies[Constants.UserInformation];

    fail = fail || logoutUser;

    if(typeof userInfo != "undefined")
    {
        var clientSideUser = getUserInfoFromCookie(userInfo);

        var serverSidePlayerToken = playerTokens.get(clientSideUser.username);

        if(typeof serverSidePlayerToken != "undefined" && serverSidePlayerToken === clientSideUser.token)
        {
            success(clientSideUser.username, request, response);
        }
        else
        {
            fail(clientSideUser.username, request, response);
        }
    }
    else
    {
        fail(null, request, response);
    }
}

router.get("/home", function (request, response)
{
    delegateRequest(request, response, function success(username)
    {
        response.clearCookie(Constants.GameId);
        response.render("home", {user: username, onlineUsers: Array.from(onlinePlayers.keys()).sort(), game: game});
    });
});

router.get("/logout", function (request, response)
{
    delegateRequest(request, response, logoutUser)
});

function logoutUser(username, request, response)
{
    //onlineUsers.remove(username);
    //sendToOthers({type: Constants.UserLoggedOut, value: {loggedOutUser: username}}, webSocketMap.get(username));
    response.clearCookie(Constants.UserInformation);
    response.clearCookie(Constants.GameId);
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

router.get("/singlePlayer", function(request, response)
{
    delegateRequest(request, response, function(username, request, response)
    {
        var cardGame = gameMaps.get(request.cookies[Constants.GameId]);

        cardGame = cardGame || (function()
            {
                var singlePlayerGame = new CardGame(new Game([username]), createRandomString());
                singlePlayerGame.game.dealCards();
                gameMaps.set(singlePlayerGame.id, singlePlayerGame);
                response.cookie(Constants.GameId, singlePlayerGame.id);
                return singlePlayerGame;
            }
            )();

        response.render("game", {player: cardGame.game.getPlayer(username), type: Constants.SinglePlayer,
            drawnCards: cardGame.game.getDrawnCards(), onlineUsers: [username]});
    });
});

router.get("/multiPlayer", function(request, response)
{
    delegateRequest(request, response, function(username, request, response)
    {
            var game = gameMaps.get(request.cookies[Constants.GameId]).game;

            response.render("game", {
                player: game.getPlayer(username),
                type: Constants.MultiPlayer,
                drawnCards: game.getDrawnCards(),
                onlineUsers: Array.from(game.getPlayers().keys())
            });
    });
});

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

    function logUser(username)
    {
        playerTokens.addPlayer(username);
        response.cookie(Constants.UserInformation, playerTokens.getCookie(username));
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

function broadcast(message, webSocketMap) {
    webSocketMap.forEach(function (socket) {
        socket.sendValue(message);
    });
}

function createRandomString(strength)
{
    strength = strength || 2;

    var randomString = "";

    for(var i = 0; i < strength; i++)
    {
        randomString += Math.random().toString(36).slice(2);
    }

    return randomString;
}


module.exports = {
    router: router,
    playerTokens: playerTokens
};