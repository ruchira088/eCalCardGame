var Suits = {Hearts: "Hearts", Clubs: "Clubs", Diamonds: "Diamonds", Spades: "Spades"};
var Numbers = {Two: "2", Three: "3", Four: "4", Five: "5", Six: "6", Seven: "7", Eight: "8", Nine: "9", Ten: "10", Jack: "Jack", Queen: "Queen", King: "King", Ace: "Ace"};

var Card = require('./public/javascripts/shared').Card;

function extendArray(array)
{
    array.randomise = function()
    {
        for(var i = 0; i < this.length; i++)
        {
            var index = Math.floor(Math.random() * this.length);

            var tempValue = this[i];
            this[i] = this[index];
            this[index] = tempValue;
        }
    }

}

//var Card = function (suit, number) {
//    this.suit = suit;
//    this.number = number;
//
//    this.getValue = function () {
//        return number.toLowerCase() + "_" + this.suit.toLowerCase();
//    };
//
//    this.getPicture = function()
//    {
//        return "/images/deck/" + this.getValue() + ".png";
//    }
//
//};

var Deck = function ()
{
    var cards = [];
    extendArray(cards);

    this.addCard = function (card) {
        cards.push(card);
    };

    function createDeck()
    {
        for(var suit in Suits)
        {
            for(var num in Numbers)
            {
                cards.push(new Card(Suits[suit], Numbers[num]));
            }
        }
    }

    this.shuffle = function (level) {
        if (!level) {
            level = 5;
        }

        for (var n = 0; n < level; n++)
        {
            cards.randomise();
            //for (var i = 0; i < cards.length; i++) {
            //    var index = Math.floor(Math.random() * cards.length);
            //
            //    var tempCard = cards[i];
            //    cards[i] = cards[index];
            //    cards[index] = tempCard;
            //}
        }
    };

    this.pickUpCard = function () {
        return cards.pop();
    };

    createDeck();

};

var Player = function (name) {
    this.name = name;

    this.cards = [];

    this.removeCard = function(removalCard)
    {
      this.cards = this.cards.filter(function(card)
      {
          return !removalCard.equals(card);
      });
    };

    this.showCards = function()
    {
        return this.cards.map(function(card)
        {
            return card.getValue();
        });
    };

    this.fetchCard = function (deck) {
        this.cards.push(deck.pickUpCard());
    }
};

var DrawnCards = function ()
{
    var cards = [];

    this.putCardOnTop = function (card) {
        cards.push(card);
    };

    this.getTopCard = function () {
        return cards.pop();
    };

    this.showTopCard = function () {

        var card = {};
        var index = cards.length - 1;

        if(index >= 0)
        {
            card = cards[cards.length - 1];
        }

        return card;
    }
};

var CardGame = function (playerNames) {
    var NUMBER_OF_CARDS = 9;
    var deck = new Deck();
    var drawnCards = new DrawnCards();
    var players = new Map();

    this.addPlayer = function (player)
    {
        players.set(player.name, player);
    };

    this.getDeck = function () {
        return deck;
    };

    this.dealCards = function ()
    {
        deck.shuffle();

        players.forEach(
            function (player)
            {
                for (var i = 0; i < NUMBER_OF_CARDS; i++) {
                    player.fetchCard(deck);
                }
            });

        drawnCards.putCardOnTop(deck.pickUpCard());
    };

    this.getPlayer = function (playerName) {
        return players.get(playerName);
    };

    this.getDrawnCards = function () {
        return drawnCards;
    };

    this.getPlayers = function()
    {
        return players;
    };

    playerNames.forEach(function(name)
    {
        this.addPlayer(new Player(name));
    }.bind(this));
    //for (var i = 0; i < playerNames.length; i++) {
    //    this.addPlayer(new Player(playerNames[i]));
    //}
};

//var List = function()
//{
//    var listArray = [];
//
//
//}

module.exports = {
    CardGame : CardGame,
    Player : Player,
    Card: Card,
    extendArray : extendArray
};


//var cardGame = new CardGame();
//
//deck.shuffle();
//richie.fetchCard(deck);
//console.log(richie);
