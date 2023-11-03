const assert = require("assert")
const R = require("ramda"),
  { readFile, readdir } = require("fs/promises"),
  { operation } = require("./utils")

const authority = {
  type: "Authority",
  id: "https://client.perio.do/.well-known/genid/eamena-authority",
  editorialNote:
    "This authority contains period concepts defined in the Endangered Archaeology in the Middle East & North Africa (EAMENA) Database. The EAMENA Database brings together data from satellite imagery and published reports to make available information about archaeological sites and landscapes which are under threat.",
  source: {
    citation:
      "University of Oxford, University of Southampton. (2023). EAMENA Database. Retrieved from https://database.eamena.org (Accessed: 2023-10-01).",
    title: "EAMENA Database",
    url: "https://database.eamena.org/",
    yearPublished: "2021",
    creators: [
      {
        name: "University of Oxford",
      },
      {
        name: "University of Southampton",
      },
    ],
  },
  periods: {},
}

// Object => Promise { Array<Operation> }
module.exports = async function createPatch() {
  let periods = []

  for (const file of (await readdir("eamena-files")).filter((file) =>
    file.match(/\.json$/),
  )) {
    const data = JSON.parse(
      await readFile(`eamena-files/${file}`, { encoding: "utf8" }),
    )

    periods = periods.concat(
      Object.values(data.authorities[authority.id].periods),
    )
  }

  for (const p of periods) {
    // un-nest places array
    p.spatialCoverage = p.spatialCoverage[0]

    // set url
    p.url = `https://database.eamena.org/concepts/${p.source.locator}`

    // remove unneeded keys
    delete p.note
    delete p.editorialNote
    delete p.source

    // combine unecessary splitting of endpoints
    if (p.start.in.earliestYear != p.start.in.latestYear) {
      throw Error(p.id)
    }
    if (p.stop.in.earliestYear != p.stop.in.latestYear) {
      throw Error(p.id)
    }
    p.start.in = { year: p.start.in.earliestYear.toString() }
    p.stop.in = { year: p.stop.in.earliestYear.toString() }
  }

  authority.periods = R.fromPairs(periods.map((period) => [period.id, period]))

  return [
    operation("add")(["$", "authorities", authority.id])("value")(authority),
  ]
}
