"use strict";

const { operation } = require('./utils')

// Object => Promise { Array<Operation> }
module.exports = () => Promise.resolve([
  operation('replace')(
    ['$', '@context', 'yearPublished', '@type'])('value')('xsd:string'),
])
