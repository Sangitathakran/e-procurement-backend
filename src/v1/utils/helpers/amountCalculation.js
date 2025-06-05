const { StateTaxModel } = require('@src/v1/models/app/distiller/stateTax');
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { handleDecimal, _distillerMsp, _advancePayment } = require("@src/v1/utils/helpers");

const calculateAmount = async (poQuantity, branch_id) => {
    const branch = await Branches.findById(branch_id);

    const taxDoc = await StateTaxModel.findOne({
        state_name: { $regex: new RegExp(`^${branch.state}$`, 'i') },
    });

    let mandiTax = 0;
    let advancePayment = _advancePayment();

    if (taxDoc) {
        mandiTax = taxDoc.mandi_tax;
        advancePayment = taxDoc.token_percentage;
    }

    const msp = _distillerMsp();
    const totalAmount = handleDecimal(msp * poQuantity);
    const tokenAmount = handleDecimal((totalAmount * advancePayment) / 100);
    const mandiTaxAmount = handleDecimal((mandiTax * totalAmount) / 100);
    const advancenAmount = handleDecimal(tokenAmount + mandiTaxAmount);
    // const remainingAmount = handleDecimal(totalAmount - advancenAmount);
    const remainingAmount = handleDecimal(totalAmount - tokenAmount);

    return {
        msp,
        mandiTax,
        mandiTaxAmount,
        totalAmount,
        tokenAmount,
        advancenAmount,
        remainingAmount,
    };
};

module.exports = { calculateAmount };
