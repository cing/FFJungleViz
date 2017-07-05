const gulp = require('gulp');
const babel = require('babelify');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const browserSync = require('browser-sync');
const reload = browserSync.reload;
const autoprefixer = require('gulp-autoprefixer');
const notify = require('gulp-notify');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const concat = require('gulp-concat');
const historyApiFallback = require('connect-history-api-fallback');

gulp.task('styles', () => {
	return gulp.src('./dev/styles/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer())
		.pipe(concat('styles.css'))
		.pipe(gulp.dest('./public/styles/'))
});

gulp.task('scripts', () => {
	browserify('./dev/scripts/main.js', {debug: true})
		.transform('babelify', {
			sourceMaps: true,
			presets: ['es2015']
		})
		.bundle()
		.on('error',notify.onError({
			message: "Error: <%= error.message %>",
			title: 'Error in JS 💀'
		}))
		.pipe(source('main.js'))
		.pipe(buffer())
		.pipe(gulp.dest('public/scripts'))
		.pipe(reload({stream:true}));
});

gulp.task('browser-sync', () => {
	browserSync.init({
		server: {
			baseDir: './'
		},
		middleware: [historyApiFallback()]
	});
});

gulp.task('default', ['styles', 'scripts', 'browser-sync'], () => {
	gulp.watch('./dev/styles/**/*.scss', ['styles']);
	gulp.watch('./dev/scripts/**/*.js', ['scripts']);
	gulp.watch('*.html', reload);
});