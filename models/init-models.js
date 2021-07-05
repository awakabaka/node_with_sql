var DataTypes = require("sequelize").DataTypes;
var _product = require("./product");
var _users = require("./users");

function initModels(sequelize) {
  var product = _product(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  product.belongsTo(users, { foreignKey: "user_id"});
  users.hasMany(product, { foreignKey: "user_id"});

  return {
    product,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
