const R = require('ramda')
    , { find, operation } = require('./utils')
    , request = require('request-promise-native')

const userAgent = (
  'PeriodO/1.0 (http://perio.do/; ryanshaw@unc.edu) request/2.88'
)

const queryDBpedia = legacyID => request({
  uri: 'http://dbpedia.org/sparql',
  qs: {query: `
PREFIX owl: <http://www.w3.org/2002/07/owl#>

SELECT DISTINCT ?id
WHERE {
  <${legacyID}> owl:sameAs ?id .
  FILTER (STRSTARTS(STR(?id), "http://www.wikidata.org/entity/"))
}
`},
  headers: {accept: 'application/json', 'user-agent': userAgent},
  json: true
})

const queryGeonames = legacyID => request({
  uri: 'https://query.wikidata.org/sparql',
  qs: {query: `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>

SELECT DISTINCT ?id
WHERE {
  ?id wdt:P1566 "${legacyID.split('/')[3]}" .
}
`},
  headers: {accept: 'application/json', 'user-agent': userAgent},
  json: true
})

const idMap = {
  'http://dbpedia.org/resource/Palestine':
  'http://www.wikidata.org/entity/Q219060',

  'http://dbpedia.org/resource/Carthage':
  'http://www.wikidata.org/entity/Q2429397',

  'http://dbpedia.org/resource/Burma':
  'http://www.wikidata.org/entity/Q836',

  'http://dbpedia.org/resource/Messenia':
  'http://www.wikidata.org/entity/Q1247159'
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// returns a task (i.e. an async function)
const replaceIDTask = (path, id) => async function() {
  if (! (id in idMap)) {
    const query = id.startsWith('http://dbpedia.org/')
      ? queryDBpedia
      : queryGeonames
    const o = await query(id)
    await sleep(50) // 20 requests per second
    if (o.results.bindings.length !== 1) {
      throw `Could not find wikidata equivalent for ${id}`
    }
    idMap[id] = o.results.bindings[0].id.value
  }
  return operation('replace')(path)('value')(idMap[id])
}

// execute an array of tasks sequentially and return Promise of results array
const executeSequentially = tasks => tasks.reduce(
  (promise, task) => promise.then(
    results => task().then(result => [ ...results, result ])
  ),
  Promise.resolve([])
)

// Object => Promise { Array<Operation> }
module.exports = R.pipe(
  find('$.periodCollections[*].definitions[*].spatialCoverage[*].id'),
  R.map(({path, value}) => replaceIDTask(path, value)),
  executeSequentially
)
