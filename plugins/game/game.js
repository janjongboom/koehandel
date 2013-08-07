module.exports = function (options, imports, register) {

var Player = require("./player");
var deck = require("./animal-cards").generateDeck();

// donkey brings more money in the game
var donkeyMoney = [ 50, 100, 200, 500 ];

var playingPlayers = {
    "no1": imports["player.console"],
    "no2": imports["player.websocket"],
    //"no3": imports["player.console"]
};

// from now it's turn based
// let's create some players first
// based on the 'playingPlayers' thingy
var players = [];

/**
 * A shim that the implementations get.
 * Because they aren't allowed to have access to the actual player object
 */
function createPlayerShim(player) {
    return {
        name: player.name,
        getCards: function () {
            return player.cards.slice();
        },
        getMoneyCards: function () {
            return player.money.slice();
        },
        getTotalMoney: function () {
            return player.getTotalMoney();
        }
    };
}

Object.keys(playingPlayers).forEach(function (name) {
    var player = new Player(name);
    // create a shim
    var impl = new playingPlayers[name](createPlayerShim(player));
    player.impl = impl;
    
    console.log('Created player', name);
    player.impl.init(function() {
        console.log('Initialized player', name, players.length, '/', Object.keys(playingPlayers).length);
        players.push(player);
        
        if (players.length === Object.keys(playingPlayers).length) {
            // start the game with the first turn
            turn();
        }
    });
});

// player 0 can start
var activePlayerIx = -1;

// a turn was made
var turn = function () {
    var next = function () {
        turn();
    };
    
    // get the new active player
    activePlayerIx = ++activePlayerIx % players.length;
    var activePlayer = players[activePlayerIx];
    
    // report the number of cards left in the deck and the public animal cards
    // each player has
    emitAll("report", {
        cardsLeftInDeck: deck.length,
        cardsPerPlayer: players.map(function (p) {
            return {
                name: p.name,
                cards: p.cards.slice()
            }
        }),
        activePlayer: activePlayer.name
    });
    
    // 2 actions are possible:
    // - deal with other player
    // - draw a card
    var dealWithOtherPlayer = function (next) {
        // so user should make an offer to another player
        // -card @todo how to deal with multiple cards?
        // -targetPlayer the other player that you challenge
        // -bid array of cards     
        var allPlayersExceptActiveOne = players.filter(function (p) {
            return p !== activePlayer;
        });
        
        activePlayer.impl.makeOfferToOtherPlayer(allPlayersExceptActiveOne, function (card, targetPlayer, activePlayerBid) {
            // if both players have 2 cards, then we play for two...
            // @todo verify that the other player has a card as well
            var stackOfCards = createDealStack(card, activePlayer, targetPlayer);
            
            var offer = {
                from: activePlayer.name,
                to: targetPlayer.name,
                card: {
                    name: card.name,
                    value: card.value
                },
                numberOfCards: stackOfCards.length,
                offer: activePlayerBid.length
            };
            
            emitAll("auction-offer", offer);
            
            // target player has to respond...
            targetPlayer.impl.respondToOffer(card, activePlayer, activePlayerBid.length, function (targetPlayerBid) {
                emitAll("auction-response", {
                    originalOffer: offer,
                    player: targetPlayer.name,
                    response: targetPlayerBid.length
                });
                
                // move money around
                moveMoney(activePlayer, targetPlayer, activePlayerBid, function () {
                    // and other way around
                    moveMoney(targetPlayer, activePlayer, targetPlayerBid, function () {
                        // if the targetPlayerBid exceeds activePlayerBid then the target player wins
                        // if equal, retry @todo implement
                        if (cardSum(targetPlayerBid) > cardSum(activePlayerBid)) {
                            // give cards
                            targetPlayer.cards = targetPlayer.cards.concat(stackOfCards);
                            emitAll("auction-win", {
                                player: targetPlayer.name,
                                card: {
                                    name: card.name,
                                    value: card.value
                                },
                                numberOfCards: stackOfCards.length
                            });
                        }
                        else {
                            // @todo retry if equal
                            activePlayer.cards = activePlayer.cards.concat(stackOfCards);
                            emitAll("auction-win", {
                                player: activePlayer.name,
                                card: {
                                    name: card.name,
                                    value: card.value
                                },
                                numberOfCards: stackOfCards.length
                            });
                        }
                        
                        next();
                    });
                });
            });
        });
    };
    
    // grab the next card from the deck
    var drawCard = function (next) {
        var card = deck.splice(0, 1)[0];
        
        emitAll("draw", {
            card: {
                name: card.name,
                value: card.value
            },
            activePlayer: activePlayer.name
        });
        
        // if a donkey was drawn more money will be added to the game
        if (card.value === 500) {
            // grab it from the donkey money array
            var newMoney = donkeyMoney.splice(0, 1)[0];
            // add it to all users
            players.forEach(function (p) {
                p.money.push(newMoney);
            });
            
            emitAll("donkey", {
                amount: newMoney
            });
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
            userInTurn.impl.bidForCard(card, currentBid, function (v) {
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
                emitAll("buy", {
                    player: activePlayer.name,
                    card: card,
                    amount: 0
                });
                
                // the player who drew this card gets it for free
                activePlayer.cards.push(card);
                return next();
            }
            
            // Dont expose non-public info
            var safeActiveBid = {
                player: {
                    name: activeBid.player.name,
                    cards: activeBid.player.cards
                },
                bid: activeBid.bid
            };
            
            // otherwise ask the active player if he wants it for the current bid
            activePlayer.impl.wantToBuyYourself(card, safeActiveBid, function (resp) {
                emitAll("buy", {
                    player: (resp ? activePlayer : activeBid.player).name,
                    card: card,
                    amount: activeBid.bid
                });
                
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
    
    // you can draw cards when there are cards in the deck
    var canDraw = deck.length > 0; 
    // you can deal when you have non-complete sets
    var canDeal = activePlayer.completeCardSets().length * 4 !== activePlayer.cards.length;
    
    // ask question if both possible
    if (canDraw && canDeal) {
        // draw or deal, respond with '1' to draw or '2' to deal...
        activePlayer.impl.drawOrDeal(function (res) {
            if (res === 1) {
                drawCard(next);
            }
            else {
                dealWithOtherPlayer(next);
            }
        });
    }
    else if (canDraw && !canDeal) {
        // can only draw -> draw
        drawCard(next);
    }
    else if (!canDraw && canDeal) {
        // can only deal? -> deal
        dealWithOtherPlayer(next);
    }
    else {
        // cant do anything
        // see if other players can play...
        if (players.filter(function (p) {
                return p.completeCardSets().length * 4 !== p.cards.length;
            }).length === 0) {
            
            // no-one can play?
            emitAll("done", {
                ranking: players.sort(function (p1, p2) {
                        return p1.getTotalPoints() > p2.getTotalPoints() ? -1 : 
                            (p1.getTotalPoints() === p2.getTotalPoints() ? 0 : 1);
                    }).map(function (p, ix) {
                        return {
                            number: ix+1,
                            player: p.name,
                            points: p.getTotalPoints()
                        };
                    })
            });
        }
        else {
            // otherwise go to next player
            next();
        }
    }
};

/**
 * Move money from one player to another
 * @param sourcePlayer {Player} Player that gives money
 * @param targetPlayer {Player} Player that receives
 * @param amount {Number} The amount of money
 * @param callback {Function} Invoke when done
 */
function moveMoney (sourcePlayer, targetPlayer, amount, callback) {
    var moveCards = function (cards) {
        emitAll("movemoney", {
            from: sourcePlayer.name,
            to: targetPlayer.name,
            numberOfCards: cards.length
        });
        
        cards.forEach(function (c) {
            // then remove it from his stash
            sourcePlayer.money.splice(sourcePlayer.money.indexOf(c), 1);
            // and push it to the next playah
            targetPlayer.money.push(c);
        });
        
        callback();
    };
    
    // amount can be either an array of cards, or an amount...
    if (amount instanceof Array) {
        moveCards(amount);
    }
    else {
        // sourceplayer has to give some cards from his stash
        sourcePlayer.impl.giveMoney(amount, moveCards);
    }
}

/**
 * Get sum from an array of cards
 */
function cardSum (cards) {
    var sum = 0;
    for (var ix = 0; ix < cards.length; ix++) {
        sum += cards[ix];
    }
    return sum;
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

/**
 * Create a stack of cards if dealing, so f.e. if playing for a Cow and both have 2,
 * a stack of 4 cows will be created.
 * @param card {Card} The card to play for
 * @param playerA {Player} One of the players
 * @param playerB {Player} Other one
 * @return [{Card}] Cards that we'll deal for
 */
function createDealStack (card, playerA, playerB) {
    // get number of cards for A
    var cntA = playerA.cards.filter(function (c) {
        return c.value === card.value;
    }).length;
    
    // get number of cards from B
    var cntB = playerB.cards.filter(function (c) {
        return c.value === card.value;
    }).length;
    
    // number of cards is the lower bound
    var noOfCards = cntA > cntB ? cntB : cntA;
    
    // so let's splice these thinga's
    var stack = [];
    for (var ix = 0; ix < noOfCards; ix++) {
        // grab card from A and B and push to stack
        stack.push(playerA.cards.splice(playerA.cards.indexOf(card), 1)[0]);
        stack.push(playerB.cards.splice(playerB.cards.indexOf(card), 1)[0]);
    }
    
    return stack;
}

/**
 * Emit an event to all players
 */
function emitAll(evName, data) {
    players.forEach(function (p) {
        p.impl.emit(evName, data);
    });
    
    // report info for the console
    switch (evName) {
        case "report":
            console.log("\n=====PUBLIC DECKS=====");
            console.log(data.cardsLeftInDeck, "cards left in deck");
            // show the public deck of each player
            players.forEach(function (player) {
                console.log(getPlayerDeckAsString(player));
            });
            console.log("======================");
            break;
            
        case "draw":
            console.log("Player", data.activePlayer, "drew", data.card.name, "(" + data.card.value + ")");
            break;
        
        case "donkey":
            console.log("Donkey was drawn, all players were awarded", data.amount);
            break;
            
        case "buy":
            if (data.amount === 0) {
                console.log(data.player, "received a", data.card.name, "for free");
            }
            else {
                console.log("Player", data.player,
                    "bought a", data.card.name, "for", data.amount);
            }
            break;
        
        case "done":
            console.log("WE'RE DONE!");
            console.log(data.ranking.map(function (p) {
                return p.number + ". " + p.player + " " + p.points;
            }).join("\n"));
            break;
        
        case "movemoney":
            console.log("Cards given from", data.from, "to", data.to, data.numberOfCards);
            break;
        
        case "auction-offer":
            console.log("Player", data.from, "wants to buy", data.numberOfCards, data.card.name,
                "from", data.to, "for", data.offer, "cards");
                break;
        
        case "auction-response":
            console.log("Player", data.player, "responded with", data.response, "cards");
            break;
            
        case "auction-win":
            console.log(data.player, "bought", data.nunumberOfCards, data.card.name);
            break;
    }
}

};