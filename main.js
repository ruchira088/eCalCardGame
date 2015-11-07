//var myObjects = require('./myObjects');
////
////var cardGame = new myObjects.CardGame();
////
////var richie = new myObjects.Player("Richie");
////var tony = new myObjects.Player("Tony");
////var dien = new myObjects.Player("Dien");
////
////cardGame.addPlayers(richie, tony, dien);
////
////cardGame.dealCards();
////
////console.log(richie);
//
//var game = function (playerNames)
//{
//    var cardGame = new myObjects.CardGame();
//
//    myObjects.extendArray(playerNames);
//
//    for (var i = 0; i < playerNames.length; i++)
//    {
//        cardGame.addPlayers(new myObjects.Player(playerNames[i]));
//    }
//
//    this.getPlayer = function (playerName) {
//        return cardGame.getPlayer(playerName);
//    };
//
//    this.dealCards = function () {
//        cardGame.dealCards();
//    };
//
//    this.getDeck = function () {
//        return cardGame.getDeck();
//    };
//
//    this.getDrawnCards = function () {
//        return cardGame.getDrawnCards();
//    }
//
//};
//
////var myGame = new game(["richie", "tony", "dien"]);
////myGame.dealCards();
////console.log(myGame.getPlayer("richie"));
//
//module.exports = {
//    Game: game
//};