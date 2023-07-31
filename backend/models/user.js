'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsToMany(models.Tag, { through: 'user_tag', foreignKey: "UserId" });
    }
  }
  User.init({
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      validate: {
        isEmail: true,
      }
    },
    password: {
      type: DataTypes.STRING(50),
      allowNull: false,
        validate: {
          is: /(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.:;])[A-Za-z\d@$!%*?&]{8,}$/i, // Minimum 8 characters, at least 1 letter and 1 number and 1 special character in @$!%*?&.:;
        },
    },
    hasRestaurant: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: "user",
    underscored: true
  });
  return User;
};