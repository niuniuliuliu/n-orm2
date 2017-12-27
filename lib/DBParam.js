'use strict';
module.exports = (name, value, type = null) => {
    return {name: name, value: value, type: type || null};
};