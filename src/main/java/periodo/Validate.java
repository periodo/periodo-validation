/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package periodo;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Scanner;
import java.util.UUID;
import java.util.logging.Logger;
import java.util.stream.Stream;
import joptsimple.OptionParser;
import joptsimple.OptionSet;
import joptsimple.OptionSpec;
import org.apache.jena.graph.Graph;
import org.apache.jena.graph.compose.MultiUnion;
import org.apache.jena.query.Dataset;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.ResultSet;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.util.FileUtils;
import org.topbraid.shacl.arq.SHACLFunctions;
import org.topbraid.shacl.constraints.ModelConstraintValidator;
import org.topbraid.shacl.vocabulary.SH;
import org.topbraid.spin.arq.ARQFactory;
import org.topbraid.spin.util.JenaUtil;
import org.topbraid.spin.util.SystemTriples;

/**
 *
 * @author ryanshaw
 */
public class Validate {

    private static final String PERIODO_DATA_URI = "http://n2t.net/ark:/99152/p0d.json";
    private static final String PERIODO_VOCAB_URI = "http://n2t.net/ark:/99152/p0v";

    private static final Logger LOG = Logger.getLogger(Validate.class.getName());

    private static final OptionParser PARSER;
    private static final OptionSpec<File> SHAPES_DIRECTORY;
    private static final OptionSpec<File> DATA_FILES;

    static {
        PARSER = new OptionParser();
        SHAPES_DIRECTORY = PARSER.accepts("shapes").withRequiredArg().ofType(File.class);
        DATA_FILES = PARSER.nonOptions("files to be validated").ofType(File.class);
        HttpURLConnection.setFollowRedirects(true);
    }

    /**
     * @param args the command line arguments
     */
    public static void main(String[] args) {
        new Validate(args).run();
    }

    private final File shapesDirectory;
    private final List<File> dataFiles;

    public Validate(String[] args) {
        OptionSet options = PARSER.parse(args);
        this.shapesDirectory = options.valueOf(SHAPES_DIRECTORY);
        this.dataFiles = options.valuesOf(DATA_FILES);
    }

    private void run() {
        Model dataModel = loadDataModel();
        Dataset dataset = ARQFactory.get().getDataset(dataModel);
        URI shapesGraphURI = addShapesGraphToDataset(dataModel, dataset);
        Model resultsModel = validate(dataset, shapesGraphURI);
        selectResults(resultsModel).forEachRemaining(result -> {
            result.varNames().forEachRemaining(name -> {
                System.out.print(name + ": ");
                System.out.println(result.get(name));
            });
            System.out.println();
        });
    }

    private Model loadDataModel() {
        Model dataModel = JenaUtil.createMemoryModel();
        
        try {
            if (this.dataFiles.isEmpty()) {
                dataModel.add(loadRemoteModel(
                        PERIODO_DATA_URI, "JSON-LD"));
            } else {
                dataModel.add(loadLocalModel(
                        this.dataFiles.stream().map(file -> file.toPath())));
            }
            if (this.shapesDirectory == null) {
                dataModel.add(loadRemoteModel(
                        PERIODO_VOCAB_URI, FileUtils.langTurtle));
            } else {
                dataModel.add(loadLocalModel(
                        Files.list(this.shapesDirectory.toPath())));
            }
        } catch (IOException e) {
            LOG.severe(e.getMessage());
        }
        return dataModel;
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
    
    private static Model validate(Dataset dataset, URI shapesGraphURI) {
        Model results = null;
        try {
            ModelConstraintValidator mcv = new ModelConstraintValidator();
            results = mcv.validateModel(
                    dataset, shapesGraphURI, null, true, null, null
            ).getModel();
        } catch (InterruptedException e) {
            LOG.severe(e.getMessage());
        }
        return results;
    }

    private static URI addShapesGraphToDataset(Model dataModel, Dataset dataset) {
        Model shaclModel = loadSHACLModel();
        Model shapesModel = ModelFactory.createModelForGraph(
                new MultiUnion(new Graph[]{
                    shaclModel.getGraph(),
                    dataModel.getGraph()
                })
        );
        SHACLFunctions.registerFunctions(shapesModel);
        URI shapesGraphURI = URI.create(
                "urn:x-shacl-shapes-graph:" + UUID.randomUUID().toString()
        );
        dataset.addNamedModel(shapesGraphURI.toString(), shapesModel);
        return shapesGraphURI;
    }

    private static InputStream getResourceStream(String name) {
        return Validate.class.getResourceAsStream(name);
    }

    private static Model loadSHACLModel() {
        Model shaclModel = JenaUtil.createDefaultModel();
        shaclModel.read(
                getResourceStream("/etc/shacl.ttl"),
                SH.BASE_URI, FileUtils.langTurtle);
        shaclModel.read(
                getResourceStream("/etc/dash.ttl"),
                SH.BASE_URI, FileUtils.langTurtle);
        shaclModel.read(
                getResourceStream("/etc/tosh.ttl"),
                SH.BASE_URI, FileUtils.langTurtle);
        shaclModel.add(SystemTriples.getVocabularyModel());
        SHACLFunctions.registerFunctions(shaclModel);
        return shaclModel;
    }
}
