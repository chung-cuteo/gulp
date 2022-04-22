const { src, dest, watch, series, parallel, lastRun } = require('gulp');
const loadPlugins = require('gulp-load-plugins');
const $ = loadPlugins();
const pkg = require('./package.json');
const del = require('del');
const conf = pkg["gulp-config"];
const sizes = conf.sizes;
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const browserSync = require('browser-sync');
const server = browserSync.create();
const isProd = process.env.NODE_ENV === "production";

function icon(done) {
    for (let size of sizes) {
        let width = size[0];
        let height = size[1];
        src('./favicon.png')
            .pipe($.imageResize({
                width,
                height,
                crop: true,
                upscale: false
            }))
            .pipe($.rename(`favicon-${width}x${height}.png`))
            .pipe(dest('./src/images/icon'));
    }
    done();
}

function styles() {
    return src('./src/sass/main.scss')
        .pipe($.if(!isProd, $.sourcemaps.init()))
        .pipe($.sass())
        .pipe($.postcss([
            autoprefixer()
        ]))
        .pipe($.if(!isProd, $.sourcemaps.write('.')))
        .pipe($.if(isProd, $.postcss([cssnano({ safe: true, autoprefixer: false })])))
        .pipe(dest('./dist/css'));
}

function scripts() {
    return src('./src/js/*.js')
        .pipe($.if(!isProd, $.sourcemaps.init()))
        .pipe($.babel())
        .pipe($.if(!isProd, $.sourcemaps.write('.')))
        .pipe($.if(isProd, $.uglify()))
        .pipe(dest('./dist/js'));
}

function lint() {
    return src('./src/js/*.js')
        .pipe($.eslint({ fix: true }))
        .pipe($.eslint.format())
        .pipe($.eslint.failAfterError())
        .pipe(dest('./src/js'))
}

function optimizeImages() {
    return src('./src/images/**', { since: lastRun(optimizeImages) })
        .pipe($.imagemin())
        .pipe(dest('./dist/images'));
}

function extras() {
    return src([
        './src/index.html'
    ]).pipe(dest('./dist'));
}

function clean() {
    return del(['./dist']);
}

function startAppServer() {
    server.init({
        server: {
            baseDir: './dist'
        }
    });

    watch('./src/sass/*.scss', styles);
    watch('./src/js/*.js', scripts);
    watch('./src/images/*.js', optimizeImages);
    watch('./src/index.html', extras);
    watch(['./src/**/*.scss',
        './src/js/*.js',
        './src/index.html',
        './src/images/*.js'
    ]).on('change', server.reload);
}

const build = series(clean, parallel(optimizeImages, extras, styles, series(lint, scripts)));
const serve = series(build, startAppServer);

exports.icon = icon;
exports.styles = styles;
exports.scripts = scripts;
exports.build = build;
exports.lint = lint;
exports.serve = serve;
exports.default = serve;
