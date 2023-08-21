//Gulp
const gulp       = require('gulp');
const rename     = require('gulp-rename');
const source     = require('vinyl-source-stream');
const buffer     = require('vinyl-buffer');
const gulpif     = require('gulp-if');
const uglify     = require('gulp-uglify');
const gutil      = require("gulp-util");
const browserify = require('browserify');
const babelify   = require('babelify');
const watchify   = require('watchify');
const vueify     = require('vueify');
const stringify  = require('stringify');
const sourcemaps = require('gulp-sourcemaps');
const del        = require('del');

let production = false;
let sourcemap  = false;

gulp.task('browserify', [], function() {
  let bundler = browserify(
    './index.js',
    {
      basedir:      './',
      paths:        ['./', '../'],
      debug:        !production,
      cache:        {},
      packageCache: {},
      transform: [
        vueify,
        [ babelify, { babelrc: true } ],
        [ stringify, { appliesTo: { includeExtensions: ['.html'] } } ],
      ],
    }
  );

  del(['./plugin.js.map']);

  const rebundle = () => {
    return bundler
      .bundle()
      .on('error', (err) => { console.log(err); process.exit(); })
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(gulpif(sourcemap, sourcemaps.init()))
      .pipe(gulpif(production, uglify({ compress: { drop_console: true } }).on('error', gutil.log)))
      .pipe(rename('plugin.js'))
      .pipe(gulpif(sourcemap, sourcemaps.write('.')))
      .pipe(gulp.dest('.'));
  };

  if (!production) {
    bundler = watchify(bundler);
    bundler.on('update', rebundle);
  }

  return rebundle();
});


gulp.task('production', function() { production = true; });
gulp.task('sourcemap',  function() { sourcemap  = true; });

gulp.task('watch', ['browserify']);

gulp.task('default-sourcemap', ['production', 'sourcemap', 'browserify']);

gulp.task('default', ['production', 'browserify']);



