
const camel2under = function(name) {
    return name.replace(/([A-Z])/g, "_$1").toLowerCase();
}
const under2Camel = function (name) {
    return name.replace(/\_(\w)/g, function (all, letter) {
        return letter.toUpperCase();
    });
}

export default {
    camel2under,
    under2Camel
}