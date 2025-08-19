const { sharesRouter } = require('./shares.routes');

const setupRoutes = (app) => {
    app.use('/shares', sharesRouter);
}

module.exports = {
    setupRoutes
};