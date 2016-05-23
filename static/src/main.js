var xhr = require('promise-xhr');
var assign = require('lodash.assign');

var _ = require('./helpers');
var template = require('./template');
var createApp = require('./app');


// helpers
/** Get `entries` and `categories` from the server. */
var updateModel = function() {
    return xhr.getJSON('api.php').then(function(entries) {
        var model = {
            entries: entries,
            categories: [],
        };

        entries.forEach(function(entry) {
            var category = _.findByKey(model.categories, entry.category);
            if (!category) {
                category = {
                    key: entry.category,
                    children: [],
                };
                model.categories.push(category);
            }

            if (!_.findByKey(category.children, entry.subcategory)) {
                category.children.push({
                    key: entry.subcategory,
                    active: true,
                });
            }
        });

        return model;
    });
};

/** Autoresize text areas. */
// https://stackoverflow.com/questions/454202
var resize = function(event) {
    /* 0-timeout to get the already changed text */
    setTimeout(function() {
        event.target.style.height = 'auto';
        event.target.style.height = event.target.scrollHeight + 5 + 'px';
    }, 0);
};

var getPath = function(state) {
    var path = location.hash.substr(2).split('/');
    return {
        view: path[0] || 'list',
        id: path[1],
    };
};


// events
var onFilter = function(event, state) {
    state.q = event.target.value;
    return state;
};

var onFilterAll = function(event, state) {
    event.preventDefault();
    var key = event.target.parentElement.dataset.name;
    var category = _.findByKey(state.categories, key);
    var cats = category ? [category] : state.categories;
    cats.forEach(function(category) {
        category.children.forEach(function(subcategory) {
            subcategory.active = event.target.className === 'all';
        });
    });
    return state;
};

var onFilterChange = function(event, state) {
    var subkey = event.target.name;
    var key = event.target.parentElement.parentElement.parentElement.parentElement.dataset.name;
    var subcategory = _.findByKey(_.findByKey(state.categories, key).children, subkey);
    subcategory.active = event.target.checked;
    return state;
};

var onSubmit = function(event, state, app) {
    event.preventDefault();

    // prevent double-submit
    var submit = event.target.querySelector('input[type=submit]');
    submit.disabled = true;

    var data = {};

    var keys = ['name', 'subcategory', 'address', 'openinghours', 'contact', 'lang', 'note', 'rev'];
    keys.forEach(function(key) {
        data[key] = app.getValue(key);
    });

    for (var i = 0; i < state.categories.length; i++) {
        var category = state.categories[i];
        if (_.findByKey(category.children, app.getValue('subcategory'))) {
            data.category = category.key;
            break;
        }
    }

    if (app.getValue('id')) {
        data.id = app.getValue('id');
    }

    return xhr.post('api.php', JSON.stringify(data)).then(function(result) {
        return updateModel().then(function(model) {
            var r = JSON.parse(result);
            history.pushState(null, null, '#!detail/' + r.id);
            return assign({}, state, model, getPath());
        });
    }).catch(function(err) {
        // FIXME handle error
    });
};

var onDelete = function(event, state) {
    event.preventDefault();
    if (confirm("Wirklich löschen?")) {
        return xhr.post('api.php', JSON.stringify({
            id: state.id,
        })).then(updateModel).then(function(model) {
            history.pushState(null, null, '#!list');
            return assign({}, state, model, getPath());
        }).catch(function(err) {
            // FIXME handle error
        });
    }
};

var onPopState = function(event, state) {
    return assign({}, state, getPath());
};


// main
var app = createApp(template);
var listScrollTop;

app.beforeUpdate = function(oldState, newState) {
    if (newState.view !== oldState.view && oldState.view === 'list') {
        listScrollTop = scrollY;
    }
};

app.afterUpdate = function(oldState, newState) {
    if (newState.view !== oldState.view) {
        scrollTo(0, newState.view === 'list' ? listScrollTop : 0);
    }
};

app.bindEvent('.filter', 'change', onFilter);
app.bindEvent('.filter', 'search', onFilter);
app.bindEvent('.filter', 'keyup', onFilter);
app.bindEvent('form', 'submit', onSubmit);
app.bindEvent('.delete', 'click', onDelete);
app.bindEvent('textarea', 'init', resize);
app.bindEvent('textarea', 'change', resize);
app.bindEvent('textarea', 'keydown', resize);
app.bindEvent('.category-filters .all', 'click', onFilterAll);
app.bindEvent('.category-filters .none', 'click', onFilterAll);
app.bindEvent('.category-filters input[type=checkbox]', 'change', onFilterChange);
app.bindEvent(window, 'popstate', onPopState);

updateModel().then(function(model) {
    app.init(assign({}, model, getPath()), document.body);
});
