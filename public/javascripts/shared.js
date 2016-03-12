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

const Constants =
{
    Login: "Login",
    LoggedInUser: "LoggedInUser",
    InGame: "InGame",
    InHomePage: "InHomePage",
    LoggedInGamer: "LoggedInGamer",
    LoggedOutGamer: "LoggedOutGamer",
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
    NewDrawnCard: "NewDrawnCard",
    OtherCard: "OtherCard",
    SinglePlayer: "SinglePlayer",
    MultiPlayer: "MultiPlayer",
    GameId: "GameId",
    OnlineUsers: "OnlineUsers",
    HomeLogin: "HomeLogin",
    RedirectToHomePage: "RedirectToHomePage",
    GameInvitation: "GameInvitation",
    RejectInvitation: "RejectInvitation",
    AcceptInvitation: "AcceptInvitation",
    ChatMessage: "ChatMessage",
    UserInformation: "UserInformation",
    GameTypeNone: "None",
    StartGame: "StartGame",
    OpponentCardPickup: "OpponentCardPickup",
    UserLoggedOut: "UserLoggedOut",
    SERVER_PORT: 3000
};

if (typeof module != "undefined")
{
    module.exports = {
        Constants: Constants,
        Card: Card
    };
}