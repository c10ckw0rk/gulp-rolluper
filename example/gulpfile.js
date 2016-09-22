const rolluper = require('../index');
const gulp = require('gulp');

gulp.task('default', () => {

    return gulp.src('fixtures/bundles/entry.js')
    .pipe(rolluper())
    .pipe(gulp.dest('./output'));

});

gulp.task('non-es6', () => {

    return gulp.src('fixtures/bundles/non-es6.js')
    .pipe(rolluper())
    .pipe(gulp.dest('./output'));

});



