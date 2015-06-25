function Logger () {
    this.log = function (message) {
        console.log("%s: %s", Date.now(), message);
    }
}

module.exports = exports = new Logger();
