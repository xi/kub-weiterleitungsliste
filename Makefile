all: static/main.js static/style.css

static/main.js: static_src/main.js static_src/*.js node_modules
	./node_modules/.bin/browserify $< > $@

static/style.css: static_src/style.scss static_src/scss/*.scss node_modules
	./node_modules/.bin/node-sass $< > $@

node_modules: package.json
	npm install
