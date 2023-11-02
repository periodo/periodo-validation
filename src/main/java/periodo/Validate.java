package periodo;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Scanner;
import java.util.logging.Logger;
import java.util.stream.Stream;
import joptsimple.OptionException;
import joptsimple.OptionParser;
import joptsimple.OptionSet;
import joptsimple.OptionSpec;
import org.apache.jena.graph.Graph;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.ResultSet;
import org.apache.jena.query.ResultSetFormatter;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.riot.RDFLanguages;
import org.apache.jena.shacl.ShaclValidator;
import org.apache.jena.shacl.Shapes;
import org.apache.jena.shacl.ValidationReport;
import org.apache.jena.util.FileUtils;

public class Validate {

  private static final String PERIODO_DATA_URI = "http://n2t.net/ark:/99152/p0d.json";
  private static final String PERIODO_VOCAB_URI = "http://n2t.net/ark:/99152/p0v.ttl";

  private static final Logger LOG = Logger.getLogger(Validate.class.getName());

  private static final OptionParser PARSER;
  private static final OptionSpec<File> SHAPE_FILES;
  private static final OptionSpec<File> REMOVE_FILES;
  private static final OptionSpec<File> DATA_FILES;
  private static final OptionSpec<Void> OUTPUT_JSON;
  private static final OptionSpec<Void> HELP;

  static {
    PARSER = new OptionParser();
    SHAPE_FILES =
        PARSER
            .accepts("shapes", "file or directory containing shapes")
            .withRequiredArg()
            .ofType(File.class);
    REMOVE_FILES =
        PARSER
            .accepts("remove", "file or directory containing triples to be removed")
            .withRequiredArg()
            .ofType(File.class);
    DATA_FILES = PARSER.nonOptions("files to be validated").ofType(File.class);
    OUTPUT_JSON = PARSER.accepts("json", "format output as JSON");
    HELP = PARSER.accepts("help", "show help").forHelp();
    HttpURLConnection.setFollowRedirects(true);
  }

  public static void main(String[] args) {
    try {
      new Validate(args).run();
    } catch (OptionException e) {
      System.err.println(e.getMessage());
      showHelp(1);
    }
  }

  private static void showHelp(int exitCode) {
    try {
      PARSER.printHelpOn(exitCode == 0 ? System.out : System.err);
      System.exit(exitCode);
    } catch (IOException e) {
      LOG.severe(e.getMessage());
    }
  }

  private final List<File> shapeFiles;
  private final List<File> removeFiles;
  private final List<File> dataFiles;
  private final boolean outputJSON;
  private final boolean help;

  public Validate(String[] args) throws OptionException {
    OptionSet options = PARSER.parse(args);
    this.shapeFiles = options.valuesOf(SHAPE_FILES);
    this.removeFiles = options.valuesOf(REMOVE_FILES);
    this.dataFiles = options.valuesOf(DATA_FILES);
    this.outputJSON = options.has(OUTPUT_JSON);
    this.help = options.has(HELP);
  }

  private void run() {
    if (this.help) {
      showHelp(0);
    }

    Shapes shapes = Shapes.parse(loadShapesModel());
    Graph data = loadDataModel().getGraph();
    ValidationReport report = ShaclValidator.get().validate(shapes, data);

    ResultSet results = selectResults(report.getModel());

    if (this.outputJSON) {
      ResultSetFormatter.outputAsJSON(System.out, results);
    } else {
      results.forEachRemaining(
          result -> {
            result
                .varNames()
                .forEachRemaining(
                    name -> {
                      System.out.print(name + ": ");
                      System.out.println(result.get(name));
                    });
            System.out.println();
          });
    }
  }

  private Model loadDataModel() {
    if (this.dataFiles.isEmpty()) {
      return RDFDataMgr.loadModel(PERIODO_DATA_URI, RDFLanguages.JSONLD);
    } else {
      return loadLocalModel(this.dataFiles.stream().map(file -> file.toPath()));
    }
  }

  private Model loadShapesModel() {
    Model model = null;
    if (this.shapeFiles.isEmpty()) {
      model = RDFDataMgr.loadModel(PERIODO_VOCAB_URI, RDFLanguages.TURTLE);
    } else {
      model = loadLocalModel(this.shapeFiles);
    }
    if (this.removeFiles.isEmpty()) {
      return model;
    } else {
      return model.difference(loadLocalModel(this.removeFiles));
    }
  }

  private static Model loadLocalModel(List<File> files) {
    return loadLocalModel(
        Stream.concat(
            files.stream()
                .filter(file -> file.isDirectory())
                .flatMap(directory -> pathsOf(directory))
                .filter(path -> path.toString().endsWith(".ttl")),
            files.stream().filter(file -> file.isFile()).map(file -> file.toPath())));
  }

  private static Model loadLocalModel(Stream<Path> paths) {
    Model model = ModelFactory.createDefaultModel();
    paths.forEach(
        path -> {
          try (InputStream in =
              "-".equals(path.toString()) ? System.in : Files.newInputStream(path)) {
            model.read(in, null, FileUtils.guessLang(path.toString(), "JSON-LD"));
          } catch (IOException e) {
            LOG.severe(e.getMessage());
          }
        });
    return model;
  }

  private static Stream<Path> pathsOf(File directory) {
    try {
      return Files.list(directory.toPath());
    } catch (IOException e) {
      LOG.severe(e.getMessage());
      return Stream.empty();
    }
  }

  private static ResultSet selectResults(Model reportModel) {
    String query = readString(getResourceStream("/default-query.rq"));
    return QueryExecutionFactory.create(QueryFactory.create(query), reportModel).execSelect();
  }

  private static String readString(InputStream input) {
    try (Scanner scan = new Scanner(input, StandardCharsets.UTF_8.name())) {
      scan.useDelimiter("\\z");
      return scan.hasNext() ? scan.next() : "";
    }
  }

  private static InputStream getResourceStream(String name) {
    return Validate.class.getResourceAsStream(name);
  }
}
