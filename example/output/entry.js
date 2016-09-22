(function () {
'use strict';

/* global Patchwork */


class Module1 {

    static log() {
        return 'I am module 1';
    }

}

/* global Patchwork */


class Module2 {

    static log() {
        return 'I am module 2';
    }

    }

console.log(Module1.log());
console.log(Module2.log());

}());
