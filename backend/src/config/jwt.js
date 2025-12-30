/**
 * JWT Configuration
 * Cấu hình JWT cho authentication
 */

module.exports = {
  secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this',
  expiresIn: process.env.JWT_EXPIRE || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
};



