"use strict";

const R = require('ramda')
    , { find, operation, remove } = require('./utils')

const isSpecialCase = R.either(R.equals('p0qhb66ns52'), R.equals('p0qhb66596k'))

const addDerivedFrom = ({path, value}) => {

  if (isSpecialCase(R.last(path))) {
    return [ operation('replace')(R.append('editorialNote', path))('value')(
      `Derived from FASTI (http://n2t.net/ark:/99152/p06v8w4),
 but no match in 2004 dataset.`) ]
  }

  const editorialNote = R.propOr('', 'editorialNote', value)
      , match = editorialNote.match(/^Derived from (http.*)$/)
  return match
    ? [ operation('add')(R.append('derivedFrom', path))('value')(match[1])
      , remove(R.append('editorialNote', path))
      ]
    : []
}

const fixContext = R.concat(
  [ operation('add')(['$', '@context', 'derivedFrom'])('value')(
      {'@id': 'http://www.w3.org/ns/prov#wasDerivedFrom', '@type': '@id'})
  ]
)

module.exports = R.pipe(
  find('$.periodCollections[*].definitions[*]'),
  R.chain(addDerivedFrom),
  fixContext
)
