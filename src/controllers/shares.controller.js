const {
    addShareClassService,
    addShareholderService,
    addTransactionService,
    getShareClassesService,
    getShareholdersService,
    getCapTableService,
    getClassTotalsService,
    getTransactionsService
} = require('../services/index');


const addShareClassController = async (req, res) => {
    try {
        const { code, name, currency, nominalValue, authorizedShares } = req.body;

        const shareClass = await addShareClassService({
            code,
            name,
            currency,
            nominalValue,
            authorizedShares
        });
        res.status(201).json(shareClass);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const addShareholderController = async (req, res) => {
    try {
        const { type, name, email } = req.body;

        const shareholder = await addShareholderService({ type, name, email });
        res.status(201).json(shareholder);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const addTransactionController = async (req, res) => {
    try {
        const { ts, shareClassId, type, fromShareholderId, toShareholderId, quantity, note } = req.body;

        const transaction = await addTransactionService({
            ts,
            shareClassId,
            type,
            fromShareholderId,
            toShareholderId,
            quantity,
            note
        });
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getShareClassesController = async (req, res) => {
    try {
        const shareClasses = await getShareClassesService();
        res.status(200).json(shareClasses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getShareholdersController = async (req, res) => {
    try {
        const shareholders = await getShareholdersService();
        res.status(200).json(shareholders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getCapTableController = async (req, res) => {
    try {
        const capTable = await getCapTableService();
        res.status(200).json(capTable);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getClassTotalsController = async (req, res) => {
    try {
        const classTotals = await getClassTotalsService();
        res.status(200).json(classTotals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getTransactionsController = async (req, res) => {
    try {
        const transactions = await getTransactionsService();
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    addShareClassController,
    addShareholderController,
    addTransactionController,
    getShareClassesController,
    getShareholdersController,
    getCapTableController,
    getClassTotalsController,
    getTransactionsController
};