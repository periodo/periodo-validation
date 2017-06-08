package periodo;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Scanner;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Stream;
import joptsimple.OptionException;
import joptsimple.OptionParser;
import joptsimple.OptionSet;
import joptsimple.OptionSpec;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.ResultSet;
import org.apache.jena.query.ResultSetFormatter;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.util.FileUtils;
import org.topbraid.shacl.validation.ValidationUtil;
import org.topbraid.shacl.vocabulary.SH;
import org.topbraid.spin.util.JenaUtil;

public class Validate {

    private static final String PERIODO_DATA_URI = "http://n2t.net/ark:/99152/p0d.json";
    private static final String PERIODO_VOCAB_URI = "http://n2t.net/ark:/99152/p0v";

    private static final Logger LOG = Logger.getLogger(Validate.class.getName());

    private static final OptionParser PARSER;
    private static final OptionSpec<File> SHAPES_DIRECTORY;
    private static final OptionSpec<File> DATA_FILES;
    private static final OptionSpec<Void> OUTPUT_JSON;
    private static final OptionSpec<Void> HELP;

    static {
        PARSER = new OptionParser();
        SHAPES_DIRECTORY = PARSER.accepts("shapes", "directory containing shape files")
                .withRequiredArg()
                .ofType(File.class);
        DATA_FILES = PARSER.nonOptions("files to be validated")
                .ofType(File.class);
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
            PARSER.printHelpOn(exitCode == 0 ? System.out: System.err);
            System.exit(exitCode);
        } catch (IOException ex) {
            Logger.getLogger(Validate.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    private final File shapesDirectory;
    private final List<File> dataFiles;
    private final boolean outputJSON;
    private final boolean help;

    public Validate(String[] args) throws OptionException {
        OptionSet options = PARSER.parse(args);
        this.shapesDirectory = options.valueOf(SHAPES_DIRECTORY);
        this.dataFiles = options.valuesOf(DATA_FILES);
        this.outputJSON = options.has(OUTPUT_JSON);
        this.help = options.has(HELP);
    }

    private void run() {
        if (this.help) {
            showHelp(0);
        }

        ResultSet results = selectResults(
                validate(loadDataModel(), loadShapesModel()));

        if (this.outputJSON) {
            ResultSetFormatter.outputAsJSON(System.out, results);
        } else {
            results.forEachRemaining(result -> {
                result.varNames().forEachRemaining(name -> {
                    System.out.print(name + ": ");
                    System.out.println(result.get(name));
                });
                System.out.println();
            });
        }
    }

    private Model validate(Model data, Model shapes) {
        return ValidationUtil.validateModel(data, shapes, true).getModel();
    }

    private Model loadDataModel() {
        Model model = JenaUtil.createMemoryModel();
        if (this.dataFiles.isEmpty()) {
            model.add(loadRemoteModel(PERIODO_DATA_URI, "JSON-LD"));
        } else {
            model.add(loadLocalModel(this.dataFiles.stream().map(file -> file.toPath())));
        }
        return model;
    }

    private Model loadShapesModel() {
        Model model = JenaUtil.createMemoryModel();
        if (this.shapesDirectory == null) {
            model.add(loadRemoteModel(PERIODO_VOCAB_URI, FileUtils.langTurtle));
        } else {
            try {
                model.add(loadLocalModel(Files.list(this.shapesDirectory.toPath())));
            } catch (IOException e) {
                LOG.severe(e.getMessage());
            }
        }
        return model;
    }

    private static Model loadLocalModel(Stream<Path> paths) {
        Model model = JenaUtil.createMemoryModel();
        paths.forEach(path -> {
            try (InputStream in = Files.newInputStream(path)) {
                model.read(in, null, FileUtils.guessLang(path.toString(), "JSON-LD"));
            } catch (IOException e) {
                LOG.severe(e.getMessage());
            }
        });
        return model;
    }

    private static Model loadRemoteModel(String uri, String syntax) {
        Model model = JenaUtil.createMemoryModel();
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(uri).openConnection();
            if (c.getResponseCode() == HttpURLConnection.HTTP_MOVED_TEMP) {
                c = (HttpURLConnection) new URL(c.getHeaderField("Location")).openConnection();
            }
            model.read(c.getInputStream(), null, syntax);
            return model;
        } catch (IOException e) {
            LOG.severe(e.getMessage());
        }
        return model;
    }


    private static ResultSet selectResults(Model resultsModel) {
        String query = readString(getResourceStream("/default-query.rq"));
        ResultSet results = QueryExecutionFactory.create(
                QueryFactory.create(query),
                resultsModel
        ).execSelect();
        results.getResourceModel().setNsPrefix("sh", SH.NS);
        return results;
    }

    private static String readString(InputStream input) {
        Scanner scan = new Scanner(
                input,
                StandardCharsets.UTF_8.name()
        ).useDelimiter("\\z");
        return scan.hasNext() ? scan.next() : "";
    }

    private static InputStream getResourceStream(String name) {
        return Validate.class.getResourceAsStream(name);
    }
}
