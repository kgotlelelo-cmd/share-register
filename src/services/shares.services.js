const {
    addShareClass,
    addShareholder,
    addTransaction,
    getShareClasses,
    getShareholders,
    getCapTable,
    getClassTotals,
    getTransactions
} = require('../database/index');

const addShareClassService = async ({ code, name, currency = 'ZAR', nominalValue = 0.01, authorizedShares = 0 }) => {
    const response = addShareClass({ code, name, currency, nominalValue, authorizedShares });
    return response;
};

const addShareholderService = async ({ type, name, email }) => {
    const response = addShareholder({ type, name, email });
    return response;
}

const addTransactionService = async ({ ts, shareClassId, type, fromShareholderId, toShareholderId, quantity, note }) => {
    const response = addTransaction({ ts, shareClassId, type, fromShareholderId, toShareholderId, quantity, note });
    return response;
}

const getShareClassesService = async () => {
    const response = getShareClasses();
    return response;
}

const getShareholdersService = async () => {
    const response = getShareholders();
    return response;
}

const getCapTableService = async () => {
    const response = getCapTable();
    return response;
}

const getClassTotalsService = async () => {
    const response = getClassTotals();
    return response;
}

const getTransactionsService = async () => {
    const response = getTransactions();
    return response;
}

module.exports = {
    addShareClassService,
    addShareholderService,
    addTransactionService,
    getShareClassesService,
    getShareholdersService,
    getCapTableService,
    getClassTotalsService,
    getTransactionsService
};