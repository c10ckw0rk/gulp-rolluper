/* eslint import/no-extraneous-dependencies: ["error", {"optionalDependencies": false}] */

const through = require('through2');
const assign = require('lodash').assign;
const rollup = require('rollup');
const fs = require('fs');
const path = require('path');
const Vinyl = require('vinyl');

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

        let theBundle;

        opts.rollup.entry = vinylStream.path;

        if (!fs.existsSync(vinylStream.path)) error('entry point does not exist', vinylStream.path);

        rollup.rollup(opts.rollup).then(bundle => {

            bundle = bundle.generate(opts.generate);
            
            // const dir = path.dirname(vinylStream.path);
            const fileExt = path.extname(vinylStream.relative);
            const fileName = path.basename(vinylStream.path, fileExt);

            theBundle = new Vinyl({
                path: fileName + fileExt,
                contents: new Buffer(bundle.code)
            });

            this.push(theBundle);

            if (opts.generate.sourceMap) {
                theBundle.sourceMap = bundle.map;
            }

            cb(null);

        }).catch(e => {
            console.log(e);
        });

    });

};
