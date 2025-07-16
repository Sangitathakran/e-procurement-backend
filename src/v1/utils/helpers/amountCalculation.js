const { StateTaxModel } = require('@src/v1/models/app/distiller/stateTax');
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { handleDecimal, _distillerMsp, _advancePayment } = require("@src/v1/utils/helpers");

const calculateAmount = async (token, poQuantity, branch_id) => {

  try {

    // Fetch branch and corresponding state tax document

    const branch = await Branches.findById(branch_id).lean();

    if (!branch) {

      throw new Error("Branch not found");

    }
 
    const taxDoc = await StateTaxModel.findOne({

      state_name: { $regex: `^${branch.state}$`, $options: 'i' },

    }).lean();
 
    // Initialize defaults

    const msp = _distillerMsp(); // Assuming this returns a number

    let mandiTax = 0;

    let advancePercent = 100;
 
    if (token === 10) {

      advancePercent = _advancePayment(); // e.g., returns 20

    } else if (token === 100) {

      mandiTax = taxDoc?.mandi_tax || 0; // Safely accessing mandi_tax

      advancePercent = 100;

    }
 
    // Calculations

    const totalAmount = handleDecimal(msp * poQuantity);

    const tokenAmount = handleDecimal((totalAmount * advancePercent) / 100);

    const mandiTaxAmount = handleDecimal((totalAmount * mandiTax) / 100);

    const advancenAmount = handleDecimal(tokenAmount + mandiTaxAmount);

    const remainingAmount = handleDecimal(totalAmount - tokenAmount);
 
    return {

      msp,

      stateWiseMandiTax: taxDoc?.mandi_tax || 0,

      mandiTax,

      mandiTaxAmount,

      totalAmount,

      tokenAmount,

      advancenAmount,

      remainingAmount,

    };

  } catch (err) {

    console.error("Amount calculation error:", err.message);

    throw new Error("Amount calculation error: " + err.message);

  }

};

 

module.exports = { calculateAmount };
