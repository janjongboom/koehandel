var Player = require("./player");
var deck = require("./animal-cards").generateDeck();

// donkey brings more money in the game
var donkeyMoney = [ 50, 100, 200, 500 ];

// from now it's turn based
// let's create some players first
var players = [
    new Player("no1"),
    new Player("no2"),
    new Player("no3")
];

// player 0 can start
var activePlayerIx = -1;

// a turn was made
var turn = function () {
    var next = function () {
        turn();
    };
    
    console.log("\n=====PUBLIC DECKS=====");
    console.log(deck.length+"", "cards left in deck");
    // show the public deck of each player
    players.forEach(function (player) {
        console.log(getPlayerDeckAsString(player));
    });
    console.log("======================");
    
    // get the new active player
    activePlayerIx = ++activePlayerIx % players.length;
    var activePlayer = players[activePlayerIx];
    
    // 2 actions are possible:
    // - deal with other player
    // - draw a card
    var dealWithOtherPlayer = function (next) {
        next();
    };
    
    // grab the next card from the deck
    var drawCard = function (next) {
        var card = deck.splice(0, 1)[0];
        
        console.log("Player", activePlayer.name, "drew", card.name, "(" + card.value + ")");
        
        // if a donkey was drawn more money will be added to the game
        if (card.value === 500) {
            // grab it from the donkey money array
            var newMoney = donkeyMoney.splice(0, 1)[0];
            // add it to all users
            players.forEach(function (p) {
                p.money.push(newMoney);
            });
            
            console.log(card.name, "was drawn, all players were awarded", newMoney);
        }
        
        // start a bidding round
        var currentBid = null;
        var passed = [];
        
        // the iterator in turns always starts at the current player
        // so the player next to the current one has the choice
        var roundIx = activePlayerIx;
        var nextOne = function (callback) {            
            // grab the next player
            roundIx = (roundIx + 1) % players.length;
            
            var userInTurn = players[roundIx];
            
            // user already passed? then cant play either
            if (passed.indexOf(userInTurn) > -1) {
                return nextOne(callback);
            }
            
            if (userInTurn === activePlayer) {
                // if all other players are passed, this player buys for '0'
                if (passed.length === players.length - 1) {
                    return callback(currentBid);
                }
                // otherwise just go to next one
                return nextOne(callback);
            }
            
            // back to the player with the last bid
            if (currentBid && currentBid.player === userInTurn) {
                // invoke the callback!
                return callback(currentBid);
            }
            
            // otherwise ask the player if he wants to buy something
            userInTurn.bidForCard(card, currentBid, function (v) {
                if (v) {
                    currentBid = {
                        player: userInTurn,
                        bid: v
                    };
                }
                // no offer? then the user has passed and we won't bother him again
                else {
                    passed.push(userInTurn);
                }
                nextOne(callback);
            });
        };
        
        // nextOne is the iterator among all players
        nextOne(function (activeBid) {
            // no bid?
            if (!activeBid) {
                console.log(activePlayer.name, "received a", card.name, "for free");
                // the player who drew this card gets it for free
                activePlayer.cards.push(card);
                return next();
            }
            
            // otherwise ask the active player if he wants it for the current bid
            activePlayer.wantToBuyYourself(card, activeBid, function (resp) {
                console.log("Player", (resp ? activePlayer : activeBid.player).name, 
                    "bought a", card.name, "for", activeBid.bid);
                
                // if resp is true then the activePlayer wants to buy it...
                if (resp) {
                    activePlayer.cards.push(card);
                    moveMoney(activePlayer, activeBid.player, activeBid.bid, next);
                }
                else {
                    // otherwise money from bidding player -> active playah
                    activeBid.player.cards.push(card);
                    moveMoney(activeBid.player, activePlayer, activeBid.bid, next);
                }
            });
        });
    };
    
    // @todo, ask the player if he wants to draw a card or deal with another player
    drawCard(next);
};

// start the game with the first turn
turn();

/**
 * Move money from one player to another
 * @param sourcePlayer {Player} Player that gives money
 * @param targetPlayer {Player} Player that receives
 * @param amount {Number} The amount of money
 * @param callback {Function} Invoke when done
 */
function moveMoney (sourcePlayer, targetPlayer, amount, callback) {
    // sourceplayer has to give some cards from his stash
    sourcePlayer.giveMoney(amount, function (cards) {
        console.log("Cards given from", sourcePlayer.name, "to", targetPlayer.name, cards);
        
        cards.forEach(function (c) {
            // then remove it from his stash
            sourcePlayer.money.splice(sourcePlayer.money.indexOf(c), 1);
            // and push it to the next playah
            targetPlayer.money.push(c);
        });
        
        // and done...
        callback();
    });
}

/**
 * Format the public deck of the players for display purposes
 */
function getPlayerDeckAsString (player) {
    // sort hi-lo on value
    player.cards.sort(function (c1, c2) {
        return c1.value > c2.value ? -1 : (c1.value === c2.value ? 0 : 1);
    });
    
    // create a grouped object so we can show it in a nice fashionable fashion
    var grouped = {};
    player.cards.forEach(function (c) {
        if (grouped[c.name]) {
            grouped[c.name].cnt++;
        }
        else {
            grouped[c.name] = {
                cnt: 1,
                card: c
            };
        }
    });
    
    return ["Player", player.name, Object.keys(grouped).map(function (c) {
        var v = grouped[c];
        return v.card.name + " (" + v.card.value + ") " + "(" + v.cnt + "x)";
    }).join(", ")].join(" ");
}

