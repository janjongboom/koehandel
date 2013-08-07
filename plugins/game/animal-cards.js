var types = [
    {
        name: "Chicken",
        value: 10
    },
//    {
//        name: "Goose",
//        value: 40
//    },
//    {
//        name: "Cat",
//        value: 90
//    },
//    {
//        name: "Dog",
//        value: 160
//    },
//    {
//        name: "Sheep",
//        value: 250
//    },
//    {
//        name: "Goat",
//        value: 350
//    },
//    {
//        name: "Donkey",
//        value: 500
//    },
//    {
//        name: "Pig",
//        value: 650
//    },
//    {
//        name: "Cow",
//        value: 800
//    },
//    {
//        name: "Horse",
//        value: 1000
//    }
];

// every type has four playing cards
var cards = [];

types.forEach(function (t) {
    // four playing cards
    for (var ix = 0; ix < 4; ix++) {
        cards.push(t);
    }
});

/**
 * Create a new deck
 */
function generateDeck () {
    // clone base deck
    var deck = cards.slice(0);
    
    return shuffle(deck);
}

/**
 * Shuffle an array,
 * from http://stackoverflow.com/questions/962802/is-it-correct-to-use-javascript-array-sort-method-for-shuffling
 */
function shuffle(array) {
    var tmp, current, top = array.length;

    if(top) while(--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
    }

    return array;
}

module.exports = {
    generateDeck: generateDeck
};