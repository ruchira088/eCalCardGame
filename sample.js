var count = 0;

var Person = function (name) {
    count++;

    this.name = name;

    this.getNumber = function () {
        var number = count;

        return function () {
            return number;
        };
    }();
};

//var a = new Person("A");
//var b = new Person("B");
//var c = new Person("C");
//
//console.log(a.getNumber());
//console.log(b.getNumber());
//console.log(c.getNumber());
//

var Animal = function (name) {
    this.name = name;
};

function createAnimal() {
    var cat = new Animal("Jenny");
    cat.getName = function () {
        return cat.name;
    };

    return cat;
}

var a = createAnimal();

console.log(a.getName());

a.name = "Hello";

console.log(a.getName());

var b = a;

a = 1;

console.log(b.getName());