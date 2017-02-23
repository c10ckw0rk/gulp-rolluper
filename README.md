# gulp-rolluper

`npm install gulp-rolluper`

## Basic usage

```javascript

    const rolluper = require('gulp-rolluper');

    return gulp.src('bundles/entry.js')
    .pipe(rolluper({
        rollup: {
            plugins: [
                alias({
                    vue: 'node_modules/vue/dist/vue.js',
                    superagent: 'node_modules/superagent/superagent.js'
                }),
                vue(),
                nodeResolve({
                    browser: true
                }),
                commonjs(),
                babel({
                    presets: ['es2015-rollup']
                }),
                ruglify()
            ]
        },
        generate: {
            useStrict: false
        }
    }))
    .pipe(gulp.dest('./output'));

```

