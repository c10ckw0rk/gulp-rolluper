/* eslint import/no-extraneous-dependencies: ["error", {"optionalDependencies": false}] */

const through = require('through2');
const assign = require('lodash').assign;
const rollup = require('rollup');
const fs = require('fs');
const path = require('path');

function unixStylePath(filePath) {
  return filePath.split(path.sep).join('/');
}

module.exports = (options) => {

    const opts = assign({}, {
        rollup: {},
        generate: {
            format: 'iife',
            sourceMap: true
        }
    }, options);

    const error = message => {

        throw new Error(message);

    };

    return through.obj(function (vinylStream, enc, cb) {

        opts.rollup.entry = vinylStream.path;

        if (!fs.existsSync(vinylStream.path)) error('entry point does not exist', vinylStream.path);

        rollup.rollup(opts.rollup).then(bundle => {

            bundle = bundle.generate(opts.generate);

            const fileExt = path.extname(vinylStream.relative);
            const fileName = path.basename(vinylStream.path, fileExt);

            vinylStream.path = fileName + fileExt;
            vinylStream.contents = new Buffer(bundle.code);

            if (opts.generate.sourceMap) {
                bundle.map.file = unixStylePath(vinylStream.relative);
                bundle.map.sources = bundle.map.sources.map(fileName => {
                    return unixStylePath(path.relative(vinylStream.base, fileName));
                });
                vinylStream.sourceMap = bundle.map;
            }

            this.push(vinylStream);
            cb(null);

        }).catch(e => {
            console.log(e);
        });

    });

};
