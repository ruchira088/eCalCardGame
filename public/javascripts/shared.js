var Card = function (suit, number) {
    this.suit = suit;
    this.number = number;

    this.getValue = function () {
        return number.toLowerCase() + "_" + this.suit.toLowerCase();
    };

    this.getPicture = function () {
        return "/images/deck/" + this.getValue() + ".png";
    };

    this.equals = function(card)
    {
      return card.suit.toLowerCase() == this.suit.toLowerCase() &&
          card.number.toLowerCase() == this.number.toLowerCase();
    }
};

var Constants =
{
    Login: "Login",
    LoggedInUser: "LoggedInUser",
    Information: "Info",
    DeckCardPickUp: "DeckCardPickUp",
    DrawnCardPickUp: "DrawnCardPickUp",
    CARD_SOURCE: {DECK: "cardDeck", DRAWN_PILE: "drawnPile"},
    CardPickUp: "CardPickUp",
    CardValue: "data-card-value",
    CardDrop: "CardDrop",
    UpdateDrawnCard: "UpdateDrawnCard",
    ActiveUser: "ActiveUser",
    VisibleDeckCard: "data-visible-deck-card",
    DeclareVictory: "DeclareVictory",
    FalseVictoryDeclaration: "FalseVictoryDeclaration",
    Victory: "Victory",
    VictoryAnnouncement: "VictoryAnnouncement",
    CardSource: "data-card-source",
    WaitForTurn: "WaitForTurn",
    Action: "action",
    PlayAgain: "playAgain",
    FalseVictoryAnnouncement: "FalseVictoryAnnouncement",
    ChatMessage: "ChatMessage",
    WEB_SOCKET_SERVER_PORT: 8080
};

if (typeof module != "undefined") {
    module.exports = {Constants: Constants, Card: Card};
}