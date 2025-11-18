function errorHandler(err, req, res, next) {
  console.error(err && err.stack || err);
  if (res.headersSent) return next(err);
  res.status(500).send('Internal server error');
}
module.exports = { errorHandler };
