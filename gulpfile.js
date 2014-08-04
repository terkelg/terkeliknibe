// Load plugins
var gulp = require('gulp'),
    sass = require('gulp-ruby-sass'),
    minifycss = require('gulp-minify-css'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    rename = require('gulp-rename'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    livereload = require('gulp-livereload');

// Styles
gulp.task('styles', function() {
  return gulp.src('css/sass/main.scss')
    .pipe(sass({ style: 'expanded', }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(gulp.dest('css'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(minifycss())
    .pipe(gulp.dest('css'));
});


// Scripts
gulp.task('scripts', function() {
  return gulp.src('js/plugins.js')
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify())
    .pipe(gulp.dest('js'))});


// Default task
gulp.task('default', function() {
    gulp.start('styles');
});

// Watch
gulp.task('watch', function() {

  // Watch .scss files
  gulp.watch('css/**/*.scss', ['styles']);

  // Watch JS files
  gulp.watch('js/plugins.js', ['scripts']);


  // Create LiveReload server
  var server = livereload();

  // Watch any files in dist/, reload on change
  gulp.watch(['**/*.*']).on('change', function(file) {
    server.changed(file.path);
  });

});
