var express = require('express');
var router = express.Router();
var requestDispatcher = require('../requestDispatcher');
var myObjects = require('../myObjects');

var Shared = require('../public/javascripts/shared');
var Constants = Shared.Constants;

const socketIO = require("socket.io")(require('../server.js'));

const AUTO_WIN = false;

var Game = myObjects.CardGame;
var Card = myObjects.Card;

// <gameId, CardGame>
var gameMaps = new Map();

var actionMap;

// <username, webSocket>
var onlinePlayers = new Map();

// <username, webSocket>
var gamePlayers = new Map();

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


function GamePlayers(players)
{
    this.currentPosition = 0;
    this.players = [];
    this.pendingInvitationList = [];

    this.remove = function(username)
    {
        var index = null;
        this.players = this.players.filter(function(player)
        {
            var different = player.username != username;

            if(!different)
            {
                index = this.players.indexOf(player);
            }

            return different;
        }.bind(this));

        if(this.currentPosition == index)
        {
            this.currentPosition++;
        }

        if(this.currentPosition >= this.players.length)
        {
            this.currentPosition = 0;
        }
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

    this.addPlayers(players);
}

function CardGame(game, id)
{
    this.game = game;
    this.id = id;
    this.players = new GamePlayers(Array.from(game.getPlayers().keys()));

    this.removePlayer = function(player)
    {
        this.players.remove(player);
        // this.game.removePlayer(player);

        if(this.players.players.length != 0)
        {
            const currentUser = this.players.getCurrentUser();

            broadcast({
                type: Constants.ActiveUser,
                value: currentUser
            }, this.webSocketMap);
        }
    };

    //<username, webSocket>
    this.webSocketMap = new Map();
    this.locked = false;
}

socketIO.on("connection", (socket) =>
{
    socket.sendValue = (message) =>
    {
        socket.emit("message", JSON.stringify(message));
    };

    socket.on("message", (jsonMessage) =>
    {
        console.log(jsonMessage);

        var message = JSON.parse(jsonMessage);

        var identity = extractIdentity(message.cookies);
        message.value.username = identity[Constants.UserInformation].username;

        var cardGame = gameMaps.get(identity[Constants.GameId]);
        var action = getActionMap().get(message.type);
        action(cardGame, message.value, socket, identity);
    });

    socket.on("disconnect", () =>
    {
        const username = socket.username;

        if(socket.gameId)
        {
            const game = gameMaps.get(socket.gameId);
            const webSocketMap = game.webSocketMap;
            webSocketMap.delete(username);
            
            var type = Constants.AbandonedPlayer;
            
            if(socket.outcome == Constants.LOST)
            {
                type = Constants.OpponentLose;
            }
            else if(socket.outcome == Constants.WON)
            {
                type = Constants.OpponentWin;
            }
            
            broadcast({type: type, value: username}, webSocketMap);
            
            game.removePlayer(username);

            gamePlayers.delete(username);
        } else
        {
            onlinePlayers.delete(username);
        }

        broadcast({type: Constants.UserLoggedOut, value:username}, onlinePlayers);
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

        actionMap.set(Constants.Login, function (cardGame, value, webSocket, identity)
        {
            if(cardGame) {
                webSocket.username = value.username;
                webSocket.gameId = cardGame.id;
                cardGame.webSocketMap.set(webSocket.username, webSocket);
                gamePlayers.set(webSocket.username, webSocket);
                broadcast({
                    type: Constants.LoggedInUser,
                    value: {
                        playerName: webSocket.username,
                        status: Constants.InGame
                    }
                }, onlinePlayers);
            }
            else
            {
                console.log("The cardGame with ID: " + identity[Constants.GameId] + " does NOT exist.");
                webSocket.sendValue({
                    type: Constants.RedirectToHomePage,
                    value: {}
                });
            }
        });

        actionMap.set(Constants.HomeLogin, function(cardGame, value, webSocket)
        {
            webSocket.username = value.username;
            broadcast({
                type: Constants.LoggedInUser,
                value: {
                    playerName: webSocket.username,
                    status: Constants.InHomePage
                }
            }, onlinePlayers);
            onlinePlayers.set(webSocket.username, webSocket);
            webSocket.sendValue({
                type: Constants.OnlineUsers,
                value: {
                    onlineUsers: getOnlineUsersAndPlayers()
                }
            });
        });

        actionMap.set(Constants.GameInvitation, function(cardGame, players, webSocket)
        {
            var allPlayers = players.slice();
            allPlayers.push(webSocket.username);

            var multiPlayerGame = new CardGame(new Game(allPlayers.reduce((players, player) =>
            {
                if(parseInt(Math.random()*2))
                {
                    players.push(player);
                } else
                {
                    players = [player].concat(players);
                }

                return players;
            }, [])), createRandomString());

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

                if(cardGame.webSocketMap.size > 1)
                {
                    webSocket.sendValue({type: Constants.RemoveGameIdCookie, value:{}});

                    webSocket.outcome = outcome.result ? Constants.WON : Constants.LOST;
                    webSocket.disconnect();
                }
                console.log(JSON.stringify(outcome));
            });
        });

        actionMap.set(Constants.ChatMessage, function(cardGame, value, webSocket)
        {
            var message = {sender: webSocket.username, message: value};
            broadcast({type: Constants.ChatMessage, value: message}, cardGame ? cardGame.webSocketMap: onlinePlayers);
        });

        actionMap.set(Constants.CardDrop, function (cardGame, value, webSocket)
        {
            var newDrawnCard = value[Constants.NewDrawnCard];
            var card = new Card(newDrawnCard.suit, newDrawnCard.number);

            var otherCardValue = value[Constants.OtherCard];

            cardGame.locked = false;

            if(otherCardValue)
            {
                const otherCard = new Card(otherCardValue.suit, otherCardValue.number);

                if(otherCard.equals(cardGame.game.getDrawnCards().showTopCard()))
                {
                    sendToOthers({
                        type: Constants.OpponentCardPickup,
                        value: {
                            player: webSocket.username,
                            source: Constants.DrawnCardPickUp
                        }
                    }, webSocket, cardGame.webSocketMap);
                }

                var player = cardGame.game.getPlayer(webSocket.username);
                player.cards.push(otherCard);
                player.removeCard(card);

                if(AUTO_WIN)
                {
                    var playerCards = player.showCards();
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

            cardGame.game.getDrawnCards().putCardOnTop(card);
            cardGame.players.nextUser();
            broadcast({type: Constants.UpdateDrawnCard, value: card}, cardGame.webSocketMap);
            broadcast({type: Constants.ActiveUser, value: cardGame.players.getCurrentUser()}, cardGame.webSocketMap);

            //if(cardGame.type === Constants.MultiPlayer)
            //{
            //    broadcast({type: Constants.ActiveUser, value: onlineUsers.getCurrentUser()}, cardGame.webSocketMap);
            //}
        });

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

    sendToOthers({
        type: Constants.OpponentCardPickup,
        value: {
            player: webSocket.username,
            source: value
        }
    }, webSocket, cardGame.webSocketMap);

    webSocket.sendValue({
        type: event,
        value: card
    });
}


router.get("/login", function (request, response)
{
    if(typeof request.cookies[Constants.UserInformation] != "undefined")
    {
        response.redirect("home");
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
            fail(null, request, response);
        }
    }
    else
    {
        fail(null, request, response);
    }
}

router.get("/home", function (request, response)
{
    delegateRequest(request, response, function success(username) {
        response.clearCookie(Constants.GameId);
        response.render("home", {
            user: username,
            players: getOnlineUsersAndPlayers().filter(function (player) {
                return player.playerName != username;
            })
        });
    });
});

function getOnlineUsersAndPlayers()
{
    var players = Array.from(onlinePlayers.keys()).map(function(player)
    {
        return {
            playerName: player,
            status: Constants.InHomePage
        };
    });

    return Array.from(gamePlayers.keys()).reduce(function(players, player)
    {
        players.push({
            playerName: player,
            status: Constants.InGame
        });

        return players;
    }, players).sort(function(player_1, player_2)
    {
        return player_1.playerName.localeCompare(player_2.playerName);
    });
}

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
            const gameId = request.cookies[Constants.GameId];

            if(!gameId)
            {
                gotoHomepage();
                return;
            }

            var game = gameMaps.get(gameId).game;

            if(!game)
            {
                gotoHomepage();
                return;
            }

            response.render("game", {
                player: game.getPlayer(username),
                type: Constants.MultiPlayer,
                drawnCards: game.getDrawnCards(),
                onlineUsers: Array.from(game.getPlayers().keys())
            });

            function gotoHomepage()
            {
                response.redirect("/home");
            }
    });
});

