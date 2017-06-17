"use strict";

const R = require('ramda')
    , jsonpath = require('jsonpath')

// Array<JSONPathElement> => JSONPointer
const JSONPointer = R.pipe(
  R.map(element => element === '$' ? '' : element),
  R.join('/')
)

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

// String => Array<JSONPathElement> => String => Anything => Operation
const operation = op => path => k => v => R.assoc(k, v,
  { op
  , path: JSONPointer(path)
  }
)

const tagToURIs = languageTag => {
  const [languageSubtag, scriptSubtag] = R.split('-', languageTag)
  return [languageURI(languageSubtag), scriptURI(scriptSubtag)]
}

// String => Object => Array<JsonPathNode>
const find = query => doc => jsonpath.nodes(doc, query)

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

// Object => Array<Operation>
module.exports = R.pipe(
  find('$.periodCollections[*].definitions[*]'),
  R.chain(fixPeriodDefinition),
  fixContext
)
