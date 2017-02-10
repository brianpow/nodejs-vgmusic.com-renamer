'use strict'

var Path = require("path")
var cheerio = require("cheerio")
var sanitize = require("sanitize-filename")
var FindFiles = require("node-find-files")
var fs = require("fs")
var mkdirp = require("mkdirp")

if (process.argv.length < 4) {
    console.error("Usage: %s %s <source path> <target path>", process.argv[0], process.argv[1])
    process.exit(1)
}
var source = Path.resolve(process.argv[2])
var target = Path.resolve(process.argv[3])
var finder = new FindFiles({
    rootFolder: source,
    filterFunction: function(path, stat) {
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
        console.log("Processing " + path)

        var data = fs.readFileSync(path, 'utf8')
        var current = Path.dirname(path)
        try {
            var lastTitle = ""
            var files = parse(data)
            for (var i = 0; i < files.length; i++) {
                var file = files[i]

                var newTargetPath = Path.join(target, current.substr(source.length + 1), file[0])
                if (lastTitle != file[0]) {
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
                            console.log("Linking %s to %s", fullSource, fullTarget)
                            fs.symlinkSync(fullSource, fullTarget)
                        } catch (e) {
                            console.dir(e)
                            process.exit(1)
                        }
                    } else {
                        console.log("Skipping %s to %s", fullSource, fullTarget)
                    }
                } catch (e) {
                    console.log("Linking %s to %s", fullSource, fullTarget)
                    fs.symlinkSync(fullSource, fullTarget)
                }

            }
        } catch (e) {
            console.error(e)
            process.exit(1)
        }
    }).on("complete", function() {
    console.log("Finished")
})

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

finder.startSearch()
