const R= require('ramda')
    , rdf = require('rdflib')
    , http = require('axios')
    , { operation } = require('./utils')

const GENID = 'https://client.perio.do/.well-known/genid/'

const YEAR = 2020
const API = 'https://vocabs.ardc.edu.au/registry/api/'
const GTS_TTL = `${API}resource/downloads/1211/isc${YEAR}.ttl`
const GTS = `http://resource.geosciml.org/vocabulary/timescale/gts${YEAR}`

const EXPECTED_PERIOD_COUNT = 181

const queryGraph = (graph, query, expectedCount) => new Promise(
  (resolve, reject) => {
    const results = []
    graph.query(
      rdf.SPARQLToQuery(query, false, graph),
      r => results.push(r),
      undefined,
      () => (expectedCount !== undefined && expectedCount !== results.length)
        ? reject(`Expected ${expectedCount} results but got ${results.length}:
${query}
${results}`)
        : resolve(results)
    )
  }
)

const extractAuthority = async (graph) => {
  const query = `
PREFIX dc: <http://purl.org/dc/terms/>
SELECT
  ?title
  ?description
WHERE {
  <${GTS}> dc:title ?title .
  <${GTS}> dc:description ?description .
}
`
  const result = (await queryGraph(graph, query, 1))[0]
      , title = result['?title'].value
      , description = result['?description'].value
  return {
    type: 'Authority',
    id: `${GENID}import/${GTS}`,
    sameAs: GTS,
    editorialNote: `${description} Imported from ${GTS}`,
    source: {
      title,
      yearPublished: 2020,
      creators: [
        {name: 'International Commission on Stratigraphy'},
        {name: 'Commonwealth Scientific and Industrial Research Organisation'},
        {name: 'Arizona Geological Survey'},
        {name: 'International Union of Geological Sciences'},
      ],
      citation: `International Commission on Stratigraphy, Commonwealth Scientific and Industrial Research Organisation, Arizona Geological Survey, and International Union of Geological Sciences. "${title}." ${YEAR}. ${GTS}`
    }
  }
}

const extractPeriodIDs = async (graph) => {
  const query = `
PREFIX dc: <http://purl.org/dc/terms/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX gts: <http://resource.geosciml.org/ontology/timescale/gts#>
SELECT
  ?period
  ?replacement
WHERE {
  ?period rdf:type gts:GeochronologicEra .
  OPTIONAL { ?period dc:isReplacedBy ?replacement . }
}
`
  const results = await queryGraph(graph, query, EXPECTED_PERIOD_COUNT)
  return results
    .filter(r => r['?replacement'] === undefined)
    .map(r => r['?period'].value)
}

// 1950 is reference year
const maToISOYear = ma => Math.trunc(1950 - (ma * 1000000))

const extractTemporalBound = async (graph, id, bound) => {
  const boundQuery = `
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT
  ?label
  ?position
  ?number
WHERE {
  <${id}> time:${bound === 'start' ? 'hasBeginning' : 'hasEnd' } ?bound .
  ?bound skos:prefLabel ?label .
  ?bound time:inTemporalPosition ?position .
  ?position time:hasTRS
    <http://resource.geosciml.org/classifier/cgi/geologicage/ma> .
  ?position time:numericPosition ?number .
}
`
  const boundResult = (await queryGraph(graph, boundQuery, 1))[0]
      , label = boundResult['?label'].value
      , positionID = boundResult['?position'].value
      , position = Number(boundResult['?number'].value)

  const uncertaintyQuery = `
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX gts: <http://resource.geosciml.org/ontology/timescale/gts#>
SELECT
  ?number
WHERE {
  <${positionID}> gts:positionalUncertainty ?uncertainty .
  ?uncertainty time:numericDuration ?number .
}
`
  const uncertaintyResults = await queryGraph(graph, uncertaintyQuery)
      , hasUncertainty = (uncertaintyResults.length > 0)
      , uncertainty = hasUncertainty
          ? Number(uncertaintyResults[0]['?number'].value)
          : null

  return {
    label,
    in: hasUncertainty
      ? { earliestYear: maToISOYear(position + uncertainty)
        , latestYear: maToISOYear(position - uncertainty)
        }
      : { year: maToISOYear(position) }
  }
}

const extractLabel = async (graph, id) => {
  const query = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT
  ?label
WHERE {
  <${id}> rdfs:label ?label .
}
`
  return (await queryGraph(graph, query, 1))[0]['?label'].value
}

const extractLocalizedLabels = async (graph, id) => {
  const prefQuery = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT
  ?label
WHERE {
  <${id}> skos:prefLabel ?label .
}
`
  const altQuery = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT
  ?label
WHERE {
  <${id}> skos:altLabel ?label .
}
`
  const prefLabels = await queryGraph(graph, prefQuery)
      , altLabels = await queryGraph(graph, altQuery)

  return R.pipe(
    R.map(R.prop('?label')),
    R.groupBy(R.prop('lang')),
    R.toPairs,
    R.map(([lang, labels]) => [lang, labels.map(R.prop('value'))]),
    R.fromPairs
  )(prefLabels.concat(altLabels))
}

const extractBroader = async (graph, id) => {
  const query = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT
  ?broader
WHERE {
  <${id}> skos:broader ?broader .
}
`
  const results = await queryGraph(graph, query)
  return results.length === 1
    ? results[0]['?broader'].value
    : null
}

const extractPeriod = async (graph, id) => {
  const period = {
    type: 'Period',
    id: `${GENID}import/${id}`,
    sameAs: id,
    label: await extractLabel(graph, id),
    language: 'http://lexvo.org/id/iso639-1/en',
    languageTag: 'en',
    localizedLabels: await extractLocalizedLabels(graph, id),
    spatialCoverage: [
      {
        id: 'http://www.wikidata.org/entity/Q2',
        label: 'World'
      }
    ],
    start: await extractTemporalBound(graph, id, 'start'),
    stop: await extractTemporalBound(graph, id, 'stop')
  }

  const broader = await extractBroader(graph, id)
  if (broader !== null) {
    period.broader = `${GENID}import/${broader}`
  }

  return period
}

const createAuthority = async (response) => {
  try {
    const g = rdf.graph()
    rdf.parse(response.data, g, GTS, 'text/turtle')

    const authority = await extractAuthority(g)
        , periodIDs = await extractPeriodIDs(g)

    const periods = await Promise.all(
      periodIDs.map(id => extractPeriod(g, id))
    )

    authority.periods = R.fromPairs(periods.map(period => [period.id, period]))

    return authority
  }
  catch (e) {
    console.error(e)
  }
}

// Object => Promise { Array<Operation> }
module.exports = async function createPatch() {
  const authority = await http.get(GTS_TTL).then(createAuthority)
  return [
    operation('add')(['$', 'authorities', authority.id])('value')(authority)
  ]
}
