'use strict'

var Path = require("path")
var cheerio = require("cheerio")
var sanitize = require("sanitize-filename")
var FindFiles = require("node-find-files")
var fs = require("fs")
var mkdirp = require("mkdirp")
var program = require("commander")
var shellEscape = require("shell-escape")

program.version("1.1.0")
    .option('-q, --quiet', 'be quiet (except error message)')
    .option('-v, --verbose', 'be verbose', increaseVerbosity, 0)
    .option('-s, --search <keyword>', 'process only path contain keyword')
    .option('-c, --copy', 'copy instead of symobolic linking the original file')
    .option('-e, --export <file>', 'export the process in form of shell script instead of direct linking/copying')
    .action(function(source, target) {
        var finder = new FindFiles({
            rootFolder: source,
            filterFunction: function(path, stat) {
                if (!program.search || path.indexOf(program.search) != -1)
                    if (path.indexOf("index.html") != -1) {
                        var files = fs.readdirSync(Path.dirname(path))
                        for (var file of files)
                            if (file.substr(-4).toLowerCase() == ".mid")
                                return true
                    }
                return false
            }
        }).on("match",
            function(path, stat) {
                if (!program.quiet)
                    console.log("Processing " + path)

                var data = fs.readFileSync(path, 'utf8')
                var current = Path.dirname(path)
                try {
                    var lastTitle = ""
                    var files = parse(data)
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i]

                        var newTargetPath = Path.join(target, current.substr(source.length), file[0])
                        if (lastTitle != file[0] && !fs.existsSync(newTargetPath)) {
                            if (!program.quiet && program.verbose > 0)
                                console.log("mkdirp %s", newTargetPath)
                            mkdirp.sync(newTargetPath)
                            lastTitle = file[0]
                        }
                        var author = (file[2] == "") ? "" : " [" + file[2] + "]"

                        var newName = file[1] + author + ".mid"
                        newName = sanitize(newName)

                        var originalName = unescape(file[3].replace(/.+\//, ""))
                        var fullSource = Path.join(current, originalName)
                        var fullTarget = Path.join(newTargetPath, newName)
                        try {
                            var stat = fs.lstatSync(fullTarget)
                            if (!stat.isFile() && !stat.isSymbolicLink()) {
                                try {
                                    link(fullSource, fullTarget)

                                } catch (e) {
                                    console.dir(e)
                                    process.exit(1)
                                }
                            } else {
                                if (!program.quiet && program.verbose > 0)
                                    console.log("Skipping %s to %s", fullSource, fullTarget)
                            }
                        } catch (e) {
                            link(fullSource, fullTarget)
                        }
                    }
                } catch (e) {
                    console.error(e)
                    process.exit(1)
                }
            }).on("complete", function() {
            if (!program.quiet)
                console.log("Finished")
        })
        finder.startSearch()
    })
    .parse(process.argv)

function increaseVerbosity(v, total) {
    return total + 1;
}

function link(fullSource, fullTarget) {
    if (program.copy) {
        if (!program.export) {
            if (!program.quiet && program.verbose > 0)
                console.log("Copying %s to %s", fullSource, fullTarget)
            fs.createReadStream(fullSource).pipe(fs.createWriteStream(fullTarget))
        } else {
            fs.appendFileSync(program.export, shellEscape(['cp', fullSource, fullTarget]))
        }
    } else {
        if (!program.export) {
            if (!program.quiet && program.verbose > 0)
                console.log("Linking %s to %s", fullSource, fullTarget)
            fs.symlinkSync(fullSource, fullTarget)
        } else {
            console.log(shellEscape(['ln', '-s', fullSource, fullTarget]))
            fs.appendFileSync(program.export, shellEscape(['ln', '-s', fullSource, fullTarget]))
        }
    }
}

function parse(data) {
    var files = []
    var $ = cheerio.load(data)
    var $trs = $("tr")
    var title = ""
    for (var i = 2; i < $trs.length; i++) {
        var $tr = $($trs[i])
        if ($tr.hasClass("header")) {
            title = sanitize($tr.text().trim())
        } else {
            var $td = $tr.find("td")
            var a = $td.eq(0).find("a").eq(0)
            var name = a.text().trim()
            if (name.length && name != "") {
                var author = $td.eq(2).text().trim()
                files.push([title, name, author, a.attr('href')])
            }
        }
    }
    return files
}
