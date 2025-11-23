function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors,
      schema: err.schema
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
}

module.exports = errorHandler;
