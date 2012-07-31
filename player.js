module.exports = function Player (name) {
    this.name = name;
    
    // initial money cards
    this.money = [ 0, 0, 10, 10, 10, 10, 50 ];
    
    /**
     * Get the total amount of money for this player
     */
    this.getTotalMoney = function () {
        var sum = 0;
        for (var ix = 0; ix < this.money.length; ix++) {
            sum += this.money[ix];
        }
        return sum;
    };
    
    // initial cards
    this.cards = [];
    
    // ==== action interface
    /**
     * Make a bid for a card.
     * @param card {AnimalCard}
     * @param currentBid {Object} Object with { bid: {Number}, player: {Player} } or null if none
     * @param callback {Function} Invoke with bid (numeric) or falsy if pass
     */
    this.bidForCard = function (card, currentBid, callback) {
        // a card is presented with the question whether we want to bid for it
        var cb = function (v) {
            callback(v && Number(v));
        };
        
        var v = "Bid for " + card.name + " (" + card.value + ")";
        if (currentBid) {
            this.ask(v + ". Highest bid is " + currentBid.bid + " by " + currentBid.player.name, cb);
        }
        else {
            this.ask(v, cb);
        }
    };
    
    /**
     * Pass me the money!
     * @param amount {Number} The amount you have to pay
     * @param callback {Function} Invoke with an array with the money cards
     */
    this.giveMoney = function (amount, callback) {
        // so we can either ask a new question or just calculate it...
        // as little cards as possible
        var allCombis = powerset(this.money.filter(function (m) {
            return m > 0;
        }));
        
        var closest = null;
        var deltaClosest = 10000;
        
        var combis = allCombis.filter(function (c) {
            var sum = 0;
            for (var ix = 0; ix < c.length; ix++) {
                sum += c[ix];
            }
            
            var delta = sum - amount > 0 ? sum - amount : 10000;
            if (delta < deltaClosest) {
                closest = c;
                deltaClosest = delta;
            }
            
            return sum === amount;
        });
        
        var choseArr = combis.sort(function (c1, c2) {
            return c1.length > c2.length ? 1 : (c1.length === c2.length ? 0 : -1);
        });
        
        callback(choseArr.length ? choseArr[0] : closest);
    };
    
    /**
     * Another buyer bought a card you drew, do you want to buy it yourself?
     * @param card {Card} The drawn card
     * @param highestBid {Object} Object with { bid: {Number}, player: {Player} }
     * @param callback {Function} Invoke with false or true
     */
    this.wantToBuyYourself = function (card, highestBid, callback) {
        var self = this;
        
        var question =
            highestBid.player.name + " bought a " + card.name + " from you for " + highestBid.bid + ". " +
            "Do you want to buy it instead?";
            
        this.ask(question, function (answer) {
            // dont wanna buy?
            if (!answer || answer.toLowerCase() === "n") {
                return callback(false);
            }
            
            // otherwise say YES
            callback(true);
        });
    };
    
    this.ask = function (question, callback) {
        var stdin = process.stdin,
            stdout = process.stdout;
        
        stdin.resume();
        stdout.write("Player " + this.name + " (" + this.getTotalMoney() + ") " + question + ": ");
        
        stdin.once('data', function(data) {
            data = data.toString().trim();
        
            callback(data);
        });
    };
    
    function powerset(ary) {
        var ps = [[]];
        for (var i=0; i < ary.length; i++) {
            for (var j = 0, len = ps.length; j < len; j++) {
                ps.push(ps[j].concat(ary[i]));
            }
        }
        return ps;
    }
};