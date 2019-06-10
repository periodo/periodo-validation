"use strict";

const R = require('ramda')
    , { find, operation } = require('./utils')

const fixContext = R.concat(
  [ operation('add')(['$', '@context', 'broader'])('value')(
      {'@id': 'http://www.w3.org/2004/02/skos/core#broader', '@type': '@id'})
  ]
)

const addBroaderNarrower = periodLabels => ({path, value}) => {
  const collectionID = path[2]
  const editorialNote = R.propOr('', 'editorialNote', value)
     , match = editorialNote.match(/^Parent period: (.*)$/)
  if (match) {
    for (const label of match[1].split(', ')) {
      const period = periodLabels[collectionID][label]
      if (period) {
        return [
          operation('add')(R.append('broader', path))('value')(period)
        ]
      }
    }
    console.error(`Could not find parent period of ${R.prop('id', value)}`)
  }
  return []
}

const indexPeriodLabels = R.pipe(
  find('$.periodCollections[*].definitions[*]'),
  R.reduce((index, {path, value}) => {
    const [ , , collectionID, , definitionID] = path
    const labels = R.concat(
            [ R.prop('label', value) ],
            R.chain(R.identity, R.values(R.prop('localizedLabels', value)))
          )
    labels.forEach(label => {
      index = R.assocPath([collectionID, label], definitionID, index)
      if (label.endsWith(' Period')) {
        index = R.assocPath(
          [collectionID, label.slice(0, -7)], definitionID, index)
      }
    })
    return index
  }, {})
)

module.exports = periodoData => {

  const periodLabels = indexPeriodLabels(periodoData)

  return Promise.resolve(
    R.pipe(
      find('$.periodCollections[*].definitions[*]'),
      R.chain(addBroaderNarrower(periodLabels)),
      fixContext
    )(periodoData)
  )
}
