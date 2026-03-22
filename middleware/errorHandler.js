exports.errorHandler = (err, req, res, next) => {
  let status  = err.statusCode || 500;
  let message = err.message    || 'Internal server error';

  // Mongoose validation
  if (err.name === 'ValidationError') {
    status  = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }
  // Duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    status  = 409;
    message = `${Object.keys(err.keyValue)[0]} already exists`;
  }
  // Bad ObjectId
  if (err.name === 'CastError') {
    status  = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (process.env.NODE_ENV === 'development') console.error('❌ Error:', err.stack);

  res.status(status).json({ error: message });
};
