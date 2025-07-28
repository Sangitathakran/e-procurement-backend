const { StateTaxModel } = require('@src/v1/models/app/distiller/stateTax');
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { handleDecimal, _distillerMsp, _advancePayment } = require("@src/v1/utils/helpers");

/*
const calculateAmount = async (token, poQuantity, branch_id) => {

  // Fetch branch and corresponding state tax document
  const branch = await Branches.findById(branch_id).lean();
  if (!branch) {
    throw new Error("Branch not found");
  }

  const taxDoc = await StateTaxModel.findOne({
    state_name: { $regex: `^${branch.state}$`, $options: 'i' },
  }).lean();

  // Initialize defaults
  const msp = _distillerMsp(); // Assuming returns a number
  let mandiTax = 0;
  let advancePercent = 100;

  if (token === 10) {
    advancePercent = _advancePayment(); // e.g. 20
  } else if (token === 100 && taxDoc) {
    mandiTax = taxDoc.mandi_tax || 0;
    advancePercent = 100;
  }

  // Calculations
  const totalAmount = handleDecimal(msp * poQuantity);
  const tokenAmount = handleDecimal((totalAmount * advancePercent) / 100);
  const mandiTaxAmount = handleDecimal((totalAmount * mandiTax) / 100);
  const advancenAmount = handleDecimal(tokenAmount + mandiTaxAmount);
  const remainingAmount = handleDecimal(totalAmount - tokenAmount); // As per your comment
  console.log(mandiTax);
  return {
    msp,
    stateWiseMandiTax: taxDoc.mandi_tax || 0,
    mandiTax,
    mandiTaxAmount,
    totalAmount,
    tokenAmount,
    advancenAmount,
    remainingAmount,
  };
};
*/

/*
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

*/

const calculateAmount = async (token, poQuantity, branch_id, session = null) => {
  try {
    // Fetch branch and corresponding state tax document
    console.log("branch_id=====================================", branch_id);

    // Create the query
    const branchQuery = Branches.findById(branch_id).lean();

    // If session is provided, use it with the query
    if (session) {
      branchQuery.session(session);
    }

    const branch = await branchQuery;

    if (!branch) {
      throw new Error("Branch not found");
    }

    const taxDocQuery = StateTaxModel.findOne({
      state_name: { $regex: `^${branch.state}$`, $options: 'i' },
    }).lean();

    // If session is provided, use it for the tax document query too
    if (session) {
      taxDocQuery.session(session);
    }

    const taxDoc = await taxDocQuery;

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