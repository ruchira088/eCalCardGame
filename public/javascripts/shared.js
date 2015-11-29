var Card = function (suit, number) {
    this.suit = suit;
    this.number = number;

    this.getValue = function () {
        return number.toLowerCase() + "_" + this.suit.toLowerCase();
    };

    this.getPicture = function () {
        return "/images/deck/" + this.getValue() + ".png";
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
    VictoryAnnouncement: "VictoryAnnouncement",
    CardSource: "data-card-source",
    WaitForTurn: "WaitForTurn",
};

if (typeof module != "undefined") {
    module.exports = {Constants: Constants, Card: Card};
}