"use strict";

const R = require('ramda')
    , { find, operation } = require('./utils')

const languageURI = languageSubtag => (
  languageSubtag.length === 2
    ? `http://lexvo.org/id/iso639-1/${languageSubtag}`
    : languageSubtag.length === 3
      ? `http://lexvo.org/id/iso639-3/${languageSubtag}`
      : undefined
)

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

const scriptURI = scriptSubtag => (
  scriptSubtag === undefined
    ? undefined
    : `http://lexvo.org/id/script/${capitalize(scriptSubtag)}`
)

const tagToURIs = languageTag => {
  const [languageSubtag, scriptSubtag] = R.split('-', languageTag)
  return [languageURI(languageSubtag), scriptURI(scriptSubtag)]
}

const fixPeriodDefinition = ({path, value}) => {
  const languageTag = R.prop('language', value)
      , [languageURI, scriptURI] = tagToURIs(languageTag)
      , operations =
    [ operation('replace')(R.append('language', path))('value')(languageURI)
    , operation('add')(R.append('languageTag', path))('value')(languageTag)
    ]
  return scriptURI === undefined
    ? operations
    : R.append(
        operation('add')(R.append('script', path))('value')(scriptURI),
        operations)
}

const fixContext = R.concat(
  [ operation('replace')(['$', '@context', 'language'])('value')(
      {'@id': 'http://purl.org/dc/terms/language', '@type': '@id'})
  , operation('add')(['$', '@context', 'script'])('value')(
      {'@id': 'http://lexvo.org/ontology#inScript', '@type': '@id'})
  , operation('add')(['$', '@context', 'languageTag'])('value')(
      'http://purl.org/dc/elements/1.1/language')
  ]
)

// Object => Promise { Array<Operation> }
module.exports = Promise.resolve(
  R.pipe(
    find('$.periodCollections[*].definitions[*]'),
    R.chain(fixPeriodDefinition),
    fixContext
  )
)
