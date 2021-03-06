const fancyLog = require('fancy-log');
const supportsColor = require( 'supports-color' );
const gulp = require( 'gulp' );
const gulpIf = require( 'gulp-if' );
const webpackStream = require( 'webpack-stream' );
const webpack = require( 'webpack' );
const webpackConfig = require( './webpack.config.js' );
const browserSync = require( 'browser-sync' );
const autoprefixer = require( 'gulp-autoprefixer' );
const plumber = require( 'gulp-plumber' );
const sass = require( 'gulp-sass' );
const cssmin = require( 'gulp-cssmin' );
const del = require( 'del' );
const eslint = require( 'gulp-eslint' );
const minimist = require( 'minimist' );

const options = minimist( process.argv.slice( 2 ), {

	default: {
		P: false,
	}
	
} );

function isFixed( file ) {

	return file.eslint != null && file.eslint.fixed;

}

function lint( cb ) {

	let paths = [ './src/' ];

	for ( let i = 0; i < paths.length; i ++ ) {

		gulp.src( paths[ i ] + '**/*.ts' )
			.pipe( eslint( { useEslintrc: true, fix: true } ) ) // .eslintrc を参照
			.pipe( eslint.format() )
			.pipe( gulpIf( isFixed, gulp.dest( paths[ i ] ) ) )
			.pipe( eslint.failAfterError() );

	}

	cb();

}

function buildWebpack( cb ){

	let conf = webpackConfig;
	conf.entry.main = './src/ts/main.ts';
	conf.output.filename = 'script.js';

	if( options.P ){

		conf.mode = 'production';

	}

	webpackStream( conf, webpack, function( err, stats ) {
		
		//https://github.com/shama/webpack-stream/blob/master/index.js
		
		if (err) {
			return;
		}

		stats = stats || {};

		var statusLog = stats.toString({
			colors: supportsColor.stdout.hasBasic,
			hash: false,
			timings: false,
			chunks: false,
			chunkModules: false,
			modules: false,
			children: true,
			version: true,
			cached: false,
			cachedAssets: false,
			reasons: false,
			source: false,
			errorDetails: false
		});
		
		if (statusLog) {
			fancyLog(statusLog);
		}

		reload();
		
	})
		.on( 'error', function() { this.emit( 'end' ) } )
		.pipe( gulp.dest( "./public/js/" ) )

	cb();

}

function buildSass( c ) {
	
	return gulp.src( "./src/scss/style.scss" )
		.pipe( plumber() )
		.pipe( sass() )
		.pipe( autoprefixer([ 'last 2 versions'] ) )
		.pipe( cssmin() )
		.pipe( gulp.dest( "./public/css/" ) )
		.pipe( browserSync.stream() );
		
}

function copy( c ){
	
	gulp.src( ['./src/html/**/*'] ).pipe( gulp.dest( './public/' ) );
	gulp.src( ['./src/assets/**/*'] ).pipe( gulp.dest( './public/assets/' ) );
	
	c();
	
}

function brSync() {

	browserSync.init( {
		server: {
			baseDir: "public",
			index: "index.html"
		},
		open: true
	} );

}

function clean( c ){

	del( 
		[ './public/' ],
		{
			force: true,
		} 
	).then( (paths) => {

		c();

	} );

}

function reload( cb ) {

	browserSync.reload();

	cb && cb();
	
}

function watch(){

	gulp.watch( './src/scss/*.scss', gulp.series( buildSass ) );
	gulp.watch( './src/html/**/*', gulp.series( copy, reload ) );
	gulp.watch( './src/assets/**/*', gulp.series( copy, reload ) );
	
}

exports.default = gulp.series( 
	clean,
	gulp.parallel( buildWebpack, buildSass ),
	copy,
	gulp.parallel( brSync, watch )
);

exports.lint = gulp.task( lint );