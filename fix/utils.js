"use strict";

const R = require('ramda')
    , jsonpath = require('jsonpath')

// String => Object => Array<JsonPathNode>
const find = query => doc => jsonpath.nodes(doc, query)

// Array<JSONPathElement> => JSONPointer
const JSONPointer = R.pipe(
  R.map(element => element === '$' ? '' : element),
  R.join('/')
)

// String => Array<JSONPathElement> => String => Anything => Operation
const operation = op => path => k => v => R.assoc(
  k,
  R.equals('from', k) ? JSONPointer(v) : v,
  { op
  , path: JSONPointer(path)
  }
)

const remove = path => (
  { op: 'remove'
  , path: JSONPointer(path)
  }
)

module.exports = { find, operation, remove }