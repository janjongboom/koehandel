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
    
    this.getTotalPoints = function () {
        var total = 0;
        
        var sets = this.completeCardSets();
        sets.forEach(function (v) {
            total += (v * sets.length);
        });
        
        return total;
    };
    
    // initial cards
    this.cards = [];
    
    // get the number of complete sets you have
    this.completeCardSets = function () {
        var cardsMap = {}
        
        for (var ix = 0; ix < this.cards.length; ix++) {
            var value = this.cards[ix].value;
            cardsMap[value] = (cardsMap[value] || 0) + 1;
        }
        
        return Object.keys(cardsMap).filter(function (k) {
            return cardsMap[k] === 4;
        });
    };
};