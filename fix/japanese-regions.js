const R = require('ramda')
    , { find, operation } = require('./utils')


const regions = {
  "Hokkaidō": {
    id: "http://www.wikidata.org/entity/Q35581",
    label: "Hokkaidō"
  },
  "Honshu": {
    id: "http://www.wikidata.org/entity/Q13989",
    label: "Honshu"
  },
  "Kyushu": {
    id: "http://www.wikidata.org/entity/Q13987",
    label: "Kyushu"
  },
  "Okinawa Islands": {
    id: "http://www.wikidata.org/entity/Q697589",
    label: "Okinawa Islands"
  },
  "Shikoku": {
    id: "http://www.wikidata.org/entity/Q13991",
    label: "Shikoku"
  },
}

const descriptionToEntities = spatialCoverageDescription => {
  switch (spatialCoverageDescription) {
    case '本州・四国・九州':
      return [
        regions['Honshu'],
        regions['Shikoku'],
        regions['Kyushu'],
      ]
    case '沖縄':
      return [
        regions['Okinawa Islands'],
      ]
    case '北海道':
      return [
        regions['Hokkaidō'],
      ]
    case '本州・四国・九州・北海道':
      return [
        regions['Honshu'],
        regions['Shikoku'],
        regions['Kyushu'],
        regions['Hokkaidō'],
      ]
    default:
      console.error(
        `unexpected spatial coverage: {period.spatialCoverageDescription}`
      )
      return []
  }
}

const fixSpatialCoverage = (path, period) => operation(
  'add'
)(
  R.append('spatialCoverage', path)
)(
  'value'
)(
  descriptionToEntities(period.spatialCoverageDescription)
)

// Object => Promise { Array<Operation> }
module.exports = R.pipe(
  find('$.authorities.p0g8mw8.periods[*]'),
  R.map(({path, value: period}) => fixSpatialCoverage(path, period)),
  patch => Promise.resolve(patch)
)
