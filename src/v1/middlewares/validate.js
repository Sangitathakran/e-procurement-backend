module.exports = (schemaFn) => {
  return (req, res, next) => {
    const schema = schemaFn();
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false, 
      allowUnknown: true   
    });

    if (error) {
      return res.status(400).json({
        status: 400,
        message: "Validation Error",
        errors: error.details.map((detail) => detail.message)
      });
    }

    req.body = value; 
    next();
  };
};