router.post("/home", function (request, response)
{
    var accessToken = request.body.token;

    function fail()
    {
        response.send("fail");
    }

    if(accessToken)
    {
        facebookLogin(accessToken, function(user)
        {
            logUser(user);
            response.redirect("home");
        });
    } else
    {
        var username = request.body.username;

        requestDispatcher.getUserCredentials(username, function(userCredentials)
        {
            if(userCredentials)
            {
                require("./new_user").encryptPassword(request.body.password, userCredentials.salt, function(err, key)
                {
                    if (userCredentials.password === key)
                    {
                        if(request.body.verify)
                        {
                            response.send("success");
                        }
                        else
                        {
                            logUser(username);
                            response.redirect("home");
                        }
                    }
                    else
                    {
                        fail();
                    }
                });
            } else
            {
                fail();
            }
        });
    }

    function logUser(username)
    {
        playerTokens.addPlayer(username);
        response.cookie(Constants.UserInformation, playerTokens.getCookie(username));
    }
});


function broadcast(message, webSocketMap) {
    webSocketMap.forEach(function (socket) {
        socket.sendValue(message, function(err)
        {
            if(err)
            {
                console.log("Unable to send via web socket: '" + JSON.stringify(message) + "' to " + socket.username);
            }
        });
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
    router: function(app)
    {},
    playerTokens: playerTokens
};


module.exports = {
    router: router,
    playerTokens: playerTokens
};