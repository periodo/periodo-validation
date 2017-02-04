SHACL data shapes for validating PeriodO data, and a CLI for running the validation against the canonical or local development files.

### Usage

Validate the current canonical PeriodO data set ([http://n2t.net/ark:/99152/p0d.json](http://n2t.net/ark:/99152/p0d.json)) against the current published data shapes from the PeriodO vocabulary ([http://n2t.net/ark:/99152/p0v](http://n2t.net/ark:/99152/p0v)):
```sh
./validate
```

Validate a local data set against the current published data shapes from the PeriodO vocabulary ([http://n2t.net/ark:/99152/p0v](http://n2t.net/ark:/99152/p0v)):
```sh
./validate data.ttl
```

Validate the current canonical PeriodO data set ([http://n2t.net/ark:/99152/p0d.json](http://n2t.net/ark:/99152/p0d.json)) against data shape files from a local directory:
```sh
./validate -shapes path/to/shapes_dir
```

Validate a local data set against data shape files from a local directory:
```sh
./validate -shapes path/to/shapes_dir data.ttl
```
