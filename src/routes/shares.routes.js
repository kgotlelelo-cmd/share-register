const express = require('express');
const sharesRouter = express.Router();
const {
    addShareClassController,
    addShareholderController,
    addTransactionController,
    getShareClassesController,
    getShareholdersController,
    getCapTableController,
    getClassTotalsController,
    getTransactionsController
} = require('../controllers/index');

sharesRouter.post('/share-classes', addShareClassController);
sharesRouter.post('/shareholders', addShareholderController);
sharesRouter.post('/transactions', addTransactionController);
sharesRouter.get('/share-classes', getShareClassesController);
sharesRouter.get('/shareholders', getShareholdersController);
sharesRouter.get('/cap-table', getCapTableController);
sharesRouter.get('/class-totals', getClassTotalsController);
sharesRouter.get('/transactions', getTransactionsController);

module.exports = {
    sharesRouter
};