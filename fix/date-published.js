"use strict";

const R = require('ramda')
    , { operation, find, remove } = require('./utils')

const updateAuthority = ({path}) => [
  operation('move')(
    R.concat(path, ['source', 'datePublished']))('from')(
    R.concat(path, ['source', 'yearPublished'])),
]

// Object => Promise { Array<Operation> }
module.exports = o => Promise.resolve([

  remove(['$', '@context', 'yearPublished']),

  operation('add')(
    ['$', '@context', 'datePublished'])('value')(
    {
      "@id": "dcterms:issued",
      "@type": "xsd:string"
    }),

  // Update authorities
  ...R.chain(updateAuthority)(find('$.authorities[*]')(o)),
])
