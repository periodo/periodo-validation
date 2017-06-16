"use strict";

const R = require('ramda')
    , parseArgs = require('minimist')
    , concat = require('concat-stream')
    , jsonpatch = require('fast-json-patch')
    , jsonpath = require('jsonpath')
    , langs = require('langs')
    , request = require('request')
    , tags = require('language-tags')

// Buffer => String
const toString = buf => buf.toString('utf8')

// Buffer => Object
const parseJSON = R.pipe(toString, JSON.parse)

// Object => String
const prettify = doc => JSON.stringify(doc, null, 2)

// JSON Patch ------------------------------------------------------------------

// JSONPatch => JSONPatch
const validatePatch = patch => {
  const error = jsonpatch.validate(patch)
  if (error) {
    console.error(error)
    throw error
  }
  return patch
}

// Object => JSONPatch => Object
const applyPatch = doc => patch => jsonpatch.applyPatch(doc, patch).newDocument

// -----------------------------------------------------------------------------

// Error => ErrorInfo
const errorInfo = e => (
  { message: e.toString()
  , code: e.code
  , tag: e.tag
  , subtag: e.subtag
  }
)

// String => Array<ErrorInfo>
const errors = tag => R.map(errorInfo, tags(tag).errors())

// String => String
const assertValid = tag => {
  if (! tags.check(tag)) {
    throw JSON.stringify(errors(tag), null, 2)
  }
  return tag
}

// String => String
const format = tag => tags(tag).format()

// String => Boolean
const hasSuppressedScript = tag => {
  const subtags = tags(tag).subtags()
      , language = subtags[0]
      , script = 'language' === language.type() ? language.script() : undefined

  return (
    script &&
    subtags.length > 1 &&
    script.format() === subtags[1].format()
  )
}

// String => String
const fixScript = tag => {
  const [language] = R.split('-', tag)
  return hasSuppressedScript(tag)
    ? language
    : tag
}

// String => String
const iso2to1 = languageTag => langs.has('2', languageTag)
  ? langs.where('2', languageTag)['1']
  : languageTag

// String => String
const fixLanguage = tag => {
  const [iso2lang, script] = R.split('-', tag)
      , iso1lang = iso2to1(iso2lang)
  return script ? R.join('-', [iso1lang, script]) : iso1lang
}

// String => String
const replacements = R.cond([
  // https://github.com/periodo/periodo-data/issues/38
  [ R.equals('ell-latn'), R.always('ell-grek') ],
  // https://github.com/periodo/periodo-data/issues/39
  [ R.equals('als-latn'), R.always('sq') ],
  [ R.T, R.identity ],
])

// String => String
const fix = R.pipe(
  replacements,
  fixLanguage,
  fixScript,
  format,
  assertValid,
)

// Array<JSONPathElement> => JSONPointer
const JSONPointer = R.pipe(
  R.map(element => element === '$' ? '' : element),
  R.join('/')
)

// {path: Array<JSONPathElement>, tag: String} => MoveOperation
const moveOperation = ({tag, path}) => (
  { op: 'move'
  , from: JSONPointer(R.append(tag, path))
  , path: JSONPointer(R.append(fix(tag), path))
  }
)

// {path: Array<JSONPathElement>, tag: String} => ReplaceOperation
const replaceOperation = ({tag, path}) => (
  { op: 'replace'
  , value: fix(tag)
  , path: JSONPointer(path)
  }
)

// {path: Array<JSONPathElement>} => Boolean
const lastPathElementIs = element => R.pipe(
  R.prop('path'),
  R.last,
  R.equals(element)
)

// String => String => throws
const throwUnexpected = name => value => {
  throw `unexpected ${name}: ${value}`
}

// {path: Array<JSONPathElement>, tag: String} => Operation or throws
const operation = R.cond([
  [ lastPathElementIs('language'), replaceOperation ],
  [ lastPathElementIs('localizedLabels'), moveOperation ],
  [ R.T, throwUnexpected('element') ]
])

// Anything => Array<String> or throws
const extractTags = R.pipe(
  R.cond(
    [ [ R.is(String), Array.of ]
    , [ R.is(Object), R.keys ]
    , [ R.T, throwUnexpected('value type') ]
    ]
  )
)

// String => Object => Array<JsonPathNode>
const find = query => doc => jsonpath.nodes(doc, query)

// Array<JsonPathNode> => Array<{path: Array<JSONPathElement>, tag: String}>
const extractTagPaths = R.reduce(
  (tagpaths, {path, value}) => (
    R.concat(tagpaths, R.map(tag => ({path, tag}), extractTags(value)))
  ), []
)

// Object => Array<Operation>
const createPatch = R.pipe(
  find('$.periodCollections[*].definitions[*]["language","localizedLabels"]'),
  extractTagPaths,
  R.map(operation)
)

const flags = parseArgs(process.argv.slice(2), {boolean: ['a', 'apply']})

const processDocument = doc => R.pipe(
  createPatch,
  validatePatch,
  R.ifElse(
    () => flags.a || flags.apply,
    applyPatch(doc),
    R.identity
  ),
  prettify,
  console.log,
)(doc)

const processBuffer = R.pipe(parseJSON, processDocument)

request('http://n2t.net/ark:/99152/p0d.json')
  .pipe(concat(processBuffer))
